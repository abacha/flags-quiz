import type { Grade } from '../engine/answer';
import type { Medal } from '../engine/round';
import type { NewRecords } from '../quizRecords';
import { motionAllowed } from '../settings';
import { playCue } from './cue';
import { el } from './dom';

export const STREAK_MILESTONE = 5;
const PRAISE = ['Certo!', 'Isso aí!', 'Mandou bem!', 'Craque!'];
const CONFETTI_COLORS = ['#2f6fde', '#1f7a48', '#f2b705', '#e5533d', '#9b5de5'];
const BURST = 16;
const MILESTONE_BURST = 40;
const RAIN = 80;
const COUNT_MS = 600;

export type Cheer = 'win' | 'big' | null;

export function praise(streak: number): string {
  return streak % STREAK_MILESTONE === 0 ? `🔥 ${streak} seguidas!` : PRAISE[(streak - 1) % STREAK_MILESTONE];
}

const between = (low: number, high: number) => low + Math.random() * (high - low);

function confetti(className: string, x: number, y: number, vars: Record<string, string>): void {
  const piece = el('span', { className });
  piece.style.left = `${x}px`;
  piece.style.top = `${y}px`;
  piece.style.background = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  for (const [name, value] of Object.entries(vars)) piece.style.setProperty(name, value);
  piece.addEventListener('animationend', () => piece.remove());
  document.body.append(piece);
}

function confettiBurst(origin: Element, count: number): void {
  const { left, top, width, height } = origin.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const angle = between(0, 2 * Math.PI);
    const distance = between(60, 160);
    confetti('confetti', left + width / 2, top + height / 2, {
      '--dx': `${Math.cos(angle) * distance}px`,
      '--dy': `${Math.sin(angle) * distance - 40}px`,
      '--spin': `${between(-540, 540)}deg`,
    });
  }
}

function confettiRain(): void {
  for (let i = 0; i < RAIN; i++) {
    confetti('confetti rain', between(0, window.innerWidth), -16, {
      '--fall': `${between(1.4, 2.6)}s`,
      '--delay': `${between(0, 0.8)}s`,
      '--spin': `${between(-720, 720)}deg`,
    });
  }
}

export function celebrateAnswer(question: HTMLElement, feedback: HTMLElement, result: Grade, streak: number): void {
  question.classList.add(result.correct ? 'answered-right' : 'answered-wrong');
  if (!result.correct) {
    for (const country of result.missed) question.querySelector(`[data-iso2="${country.iso2}"]`)?.classList.add('revealed');
    playCue('wrong');
    return;
  }
  const milestone = streak % STREAK_MILESTONE === 0;
  const verdict = feedback.querySelector('.verdict')!;
  verdict.textContent = praise(streak);
  playCue(milestone ? 'streak' : 'right');
  if (motionAllowed(localStorage)) confettiBurst(verdict, milestone ? MILESTONE_BURST : BURST);
}

export function learnCheer(won: boolean, medal: Medal | null): Cheer {
  if (!won) return null;
  return medal === 'gold' ? 'big' : 'win';
}

export function quizCheer(finished: boolean, newRecords: NewRecords): Cheer {
  if (newRecords.score || newRecords.time) return 'big';
  return finished ? 'win' : null;
}

export function celebrateResult(title: HTMLElement, cheer: Cheer): void {
  if (!cheer) return;
  title.classList.add('cheer');
  playCue('win');
  if (cheer === 'big' && motionAllowed(localStorage)) confettiRain();
}

// The final value is written at once and the first frame resets it to zero before the browser paints, so the count is all the player sees.
export function countUp(node: HTMLElement, value: string): void {
  node.textContent = value;
  const count = value.match(/^(\d+)(\/\d+)?$/);
  if (!count || !motionAllowed(localStorage)) return;
  const target = Number(count[1]);
  const rest = count[2] ?? '';
  let start: number | undefined;
  const frame = (now: number) => {
    start ??= now;
    const progress = Math.min(1, (now - start) / COUNT_MS);
    node.textContent = `${Math.round(target * progress)}${rest}`;
    if (progress < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
