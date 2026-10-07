# Bandeiras

A study app for world flags.
Pick Mundo or a continent, then one of four levels: Fácil, Médio and Difícil split each continent into three tiers, Geral holds all of them, and Mundo joins each level across every continent.
Each level shows its flag count, the Aprender medal and goal, and the Quiz best score and time, with one button for each mode.

Aprender uses eleven question formats and 3 lives per round to earn a medal, with goals scaled to the size of each level.
Choice questions can be answered with the keys 1–6, and two-option questions with ← and →.

Quiz shows every flag of the level at once as a grid on the same levels: type the name of the highlighted flag, tap any other flag to switch to it or "Pular" to move to the next one, and race the timer. Answered flags show a check and their name, and a red mark flags one you got wrong. The best score and, for a quiz finished with no errors, the best time are kept per level.

The game holds 248 flags: the 193 UN members, 5 states outside the UN, the 4 nations of the United Kingdom and 46 territories. Once a name is revealed after an answer, a badge beside it says which of these it is.

## Run

    npm install
    npm run dev       # dev server on port 5173, reachable from the LAN
    npm run build     # static site in dist/
    npm run preview   # serve dist/ on port 4173

## Test

    npm run typecheck
    npm test

## Data

`src/data/countries.json` holds every flag with its Portuguese name, continent, status (`un`, `nonMember`, `ukNation` or `territory`), tier and accepted alternative spellings. `src/data/similar-groups.json` lists the groups of look-alike flags used by the sort-similar format. Flags are the SVGs in `public/flags/`, taken from flagcdn; the US states, the flags of the EU, the UN and Antarctica, and the flags identical to another one (um, bv, sj, mf, hm) are left out. Edit the JSON files directly to change names, statuses, tiers, aliases or groups.

Medals and Quiz records live in the browser's `localStorage`, so they belong to one browser on one device.
