export interface Settings {
  sound: boolean;
  motion: boolean;
}

export type SettingsStore = Pick<Storage, 'getItem' | 'setItem'>;

const STORAGE_KEY = 'flags-quiz:settings';

const DEFAULTS: Settings = { sound: true, motion: true };

export function loadSettings(store: SettingsStore): Settings {
  const stored = JSON.parse(store.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
  const flag = (key: keyof Settings) => (typeof stored[key] === 'boolean' ? stored[key] : DEFAULTS[key]);
  return { sound: flag('sound'), motion: flag('motion') };
}

export function saveSettings(store: SettingsStore, settings: Settings): void {
  store.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function applyMotion(page: HTMLElement, settings: Settings): void {
  page.dataset.motion = settings.motion ? 'on' : 'off';
}

export function motionAllowed(store: SettingsStore): boolean {
  return loadSettings(store).motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
