import { geoBounds, geoCircle, geoPath, type GeoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import { feature, merge } from 'topojson-client';
import type { Country } from '../../data/countries';
import { MAP_OBJECT, centroidOf, mapPool, topology } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { el } from '../dom';
import { fittedFeatures, projectionFor } from './projection';
import { frame, keepInside, panBy, shapeTo, zoomAt, type ViewBox } from './viewBox';

export const MAX_ZOOM = 24;
export const MIN_HIT_PX = 22;
export const TAP_SLOP_PX = 8;
const RING_PX = 14;
const LABEL_PX = 13;
const WHEEL_STEP = 1.2;
const SVG_NS = 'http://www.w3.org/2000/svg';
const ANTARCTIC_CIRCLE_LATITUDE = -60;
const SURROUNDINGS_DEGREES = 6.74;
const SLIDE_MS = 300;

export type CountryPaint = 'idle' | 'highlight' | 'answered' | 'missed';

export interface MapView {
  element: HTMLElement;
  paint(iso2: string, state: CountryPaint, label?: string): void;
  clear(): void;
  focus(iso2s: readonly string[], options?: { animate: boolean }): void;
}

interface Hit {
  center: [number, number];
  size: number;
  cap: number;
  circle: SVGCircleElement;
}

interface Marks {
  ring?: SVGCircleElement;
  label?: SVGTextElement;
}

type Point = [number, number];

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

type UnitGeometry = (typeof topology.objects)[typeof MAP_OBJECT]['geometries'][number];

const isAntarctic = (geometry: UnitGeometry) => geoBounds(feature(topology, geometry))[1][1] < ANTARCTIC_CIRCLE_LATITUDE;

function unitsById(geometries: UnitGeometry[]): Map<string | null, MultiPolygon> {
  const groups = new Map<string | null, UnitGeometry[]>();
  for (const geometry of geometries) {
    const id = geometry.id === null || geometry.id === undefined ? null : String(geometry.id);
    groups.set(id, [...(groups.get(id) ?? []), geometry]);
  }
  return new Map([...groups].map(([id, geometries]) => [id, merge(topology, geometries)]));
}

function largestPolygon(path: GeoPath, geometry: MultiPolygon): Polygon {
  const polygons = geometry.coordinates.map((coordinates): Polygon => ({ type: 'Polygon', coordinates }));
  return polygons.reduce((a, b) => (path.area(b) > path.area(a) ? b : a));
}

const worldUnits = unitsById(topology.objects[MAP_OBJECT].geometries);
const continentUnits = unitsById(topology.objects[MAP_OBJECT].geometries.filter((geometry) => !isAntarctic(geometry)));

const viewBoxOf = ([[x0, y0], [x1, y1]]: [Point, Point]): ViewBox => ({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 });

const distance = ([ax, ay]: Point, [bx, by]: Point) => Math.hypot(ax - bx, ay - by);

const centre = (box: ViewBox): Point => [box.x + box.width / 2, box.y + box.height / 2];

const easeOut = (t: number) => 1 - (1 - t) ** 3;

const between = (from: ViewBox, to: ViewBox, k: number): ViewBox => ({
  x: from.x + (to.x - from.x) * k,
  y: from.y + (to.y - from.y) * k,
  width: from.width + (to.width - from.width) * k,
  height: from.height + (to.height - from.height) * k,
});

export function renderMap(continent: ContinentKey, onTap?: (country: Country) => void): MapView {
  const units = continent === 'world' ? worldUnits : continentUnits;
  const pool = new Map(mapPool(continent, 'general').map((c) => [c.iso2, c]));
  const poolFeatures: FeatureCollection = {
    type: 'FeatureCollection',
    features: [...pool.keys()].map((iso2): Feature => ({ type: 'Feature', id: iso2, properties: {}, geometry: units.get(iso2)! })),
  };
  const projection = projectionFor(continent, poolFeatures);
  const path = geoPath(projection);
  const [[worldWest], [worldEast]] = path.bounds({ type: 'Sphere' });
  const halfWorld = (worldEast - worldWest) / 2;
  const continentFit = viewBoxOf(path.bounds(fittedFeatures(continent, poolFeatures)));
  const bounds = viewBoxOf(path.bounds(poolFeatures));
  let fit = continentFit;
  let box = fit;
  let unitsPerPx = 0;
  let aspect = 0;
  let pending: readonly string[] | undefined;
  let slide = 0;
  let sliding: readonly string[] | undefined;

  const svg = svgEl('svg', { viewBox: `${fit.x} ${fit.y} ${fit.width} ${fit.height}` });
  const countryLayer = svgEl('g');
  const markLayer = svgEl('g');
  const hitLayer = svgEl('g');
  svg.append(hitLayer, countryLayer, markLayer);

  const shapes = new Map<string, SVGPathElement>();
  for (const [id, geometry] of units) {
    const shape = svgEl('path', { d: path(geometry)! });
    if (id !== null && pool.has(id)) {
      shape.classList.add('country');
      shape.dataset.iso2 = id;
      shapes.set(id, shape);
    } else {
      shape.classList.add('context');
    }
    countryLayer.append(shape);
  }

  function nearSideBounds(points: Position[], centreX: number): ViewBox {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const point of points) {
      const [x, y] = projection(point as [number, number])!;
      if (Math.abs(x - centreX) >= halfWorld) continue;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
    return viewBoxOf([[x0, y0], [x1, y1]]);
  }

  const hits = new Map<string, Hit>();
  const surroundings = new Map<string, ViewBox>();
  for (const iso2 of pool.keys()) {
    const largest = largestPolygon(path, units.get(iso2)!);
    const center = path.centroid(largest);
    const hitCircle = svgEl('circle', { class: 'hit', cx: center[0], cy: center[1] });
    hitCircle.dataset.iso2 = iso2;
    hits.set(iso2, { center, size: Math.sqrt(path.area(largest) / Math.PI), cap: Infinity, circle: hitCircle });
    const circle = geoCircle().center(centroidOf(iso2)).radius(SURROUNDINGS_DEGREES).precision(1)();
    surroundings.set(iso2, nearSideBounds([...units.get(iso2)!.coordinates.flat(2), ...circle.coordinates.flat()], center[0]));
    hitLayer.append(hitCircle);
  }
  for (const hit of hits.values()) {
    for (const other of hits.values()) if (other !== hit) hit.cap = Math.min(hit.cap, distance(hit.center, other.center) / 2);
  }

  const marks = new Map<string, Marks>();

  function sizeMarks() {
    for (const hit of hits.values()) hit.circle.setAttribute('r', String(Math.min(hit.cap, MIN_HIT_PX * unitsPerPx)));
    for (const [iso2, { ring, label }] of marks) {
      ring?.setAttribute('r', String(Math.max(RING_PX * unitsPerPx, hits.get(iso2)!.size)));
      label?.setAttribute('font-size', String(LABEL_PX * unitsPerPx));
    }
  }

  const screenUnitsPerPx = () => 1 / svg.getScreenCTM()!.a;

  function framing(iso2s: readonly string[]): ViewBox {
    const boxes = iso2s.map((iso2) => surroundings.get(iso2)!);
    const x0 = Math.min(...boxes.map((b) => b.x));
    const y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.width));
    const y1 = Math.max(...boxes.map((b) => b.y + b.height));
    return frame(viewBoxOf([[x0, y0], [x1, y1]]), aspect, fit, MAX_ZOOM, bounds);
  }

  function reshape(next: number) {
    const target = pending ?? sliding;
    cancelAnimationFrame(slide);
    sliding = undefined;
    pending = undefined;
    aspect = next;
    fit = keepInside(shapeTo(continentFit, aspect), bounds);
    show(target ? framing(target) : zoomAt(shapeTo(box, aspect), 1, centre(box), fit, MAX_ZOOM, bounds));
  }

  function rescale() {
    const { width, height } = svg.getBoundingClientRect();
    if (width === 0 || height === 0) return;
    if (width / height !== aspect) reshape(width / height);
    unitsPerPx = screenUnitsPerPx();
    sizeMarks();
  }

  function show(next: ViewBox) {
    box = next;
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  }

  function slideTo(iso2s: readonly string[]) {
    const from = box;
    const target = framing(iso2s);
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(Math.max((now - startedAt) / SLIDE_MS, 0), 1);
      show(between(from, target, easeOut(t)));
      if (t < 1) {
        slide = requestAnimationFrame(step);
        return;
      }
      sliding = undefined;
      rescale();
    };
    sliding = iso2s;
    slide = requestAnimationFrame(step);
  }

  function stopSlide() {
    if (!sliding) return;
    cancelAnimationFrame(slide);
    sliding = undefined;
    rescale();
  }

  function toViewBox([clientX, clientY]: Point): Point {
    const point = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse());
    return [point.x, point.y];
  }

  function unmark(iso2: string) {
    const current = marks.get(iso2);
    current?.ring?.remove();
    current?.label?.remove();
    marks.delete(iso2);
  }

  const pointers = new Map<number, Point>();
  let start: Point = [0, 0];
  let gesture = false;

  function beginGesture() {
    stopSlide();
    gesture = true;
    for (const id of pointers.keys()) svg.setPointerCapture(id);
  }

  svg.addEventListener('pointerdown', (event) => {
    const point: Point = [event.clientX, event.clientY];
    if (event.isPrimary) pointers.clear();
    pointers.set(event.pointerId, point);
    if (pointers.size === 1) {
      start = point;
      gesture = false;
    } else {
      beginGesture();
    }
  });

  svg.addEventListener('pointermove', (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) return;
    const point: Point = [event.clientX, event.clientY];
    pointers.set(event.pointerId, point);
    if (!gesture && distance(start, point) > TAP_SLOP_PX) beginGesture();
    const scale = screenUnitsPerPx();
    if (pointers.size === 1) {
      show(panBy(box, (previous[0] - point[0]) * scale, (previous[1] - point[1]) * scale, bounds));
      return;
    }
    const [other] = [...pointers].filter(([id]) => id !== event.pointerId).map(([, p]) => p);
    const before: Point = [(previous[0] + other![0]) / 2, (previous[1] + other![1]) / 2];
    const after: Point = [(point[0] + other![0]) / 2, (point[1] + other![1]) / 2];
    const zoomed = zoomAt(box, distance(point, other!) / distance(previous, other!), toViewBox(before), fit, MAX_ZOOM, bounds);
    const zoomedScale = (scale * zoomed.width) / box.width;
    show(panBy(zoomed, (before[0] - after[0]) * zoomedScale, (before[1] - after[1]) * zoomedScale, bounds));
  });

  const release = (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size === 0 && gesture) rescale();
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  svg.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      if (event.deltaY === 0) return;
      stopSlide();
      const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      show(zoomAt(box, factor, toViewBox([event.clientX, event.clientY]), fit, MAX_ZOOM, bounds));
      rescale();
    },
    { passive: false },
  );

  svg.addEventListener('click', (event) => {
    if (gesture) return;
    const iso2 = (event.target as Element).closest<SVGElement>('[data-iso2]')?.dataset.iso2;
    if (iso2) onTap?.(pool.get(iso2)!);
  });

  new ResizeObserver(rescale).observe(svg);
  sizeMarks();

  return {
    element: el('div', { className: 'map' }, [svg]),
    paint(iso2, state, label) {
      const shape = shapes.get(iso2)!;
      shape.classList.remove('highlight', 'answered', 'missed');
      if (state !== 'idle') shape.classList.add(state);
      unmark(iso2);
      const [cx, cy] = hits.get(iso2)!.center;
      const mark: Marks = {};
      if (state === 'highlight') {
        mark.ring = svgEl('circle', { class: 'map-ring', cx, cy, 'data-mark': iso2 });
        markLayer.append(mark.ring);
      }
      if (label !== undefined) {
        mark.label = svgEl('text', { class: 'map-label', x: cx, y: cy, 'data-mark': iso2 });
        mark.label.textContent = label;
        markLayer.append(mark.label);
      }
      marks.set(iso2, mark);
      sizeMarks();
    },
    clear() {
      for (const shape of shapes.values()) shape.classList.remove('highlight', 'answered', 'missed');
      for (const iso2 of [...marks.keys()]) unmark(iso2);
    },
    focus(iso2s, options) {
      cancelAnimationFrame(slide);
      sliding = undefined;
      pending = iso2s;
      rescale();
      if (!pending || aspect === 0) return;
      pending = undefined;
      if (options?.animate) return slideTo(iso2s);
      show(framing(iso2s));
      rescale();
    },
  };
}
