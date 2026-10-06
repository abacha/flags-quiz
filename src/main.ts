import './style.css';
import type { Screen } from './ui/navigation';
import { renderContinent } from './ui/screens/continent';
import { renderDifficulty } from './ui/screens/difficulty';
import { renderGame } from './ui/screens/game';
import { renderHome } from './ui/screens/home';
import { renderResult } from './ui/screens/result';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
const app = root;

function navigate(screen: Screen): void {
  app.replaceChildren();
  switch (screen.name) {
    case 'home':
      return renderHome(app, navigate);
    case 'continent':
      return renderContinent(app, navigate);
    case 'difficulty':
      return renderDifficulty(app, navigate, screen.continent);
    case 'game':
      return renderGame(app, navigate, screen.continent, screen.difficulty);
    case 'result':
      return renderResult(app, navigate, screen);
  }
}

navigate({ name: 'home' });
