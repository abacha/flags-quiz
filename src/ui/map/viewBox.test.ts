import { describe, expect, it } from 'vitest';
import { panBy, zoomAt } from './viewBox';

const base = { x: 0, y: 0, width: 1000, height: 600 };
const wide = { x: 0, y: 0, width: 3000, height: 600 };

describe('zoomAt', () => {
  it('zooms around the anchor', () => {
    expect(zoomAt(base, 2, [500, 300], base, 24, base)).toEqual({ x: 250, y: 150, width: 500, height: 300 });
  });

  it('keeps an off-centre anchor under the same point', () => {
    expect(zoomAt(base, 2, [200, 100], base, 24, base)).toEqual({ x: 100, y: 50, width: 500, height: 300 });
  });

  it('stops at 24×', () => expect(zoomAt(base, 100, [500, 300], base, 24, base).width).toBeCloseTo(1000 / 24));

  it('never zooms out past the fitted view', () => expect(zoomAt(base, 0.5, [0, 0], base, 24, base)).toEqual(base));

  it('keeps a zoom-out near the edge inside the map', () => {
    const corner = { x: 500, y: 300, width: 500, height: 300 };
    expect(zoomAt(corner, 1 / 1.5, [1000, 600], base, 24, base)).toEqual({ x: 250, y: 150, width: 750, height: 450 });
  });

  it('lets a zoom stay over the part of the map beyond the fitted view', () => {
    const east = { x: 1500, y: 0, width: 1000, height: 600 };
    expect(zoomAt(east, 0.5, [2000, 300], base, 24, wide)).toEqual(east);
  });
});

describe('panBy', () => {
  it('pans beyond the fitted view up to the edge of every drawn country', () => {
    expect(panBy(base, 5000, 0, wide).x).toBe(2000);
  });

  it('keeps a pan inside the map', () => {
    const zoomed = { x: 250, y: 150, width: 500, height: 300 };
    expect(panBy(zoomed, -1000, 0, base).x).toBe(0);
    expect(panBy(zoomed, 1000, 0, base).x).toBe(500);
    expect(panBy(zoomed, 0, 1000, base).y).toBe(300);
  });

  it('moves freely inside the map', () => {
    expect(panBy({ x: 250, y: 150, width: 500, height: 300 }, 10, -20, base)).toEqual({ x: 260, y: 130, width: 500, height: 300 });
  });
});
