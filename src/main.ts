import './style.css';
import type { Screen } from './ui/navigation';
import { renderContinent } from './ui/screens/continent';
import { renderDifficulty } from './ui/screens/difficulty';
import { renderGame } from './ui/screens/game';
import { renderHome } from './ui/screens/home';
import { renderQuiz } from './ui/screens/quiz';
import { renderQuizResult } from './ui/screens/quizResult';
import { renderResult } from './ui/screens/result';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
const app = root;

// A fast double-tap on a button (e.g. "Continuar") would otherwise land its second click
// on whatever element the first click's DOM swap put under the pointer. `detail` counts
// clicks in the same spot within the OS double-click interval; the app has no legitimate
// double-click interaction, and keyboard-triggered clicks have `detail` 0.
document.addEventListener(
  'click',
  (event) => {
    if (event.detail > 1) {
      event.stopPropagation();
      event.preventDefault();
    }
  },
  { capture: true },
);

function navigate(screen: Screen): void {
  app.replaceChildren();
  switch (screen.name) {
    case 'home':
      return renderHome(app, navigate);
    case 'continent':
      return renderContinent(app, navigate, screen.mode);
    case 'difficulty':
      return renderDifficulty(app, navigate, screen.mode, screen.continent);
    case 'game':
      return renderGame(app, navigate, screen.continent, screen.difficulty);
    case 'result':
      return renderResult(app, navigate, screen);
    case 'quiz':
      return renderQuiz(app, navigate, screen.continent, screen.difficulty);
    case 'quizResult':
      return renderQuizResult(app, navigate, screen);
  }
}

navigate({ name: 'home' });
