export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function keepInside(box: ViewBox, bounds: ViewBox): ViewBox {
  return {
    ...box,
    x: clamp(box.x, bounds.x, bounds.x + bounds.width - box.width),
    y: clamp(box.y, bounds.y, bounds.y + bounds.height - box.height),
  };
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
