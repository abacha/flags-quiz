export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const FRAME_PADDING = 0.1;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const placeWithin = (start: number, size: number, min: number, span: number) =>
  size > span ? min + (span - size) / 2 : clamp(start, min, min + span - size);

export function keepInside(box: ViewBox, bounds: ViewBox): ViewBox {
  return {
    ...box,
    x: placeWithin(box.x, box.width, bounds.x, bounds.width),
    y: placeWithin(box.y, box.height, bounds.y, bounds.height),
  };
}

function around(box: ViewBox, width: number, height: number): ViewBox {
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
}

export function shapeTo(box: ViewBox, aspect: number): ViewBox {
  const width = Math.max(box.width, box.height * aspect);
  return around(box, width, width / aspect);
}

export function frame(target: ViewBox, aspect: number, fit: ViewBox, maxZoom: number, bounds: ViewBox): ViewBox {
  const padding = 1 + 2 * FRAME_PADDING;
  const width = clamp(shapeTo(around(target, target.width * padding, target.height * padding), aspect).width, fit.width / maxZoom, fit.width);
  return keepInside(around(target, width, width / aspect), bounds);
}

export function zoomAt(box: ViewBox, factor: number, anchor: [number, number], fit: ViewBox, maxZoom: number, bounds: ViewBox): ViewBox {
  const width = clamp(box.width / factor, fit.width / maxZoom, fit.width);
  const scale = width / box.width;
  const [ax, ay] = anchor;
  return keepInside({ x: ax - (ax - box.x) * scale, y: ay - (ay - box.y) * scale, width, height: box.height * scale }, bounds);
}

export function panBy(box: ViewBox, dx: number, dy: number, bounds: ViewBox): ViewBox {
  return keepInside({ ...box, x: box.x + dx, y: box.y + dy }, bounds);
}
