import { el } from '../dom';

// Chrome on Android ignores autocomplete="off" when a field looks like a personal-data field
// and hands it to the system autofill service, which offered a name or a password manager on
// the answer. The data attributes are the opt-outs 1Password, LastPass, Bitwarden and
// Dashlane honour; the placeholders avoid words autofill matches, such as "Nome".
const PASSWORD_MANAGER_OPT_OUTS: [string, string][] = [
  ['data-1p-ignore', ''],
  ['data-lpignore', 'true'],
  ['data-bwignore', ''],
  ['data-form-type', 'other'],
];

export function answerInput(placeholder: string): HTMLInputElement {
  const input = el('input', {
    type: 'text',
    required: true,
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: false,
    placeholder,
  });
  for (const [name, value] of PASSWORD_MANAGER_OPT_OUTS) input.setAttribute(name, value);
  return input;
}
