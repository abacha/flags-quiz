export interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function keepInside(box: ViewBox, base: ViewBox): ViewBox {
  return {
    ...box,
    x: clamp(box.x, base.x, base.x + base.width - box.width),
    y: clamp(box.y, base.y, base.y + base.height - box.height),
  };
}

export function zoomAt(box: ViewBox, factor: number, anchor: [number, number], base: ViewBox, maxZoom: number): ViewBox {
  const width = clamp(box.width / factor, base.width / maxZoom, base.width);
  const scale = width / box.width;
  const [ax, ay] = anchor;
  return keepInside({ x: ax - (ax - box.x) * scale, y: ay - (ay - box.y) * scale, width, height: box.height * scale }, base);
}

export function panBy(box: ViewBox, dx: number, dy: number, base: ViewBox): ViewBox {
  return keepInside({ ...box, x: box.x + dx, y: box.y + dy }, base);
}
