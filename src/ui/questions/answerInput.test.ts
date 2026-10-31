// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { answerInput } from './answerInput';

describe('answerInput', () => {
  it('turns off browser autofill and tells password managers to skip the field', () => {
    const input = answerInput('Resposta');
    expect(input.placeholder).toBe('Resposta');
    expect(input.getAttribute('autocomplete')).toBe('off');
    expect(input.dataset['1pIgnore']).toBe('');
    expect(input.dataset.lpignore).toBe('true');
    expect(input.dataset.bwignore).toBe('');
    expect(input.dataset.formType).toBe('other');
  });
});
