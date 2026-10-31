import './style.css';
import { loadContinent } from './continentChoice';
import { listenForBack, settleBack } from './ui/backButton';
import type { Screen } from './ui/navigation';
import { renderCapitalGame } from './ui/screens/capitalGame';
import { renderCapitalQuiz } from './ui/screens/capitalQuiz';
import { renderCapitalQuizResult } from './ui/screens/capitalQuizResult';
import { renderCapitalResult } from './ui/screens/capitalResult';
import { renderFlagTable } from './ui/screens/flagTable';
import { renderCapitalTable } from './ui/screens/capitalTable';
import { renderGame } from './ui/screens/game';
import { renderMapGame } from './ui/screens/mapGame';
import { renderMapResult } from './ui/screens/mapResult';
import { renderMapTable } from './ui/screens/mapTable';
import { renderHub } from './ui/screens/hub';
import { renderMapQuiz } from './ui/screens/mapQuiz';
import { renderMapQuizResult } from './ui/screens/mapQuizResult';
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
  render(screen);
  settleBack();
}

function render(screen: Screen): void {
  switch (screen.name) {
    case 'hub':
      return renderHub(app, navigate, screen.continent);
    case 'flagTable':
      return renderFlagTable(app, navigate, screen.continent);
    case 'capitalTable':
      return renderCapitalTable(app, navigate, screen.continent);
    case 'mapTable':
      return renderMapTable(app, navigate, screen.continent);
    case 'game':
      return renderGame(app, navigate, screen.continent, screen.difficulty);
    case 'result':
      return renderResult(app, navigate, screen);
    case 'mapGame':
      return renderMapGame(app, navigate, screen.continent, screen.level);
    case 'mapResult':
      return renderMapResult(app, navigate, screen);
    case 'mapQuiz':
      return renderMapQuiz(app, navigate, screen.continent, screen.level);
    case 'mapQuizResult':
      return renderMapQuizResult(app, navigate, screen);
    case 'quiz':
      return renderQuiz(app, navigate, screen.continent, screen.difficulty);
    case 'quizResult':
      return renderQuizResult(app, navigate, screen);
    case 'capitalGame':
      return renderCapitalGame(app, navigate, screen.continent, screen.difficulty);
    case 'capitalResult':
      return renderCapitalResult(app, navigate, screen);
    case 'capitalQuiz':
      return renderCapitalQuiz(app, navigate, screen.continent, screen.difficulty);
    case 'capitalQuizResult':
      return renderCapitalQuizResult(app, navigate, screen);
  }
}

listenForBack();
navigate({ name: 'hub', continent: loadContinent(localStorage) });
