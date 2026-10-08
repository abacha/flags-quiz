// @vitest-environment happy-dom
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

let rules: CSSStyleRule[];

const declared = (selector: string, property: string) =>
  rules
    .filter((rule) => rule.selectorText.split(',').map((s) => s.trim()).includes(selector))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter(Boolean);

beforeAll(() => {
  const style = document.createElement('style');
  style.textContent = readFileSync('src/style.css', 'utf8');
  document.head.append(style);
  rules = [...document.styleSheets[0]!.cssRules].filter((r): r is CSSStyleRule => 'selectorText' in r);
});

describe('style.css', () => {
  it.each(['.primary', '.outline', '.secondary', '.link', '.big', '.tab', '.tag', '.pill', '.badge'])(
    'keeps %s on one line, truncating with an ellipsis',
    (selector) => {
      expect(declared(selector, 'white-space')).toContain('nowrap');
      expect(declared(selector, 'overflow')).toContain('hidden');
      expect(declared(selector, 'text-overflow')).toContain('ellipsis');
    },
  );

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
});
