import { el } from './dom';

export function outOfLivesSheet(onContinue: () => void, onEnd: () => void): HTMLElement {
  return el('section', { className: 'feedback wrong out-of-lives', role: 'dialog' }, [
    el('p', { className: 'verdict' }, ['Suas vidas acabaram']),
    el('p', {}, ['Você pode continuar até a meta, mas sem medalha.']),
    el('button', { className: 'primary', type: 'button', onclick: onContinue }, ['Continuar sem medalha']),
    el('button', { className: 'link', type: 'button', onclick: onEnd }, ['Encerrar']),
  ]);
}
