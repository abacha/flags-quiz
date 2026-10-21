import { describe, expect, it } from 'vitest';
import { frame, panBy, shapeTo, zoomAt } from './viewBox';

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

describe('shapeTo', () => {
  it('widens a tall box around its centre to the aspect', () => {
    expect(shapeTo({ x: 100, y: 0, width: 200, height: 600 }, 2)).toEqual({ x: -400, y: 0, width: 1200, height: 600 });
  });

  it('heightens a wide box around its centre to the aspect', () => {
    expect(shapeTo({ x: 0, y: 100, width: 1200, height: 200 }, 2)).toEqual({ x: 0, y: -100, width: 1200, height: 600 });
  });
});

describe('frame', () => {
  const fit = { x: 0, y: 0, width: 1200, height: 600 };

  it('pads the target by 10% on each side and shapes it to the aspect around its centre', () => {
    expect(frame({ x: 400, y: 250, width: 100, height: 100 }, 2, fit, 24, fit)).toEqual({ x: 330, y: 240, width: 240, height: 120 });
  });

  it('never frames wider than the fitted view', () => {
    expect(frame({ x: -500, y: -500, width: 3000, height: 1000 }, 2, fit, 24, fit)).toEqual(fit);
  });

  it('never frames closer than the maximum zoom', () => {
    expect(frame({ x: 600, y: 300, width: 1, height: 1 }, 2, fit, 24, fit)).toEqual({ x: 575.5, y: 288, width: 50, height: 25 });
  });

  it('keeps the frame inside the map', () => {
    expect(frame({ x: 0, y: 0, width: 100, height: 100 }, 2, fit, 24, fit)).toEqual({ x: 0, y: 0, width: 240, height: 120 });
  });
});

describe('a view larger than the map', () => {
  it('stays centred on the map', () => {
    expect(panBy({ x: 0, y: 0, width: 2000, height: 600 }, 100, 0, base)).toEqual({ x: -500, y: 0, width: 2000, height: 600 });
  });
});
