import { geoPath, type GeoPath } from 'd3-geo';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import { merge } from 'topojson-client';
import type { Country } from '../../data/countries';
import { MAP_OBJECT, mapPool, topology } from '../../data/maps';
import type { ContinentKey } from '../../engine/pool';
import { el } from '../dom';
import { MAP_WIDTH, projectionFor } from './projection';
import { panBy, zoomAt, type ViewBox } from './viewBox';

export const MAX_ZOOM = 24;
export const MIN_HIT_PX = 22;
export const TAP_SLOP_PX = 8;
const RING_PX = 14;
const LABEL_PX = 13;
const WHEEL_STEP = 1.2;
const SVG_NS = 'http://www.w3.org/2000/svg';

export type CountryPaint = 'idle' | 'highlight' | 'answered' | 'missed';

export interface MapView {
  element: HTMLElement;
  paint(iso2: string, state: CountryPaint, label?: string): void;
  clear(): void;
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

function unitsById(): Map<string | null, MultiPolygon> {
  const groups = new Map<string | null, typeof topology.objects[typeof MAP_OBJECT]['geometries']>();
  for (const geometry of topology.objects[MAP_OBJECT].geometries) {
    const id = geometry.id === null || geometry.id === undefined ? null : String(geometry.id);
    groups.set(id, [...(groups.get(id) ?? []), geometry]);
  }
  return new Map([...groups].map(([id, geometries]) => [id, merge(topology, geometries)]));
}

function largestPolygon(path: GeoPath, geometry: MultiPolygon): Polygon {
  const polygons = geometry.coordinates.map((coordinates): Polygon => ({ type: 'Polygon', coordinates }));
  return polygons.reduce((a, b) => (path.area(b) > path.area(a) ? b : a));
}

const units = unitsById();

const distance = ([ax, ay]: Point, [bx, by]: Point) => Math.hypot(ax - bx, ay - by);

export function renderMap(continent: ContinentKey, onTap?: (country: Country) => void): MapView {
  const pool = new Map(mapPool(continent).map((c) => [c.iso2, c]));
  const poolFeatures: FeatureCollection = {
    type: 'FeatureCollection',
    features: [...pool.keys()].map((iso2): Feature => ({ type: 'Feature', id: iso2, properties: {}, geometry: units.get(iso2)! })),
  };
  const path = geoPath(projectionFor(continent, poolFeatures));
  const [, [, bottom]] = path.bounds(poolFeatures);
  const base: ViewBox = { x: 0, y: 0, width: MAP_WIDTH, height: Math.ceil(bottom) };
  let box = base;
  let unitsPerPx = 0;

  const svg = svgEl('svg', { viewBox: `${base.x} ${base.y} ${base.width} ${base.height}` });
  const countryLayer = svgEl('g');
  const markLayer = svgEl('g');
  const hitLayer = svgEl('g');
  svg.append(countryLayer, markLayer, hitLayer);

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

  const hits = new Map<string, Hit>();
  for (const iso2 of pool.keys()) {
    const largest = largestPolygon(path, units.get(iso2)!);
    const center = path.centroid(largest);
    const circle = svgEl('circle', { class: 'hit', cx: center[0], cy: center[1] });
    circle.dataset.iso2 = iso2;
    hits.set(iso2, { center, size: Math.sqrt(path.area(largest) / Math.PI), cap: Infinity, circle });
    hitLayer.append(circle);
  }
  for (const hit of hits.values()) {
    for (const other of hits.values()) if (other !== hit) hit.cap = Math.min(hit.cap, distance(hit.center, other.center) / 2);
  }

  const marks = new Map<string, Marks>();

  function sizeMarks() {
    for (const hit of hits.values()) hit.circle.setAttribute('r', String(Math.min(hit.cap, Math.max(MIN_HIT_PX * unitsPerPx, hit.size))));
    for (const [iso2, { ring, label }] of marks) {
      ring?.setAttribute('r', String(Math.max(RING_PX * unitsPerPx, hits.get(iso2)!.size)));
      label?.setAttribute('font-size', String(LABEL_PX * unitsPerPx));
    }
  }

  function rescale() {
    unitsPerPx = box.width / svg.getBoundingClientRect().width;
    sizeMarks();
  }

  function show(next: ViewBox) {
    box = next;
    svg.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`);
  }

  function toViewBox([clientX, clientY]: Point): Point {
    const rect = svg.getBoundingClientRect();
    const scale = box.width / rect.width;
    return [box.x + (clientX - rect.left) * scale, box.y + (clientY - rect.top) * scale];
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
    gesture = true;
    for (const id of pointers.keys()) svg.setPointerCapture(id);
  }

  svg.addEventListener('pointerdown', (event) => {
    const point: Point = [event.clientX, event.clientY];
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
    const scale = box.width / svg.getBoundingClientRect().width;
    if (pointers.size === 1) {
      show(panBy(box, (previous[0] - point[0]) * scale, (previous[1] - point[1]) * scale, base));
      return;
    }
    const [other] = [...pointers].filter(([id]) => id !== event.pointerId).map(([, p]) => p);
    const before: Point = [(previous[0] + other![0]) / 2, (previous[1] + other![1]) / 2];
    const after: Point = [(point[0] + other![0]) / 2, (point[1] + other![1]) / 2];
    const zoomed = zoomAt(box, distance(point, other!) / distance(previous, other!), toViewBox(before), base, MAX_ZOOM);
    const zoomedScale = zoomed.width / svg.getBoundingClientRect().width;
    show(panBy(zoomed, (before[0] - after[0]) * zoomedScale, (before[1] - after[1]) * zoomedScale, base));
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
      const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      show(zoomAt(box, factor, toViewBox([event.clientX, event.clientY]), base, MAX_ZOOM));
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
  };
}
