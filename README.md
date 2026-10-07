# Bandeiras

A study app for world flags. Learn mode drills one continent at a time in four levels — Fácil, Médio and Difícil with 18 flags each and Geral with all of them — using eleven question formats, 3 lives per round and a goal of 12, 18, 25 or 30 correct answers to earn a medal. Choice questions can be answered with the keys 1–6, and two-option questions with ← and →. Every continent is available: Africa, the Americas, Asia, Europe and Oceania, each split into the same four levels, with goals scaled to the size of each level.

Quiz mode shows one flag at a time on the same levels: type its name or skip it, come back to skipped flags whenever you like, and race the timer. The best score and, for a quiz finished with no errors, the best time are kept per level.

## Run

    npm install
    npm run dev       # dev server on port 5173, reachable from the LAN
    npm run build     # static site in dist/
    npm run preview   # serve dist/ on port 4173

## Test

    npm run typecheck
    npm test

## Data

`src/data/countries.json` holds every UN member state with its Portuguese name, continent, Learn tier (Africa only) and accepted alternative spellings. `src/data/similar-groups.json` lists the groups of look-alike flags used by the sort-similar format. Flags are the SVGs in `public/flags/`, taken from flagcdn. Edit the JSON files directly to change names, tiers, aliases or groups.

Medals live in the browser's `localStorage`, so they belong to one browser on one device.
