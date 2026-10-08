# Bandeiras

A study app for world flags.
The app opens on a hub with one tab per continent and Mundo, and remembers the last one chosen.
Fácil, Médio and Difícil split each continent into three tiers, Geral holds all of them, and Mundo joins each level across every continent.
The header counts the quizzes completed (every flag answered, errors allowed) out of the 24 levels, and each tab counts its own out of 4.
Each level card shows its flag count and first flags, a medal tag with the Aprender goal, a Quiz tag with the best time or score, and one button for each mode.

Aprender uses eleven question formats and 3 lives per round to earn a medal, with goals scaled to the size of each level.
Choice questions can be answered with the keys 1–6, and two-option questions with ← and →.

Quiz shows every flag of the level at once as a grid on the same levels: type the name of the highlighted flag, tap any other flag to switch to it or "Pular" to move to the next one, and race the timer. Answered flags show a check and their name, and a red mark flags one you got wrong. The best score and, for a quiz finished with no errors, the best time are kept per level.

Every game has a thin top bar: ✕ goes back to the hub (in Quiz it ends the quiz and shows its result), beside the level, its counters and a progress bar.
Results show the numbers as blocks, the new records, and the next level, another try or the way back to the hub, above the flags to review.

The link under the level cards lists every flag of the continent with its name and badge, in alphabetical order, for review; tap one to see it large.

The game holds 248 flags: the 193 UN members, 5 states outside the UN, the 4 nations of the United Kingdom and 46 territories. Once a name is revealed after an answer, a badge beside it says which of these it is.

## Run

    npm install
    npm run dev       # dev server on port 5173, reachable from the LAN
    npm run build     # static site in dist/, served under /flags-quiz/
    npm run preview   # serve dist/ at http://localhost:4173/flags-quiz/

## Install and deploy

The app is a PWA: it installs to a phone's home screen and works offline, with every flag cached by the service worker.
Every push to `main` runs the tests, builds and publishes to GitHub Pages at https://abacha.github.io/flags-quiz/ through `.github/workflows/deploy.yml`.

## Test

    npm run typecheck
    npm test

## Data

`src/data/countries.json` holds every flag with its Portuguese name, continent, status (`un`, `nonMember`, `ukNation` or `territory`), tier and accepted alternative spellings. `src/data/similar-groups.json` lists the groups of look-alike flags used by the sort-similar format. Flags are the SVGs in `public/flags/`, taken from flagcdn; the US states, the flags of the EU, the UN and Antarctica, and the flags identical to another one (um, bv, sj, mf, hm) are left out. Edit the JSON files directly to change names, statuses, tiers, aliases or groups.

Medals and Quiz records live in the browser's `localStorage`, so they belong to one browser on one device.
