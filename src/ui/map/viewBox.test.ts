import { describe, expect, it } from 'vitest';
import { panBy, zoomAt } from './viewBox';

const base = { x: 0, y: 0, width: 1000, height: 600 };

describe('zoomAt', () => {
  it('zooms around the anchor', () => {
    expect(zoomAt(base, 2, [500, 300], base, 24)).toEqual({ x: 250, y: 150, width: 500, height: 300 });
  });

  it('keeps an off-centre anchor under the same point', () => {
    expect(zoomAt(base, 2, [200, 100], base, 24)).toEqual({ x: 100, y: 50, width: 500, height: 300 });
  });

  it('stops at 24×', () => expect(zoomAt(base, 100, [500, 300], base, 24).width).toBeCloseTo(1000 / 24));

  it('never zooms out past the fitted view', () => expect(zoomAt(base, 0.5, [0, 0], base, 24)).toEqual(base));

  it('keeps a zoom-out near the edge inside the map', () => {
    const corner = { x: 500, y: 300, width: 500, height: 300 };
    expect(zoomAt(corner, 1 / 1.5, [1000, 600], base, 24)).toEqual({ x: 250, y: 150, width: 750, height: 450 });
  });
});

describe('panBy', () => {
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
