// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { countries, type Country } from '../../data/countries';
import { mapPool } from '../../data/maps';
import { renderMap } from './map';

const country = (iso2: string): Country => countries.find((c) => c.iso2 === iso2)!;

const layOut = (element: HTMLElement) => {
  const svg = element.querySelector('svg')!;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 300, right: 500, bottom: 300, x: 0, y: 0, toJSON: () => ({}) });
  return svg;
};

const pointer = (target: Element, type: string, pointerId: number, clientX: number, clientY: number) =>
  target.dispatchEvent(new PointerEvent(type, { pointerId, clientX, clientY, bubbles: true }));

const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true }));

describe('renderMap', () => {
  it('draws every pool country as tappable and calls onTap', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).toHaveBeenCalledWith(country('br'));
    expect(view.element.querySelectorAll('path[data-iso2]')).toHaveLength(mapPool('americas').length);
  });

  it('accepts a tap that moved less than the slop', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointermove', 1, 104, 100);
    pointer(svg, 'pointerup', 1, 104, 100);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).toHaveBeenCalledWith(country('br'));
  });

  it('ignores a drag that ends over a country', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 100, 100);
    pointer(svg, 'pointermove', 1, 130, 100);
    pointer(svg, 'pointerup', 1, 130, 100);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('ignores a pinch that ends over a country', () => {
    const onTap = vi.fn();
    const view = renderMap('americas', onTap);
    const svg = layOut(view.element);
    pointer(svg, 'pointerdown', 1, 200, 150);
    pointer(svg, 'pointerdown', 2, 300, 150);
    pointer(svg, 'pointermove', 2, 302, 150);
    pointer(svg, 'pointerup', 2, 302, 150);
    pointer(svg, 'pointerup', 1, 200, 150);
    click(view.element.querySelector('path[data-iso2="br"]')!);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('pans on drag and zooms on pinch and wheel, never past 24×', () => {
    const view = renderMap('americas');
    const svg = layOut(view.element);
    const viewBox = () => svg.getAttribute('viewBox')!.split(' ').map(Number);
    const [, , baseWidth] = viewBox();
    pointer(svg, 'pointerdown', 1, 200, 150);
    pointer(svg, 'pointerdown', 2, 300, 150);
    pointer(svg, 'pointermove', 2, 400, 150);
    expect(viewBox()[2]).toBeCloseTo(baseWidth! / 2);
    pointer(svg, 'pointerup', 2, 400, 150);
    const [x] = viewBox();
    pointer(svg, 'pointermove', 1, 150, 150);
    expect(viewBox()[0]).toBeCloseTo(x! + baseWidth! / 20);
    pointer(svg, 'pointerup', 1, 150, 150);
    for (let i = 0; i < 40; i++) svg.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 250, clientY: 150, cancelable: true }));
    expect(viewBox()[2]).toBeCloseTo(baseWidth! / 24);
  });

  it('does nothing when the ocean or a grey neighbour is tapped', () => {
    const onTap = vi.fn();
    const view = renderMap('asia', onTap);
    click(view.element.querySelector('svg')!);
    click(view.element.querySelector('path.context')!);
    expect(onTap).not.toHaveBeenCalled();
  });

  it('does not tap grey neighbours or excluded entries', () => {
    const view = renderMap('asia');
    expect(view.element.querySelector('[data-iso2="ru"]')).toBeNull();
    expect(view.element.querySelector('[data-iso2="mv"]')).toBeNull();
    const greys = view.element.querySelectorAll('path.context');
    expect(greys.length).toBeGreaterThan(0);
    for (const grey of greys) expect(grey.hasAttribute('data-iso2')).toBe(false);
  });

  it('reaches a small country through its hit circle', () => {
    const onTap = vi.fn();
    const view = renderMap('europe', onTap);
    expect(view.element.querySelectorAll('circle.hit')).toHaveLength(mapPool('europe').length);
    click(view.element.querySelector('circle[data-iso2="mt"]')!);
    expect(onTap).toHaveBeenCalledWith(country('mt'));
  });

  it('keeps hit circles at 22 px on screen, capped by the nearest neighbour', () => {
    const view = renderMap('europe');
    const svg = layOut(view.element);
    svg.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, clientX: 250, clientY: 150, cancelable: true }));
    const unitsPerPx = Number(svg.getAttribute('viewBox')!.split(' ')[2]) / 500;
    const radius = (iso2: string) => Number(view.element.querySelector(`circle[data-iso2="${iso2}"]`)!.getAttribute('r'));
    expect(radius('mt')).toBeCloseTo(22 * unitsPerPx);
    expect(radius('ad')).toBeLessThan(22 * unitsPerPx);
  });

  it('paints and labels a country', () => {
    const view = renderMap('americas');
    view.paint('cl', 'answered', 'Chile');
    expect(view.element.querySelector('path[data-iso2="cl"]')!.classList.contains('answered')).toBe(true);
    expect(view.element.querySelector('text.map-label')!.textContent).toBe('Chile');
    view.paint('pe', 'highlight');
    expect(view.element.querySelector('path[data-iso2="pe"]')!.classList.contains('highlight')).toBe(true);
    expect(view.element.querySelector('circle.map-ring[data-mark="pe"]')).not.toBeNull();
    view.paint('pe', 'missed');
    expect(view.element.querySelector('circle.map-ring')).toBeNull();
    view.clear();
    expect(view.element.querySelector('path.answered, path.highlight, path.missed')).toBeNull();
    expect(view.element.querySelector('.map-label, .map-ring')).toBeNull();
  });
});
