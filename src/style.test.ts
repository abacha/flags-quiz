// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

let rules: CSSStyleRule[];
const source = readFileSync('src/style.css', 'utf8');

const declared = (selector: string, property: string) =>
  rules
    .filter((rule) => rule.selectorText.split(',').map((s) => s.trim()).includes(selector))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean);

const declaredInSource = (selector: string, property: string) =>
  [...source.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, selectors]) => selectors!.split(',').map((s) => s.trim()).includes(selector))
    .map(([, , body]) => body!.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`))?.[1]?.trim())
    .filter(Boolean);

const declaredInMedia = (media: string, selector: string, property: string) =>
  [...document.styleSheets[0]!.cssRules]
    .filter((r): r is CSSMediaRule => 'media' in r && (r as CSSMediaRule).media.mediaText === media)
    .flatMap((r) => [...r.cssRules] as CSSStyleRule[])
    .filter((rule) => rule.selectorText.split(',').map((s) => s.trim()).includes(selector))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean);

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = source;
  document.head.append(style);
  rules = [...document.styleSheets[0]!.cssRules].filter((r): r is CSSStyleRule => 'selectorText' in r);
});

describe('style.css', () => {
  it.each(['.primary', '.outline', '.secondary', '.link', '.big', '.tab', '.tag', '.pill', '.badge', '.see-all', '.topbar-label', '.topbar-counters'])(
    'keeps %s on one line, truncating with an ellipsis',
    (selector) => {
      expect(declared(selector, 'white-space')).toContain('nowrap');
      expect(declared(selector, 'overflow')).toContain('hidden');
      expect(declared(selector, 'text-overflow')).toContain('ellipsis');
    },
  );

  it('replaces the browser tap highlight with a press of the button itself', () => {
    expect(declaredInSource('html', '-webkit-tap-highlight-color')).toContain('transparent');
    expect(declaredInSource('button:active:not(:disabled)', 'transform')).toContain('scale(0.96)');
  });

  it('keeps a long press on a button from selecting its text', () => {
    expect(declaredInSource('button', 'user-select')).toContain('none');
    expect(declaredInSource('button', '-webkit-user-select')).toContain('none');
    expect(declaredInSource('button', '-webkit-touch-callout')).toContain('none');
  });

  it('truncates the answer field placeholder instead of wrapping it', () => {
    expect(declared('input::placeholder', 'text-overflow')).toContain('ellipsis');
  });

  it('gives every flag card a fixed 4:3 flag box, a two-line name and the badge on its own line', () => {
    expect(declared('.flag-box', 'aspect-ratio')).toContain('4 / 3');
    expect(declared('.quiz-thumb', 'aspect-ratio')).toContain('4 / 3');
    expect(declared('.solution-name', 'line-clamp')).toContain('2');
    expect(declared('.solution-name', 'min-height')).toContain('2.5em');
    expect(declared('.quiz-name', 'line-clamp')).toContain('2');
    expect(declared('.solution-card .badge', 'display')).toContain('block');
  });

  it('contains the flag image inside the fixed 4:3 box regardless of its own aspect ratio', () => {
    expect(declared('.flag-box', 'overflow')).toContain('hidden');
    expect(declared('.flag-box .flag', 'object-fit')).toContain('contain');
    expect(declared('.flag-box .flag', 'width')).toContain('100%');
    expect(declared('.flag-box .flag', 'height')).toContain('100%');
  });

  it('keeps the browser from scrolling the page while the map is pinched or dragged', () => {
    expect(declared('.map', 'touch-action')).toContain('none');
  });

  it('never outlines the tapped map shape', () => {
    expect(declared('.map svg:focus', 'outline-style')).toContain('none');
    expect(declared('.map path:focus', 'outline-style')).toContain('none');
  });

  it('lets grey neighbours catch taps so they never reach a hit circle beneath them', () => {
    expect(declared('.map .context', 'pointer-events')).not.toContain('none');
  });

  it('shows the answer feedback as a sheet over the question so the screen never grows', () => {
    expect(declared('.feedback', 'position')).toContain('fixed');
    expect(declared('.feedback', 'bottom')).toContain('0px');
    expect(declared('.feedback', 'overflow-y')).toContain('auto');
  });

  it('hides the flag captions under a grid with the names toggled off', () => {
    expect(declared('.hide-names figcaption', 'display')).toContain('none');
  });

  it('marks a misspelled field and its message in the wrong-answer colour', () => {
    expect(declared('.type-form input.typo', 'border-color')).toContain('var(--wrong)');
    expect(declared('.type-message', 'color')).toContain('var(--wrong)');
  });

  it('stops every animation and transition with the animations turned off or when the device asks for reduced motion', () => {
    expect(declaredInSource(":root[data-motion='off'] *", 'animation')).toContain('none !important');
    expect(declaredInSource(":root[data-motion='off'] *", 'transition')).toContain('none !important');
    expect(source).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ animation: none !important; transition: none !important; \}/);
  });

  it('widens every screen to 1200px on a desktop but keeps the hub and the result screens at 720px', () => {
    expect(declared('.screen.hub', 'max-width')).toContain('720px');
    expect(declared('.screen', 'max-width')).toContain('1200px');
    expect(declared('.screen.result', 'max-width')).toContain('720px');
    expect(declared('.feedback', 'max-width')).toContain('1200px');
  });

  it('lays the answer options out in columns on a desktop', () => {
    expect(declaredInMedia('(min-width: 900px)', '.name-list', 'grid-template-columns')).toContain('repeat(2, minmax(0, 1fr))');
    expect(declaredInMedia('(min-width: 900px)', '.flag-grid.count-6', 'grid-auto-flow')).toContain('column');
  });

  it('lets the Learn and Quiz maps fill the height on a desktop, with the four names in one row', () => {
    const desktop = '(min-width: 900px) and (min-height: 600px)';
    for (const map of ['.map-game .question > .map', '.map-game .map-flag > .map', '.quiz-screen > .map']) {
      expect(declaredInMedia(desktop, map, 'max-height')).toContain('none');
      expect(declaredInMedia(desktop, map, 'flex-grow')).toContain('1');
    }
    expect(declaredInMedia(desktop, '.map-game .name-list', 'grid-template-columns')).toContain('repeat(4, minmax(0, 1fr))');
  });

  it('keeps confetti out of the way of every tap', () => {
    expect(declared('.confetti', 'position')).toContain('fixed');
    expect(declared('.confetti', 'pointer-events')).toContain('none');
  });

  it('marks the chosen option green on a right answer and red on a wrong one, lighting the right option', () => {
    expect(declared('.answered-right .chosen', 'border-color')).toContain('var(--success)');
    expect(declared('.answered-wrong .chosen', 'border-color')).toContain('var(--wrong)');
    expect(declared('.revealed', 'border-color')).toContain('var(--success)');
  });

  it('highlights the player in the ranking and marks a refused nickname in the wrong-answer colour', () => {
    expect(declared('.ranking li.me', 'font-weight')).toContain('700');
    expect(declared('.ranking-error', 'color')).toContain('var(--wrong)');
  });
});
