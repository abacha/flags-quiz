# Bandeiras

A study app for world flags.
The app opens on a hub with one tab per continent and Mundo, and remembers the last one chosen.
Fácil, Médio and Difícil split each continent into three tiers, Geral holds all of them, and Mundo joins each level across every continent.
The header counts the quizzes completed (every flag answered, errors allowed) out of the 24 levels, and each tab counts its own out of 4.
Each level card shows its flag count and first flags, a medal tag with the Aprender goal, a Quiz tag with the best time or score, and one button for each mode.

Aprender uses eleven question formats and 3 lives per round to earn a medal, with goals scaled to the size of each level.
Each flag first appears in a choice question, with its name on screen, and only after that in the other formats.
Choice questions can be answered with the keys 1–6, and two-option questions with ← and →.

Quiz shows every flag of the level at once as a grid on the same levels: type the name of the highlighted flag, tap any other flag to switch to it or "Pular" to move to the next one, and race the timer. Answered flags show a check and their name, and a red mark flags one you got wrong. The best score and, for a quiz finished with no errors, the best time are kept per level.

Every game has a thin top bar: ✕ goes back to the hub (in Quiz it ends the quiz and shows its result), beside the level, its counters and a progress bar.
Results show the numbers as blocks, the new records, and the next level, another try or the way back to the hub, above the flags to review.

The link under the level cards lists every flag of the continent with its name and badge, in alphabetical order, for review; tap one to see it large.

A "Bandeiras | Mapas | Capitais" selector at the top of the hub switches between the flag levels, the Maps area and the Capitals area, and the hub remembers the last area chosen.
Mapas asks where each country lies on a map of its continent (Mundo uses the whole world), with one level per continent and no tiers.
The header counts the map quizzes completed out of 6, a tab shows ✓ once its map quiz is completed, and the single card shows the country count, the medal tag, the Quiz tag and the Aprender and Quiz buttons.
Aprender uses five map formats (pick the name of the highlighted country, tap the named country, link four lettered countries to their names, confirm a name, type the name) with the same lives, goals and medals as the flag levels.
Quiz highlights one country at a time on the map: type its name, tap another country to switch to it or "Pular" to move on; answered countries turn green with their name.
The map zooms with pinch, drag and the mouse wheel, so the smallest countries can be reached on a phone.

Capitais asks for the capital of each country, with the same four difficulty levels, goals, lives and medals as the flag levels, and its own records.
Aprender asks six question formats, from the capital of a country to the country of a capital, with wrong options picked among look-alike capitals of the same pool.
Quiz shows one country at a time and asks for its capital, accepting the accepted spellings and telling a typo from a wrong capital.
The link under the level cards lists every country of the continent with its capital, in alphabetical order.

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

`src/data/countries.json` holds every flag with its Portuguese name, continent, status (`un`, `nonMember`, `ukNation` or `territory`), tier and accepted alternative spellings. `src/data/similar-groups.json` lists the groups of look-alike flags used by the sort-similar and type-similar formats, and `src/data/similar-names.json` the groups of look-alike names used by the sort-similar-names format; on Difícil and Geral both also feed the wrong options of the choice questions. A group may cross continents: a level uses only the members inside its pool, so the whole group appears in Mundo. Flags are the SVGs in `public/flags/`, taken from flagcdn; the US states, the flags of the EU, the UN and Antarctica, and the flags identical to another one (um, bv, sj, mf, hm) are left out. Edit the JSON files directly to change names, statuses, tiers, aliases or groups.

`src/data/map.topo.json` is the simplified world map (Natural Earth 1:50m map units, public domain) drawn by the Maps area; each shape carries the `iso2` of the `countries.json` entry it depicts, with the four UK nations drawn separately and context-only shapes (Antarctica, Svalbard and others) left without one. `src/data/map-excluded.json` lists the entries Maps never asks: those with no shape of their own (`gb`, `gi`) and those under 100 km² on the map. Run `npm run build:map` to download the source again and rebuild the topology; the script prints the excluded list with each area and writes `map-excluded.json` only when it does not exist, so edit that file by hand to adjust it.

`src/data/capitals.json` holds the capital or capitals of each country by `iso2`, with accepted alternative spellings and the coordinates that rank the nearest countries. `src/data/capitals-excluded.json` lists the entries Capitais never asks, and `src/data/similar-capitals.json` the groups of look-alike capitals that feed the wrong options of the choice questions.

Medals and Quiz records live in the browser's `localStorage`, so they belong to one browser on one device.
