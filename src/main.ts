import './style.css';
import type { Screen } from './ui/navigation';
import { renderContinent } from './ui/screens/continent';
import { renderDifficulty } from './ui/screens/difficulty';
import { renderHome } from './ui/screens/home';

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
    case 'result':
      throw new Error(`Screen ${screen.name} not built yet`);
  }
}

navigate({ name: 'home' });
