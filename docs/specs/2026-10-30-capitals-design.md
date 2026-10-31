# Flags Quiz — Capitals area

Date: 2026-10-30
Status: approved

## Reasoning

The app teaches flags and where each country lies.
Adriano wants the same study loop for capitals: see a country and know its capital, and see a capital and know its country.
Capitais is a third area of the app, beside Bandeiras and Mapas, with the same two modes: Aprender teaches through choice questions first, and Quiz asks the player to fill in the capital of every country of a level.

A capitals question is only worth asking when the wrong options are tempting.
Four capitals from four corners of the world teach nothing; Teerã beside Bagdá, or Kingston beside Kingstown, does.

## Goals

- A player picks a continent or Mundo and a level, learns the capitals in both directions, then proves it by typing every capital of the level.
- The modes feel like their flag counterparts: same top bar, lives, medal, timer, records, typo forgiveness and result screen shapes.
- Wrong options are tricky: countries near the target, countries with look-alike names, capitals with look-alike names.
- Works offline like the rest of the PWA.

## Non-goals

- No map in this area. Proximity drives the distractors only.
- No change to Bandeiras or Mapas.
- No non-capital cities as options (Sydney for Austrália, Istambul for Turquia). Every option is the capital of a country in the level.

## Anti-goals

- A question with two right answers on screen, such as two entries sharing a capital.
- A capital the player cannot type on a phone keyboard: every capital accepts a spelling without diacritics, as names do today through `normalizeName`.

## Decided (Adriano, 2026-10-30)

**Hub.** The area selector becomes "Bandeiras | Mapas | Capitais". Capitais shows the same continent tabs and, under each tab, the same four level cards as Bandeiras (Fácil, Médio, Difícil, Geral, by the tiers of `countries.json`), plus Mundo. Each card has the country count, the medal tag, the Quiz tag and the buttons Aprender and Quiz.

**How a country is shown.** Always with its flag and its name.

**Several capitals.** When a country has more than one capital, any of them is a right answer, and the revelation after the answer shows all of them (Bolívia: "Sucre / La Paz").

**Both directions in Aprender.** Same rules as the flag Learn mode (`2026-10-10-learn-choice-first-design.md`): each country is introduced through a choice question before any other format, 3 lives, a medal goal per level, the review gap and passes. Formats:

- Choice:
  - Country → capital: country shown, pick its capital among 4 (`countryToCapitals`).
  - Capital → country: capital shown, pick its country among 4, each option with flag and name (`capitalToCountries`).
  - Link 4 countries to their 4 capitals (`capitalPairs`).
- Other:
  - True or false, "A capital do Irã é Bagdá?" (`capitalTrueFalse`).
  - Type the capital of the country shown (`typeCapital`).
  - Type the country of the capital shown (`typeCapitalCountry`).

**Quiz.** The flag Quiz grid, with each flag's name visible: one flag is highlighted, the player types its capital, a correct answer shows the capital under the flag. Tapping another flag moves the highlight, "Pular" moves to the next one, the timer runs, and best score, best time and completion are kept per continent and level.

**Tricky options.** The wrong options of the choice questions, the wrong pairing of `capitalTrueFalse` and the three other countries of `capitalPairs` are drawn from three sources, in this order of preference:

1. Countries whose name looks like the target's (`similar-names.json`: Irã/Iraque, Níger/Nigéria).
2. Countries whose capital looks like the target's (a new `similar-capitals.json`: Kingston/Kingstown, Viena/Vientiane, Georgetown/George Town).
3. The countries nearest to the target.

Only countries of the level's pool are used, as in Bandeiras.

**Typos.** Typed capitals follow `2026-10-30-typo-forgiveness-design.md`: a typo for the right capital is refused with "Confira a grafia" and costs nothing; typing another country's capital is a wrong answer. `typeCapitalCountry` types a country name and is judged exactly as `typeName`.

## Calls made without Adriano (check while reading)

- **Which capital.** The capital is the official capital; where the seat of government sits in another city, that city counts as a second capital. This gives Bolívia (Sucre, La Paz), África do Sul (Pretória, Cidade do Cabo, Bloemfontein), Países Baixos (Amsterdã, Haia), Benin (Porto Novo, Cotonou), Costa do Marfim (Yamoussoukro, Abidjã), Malásia (Kuala Lumpur, Putrajaya), Sri Lanka (Sri Jayawardenepura Kotte, Colombo), Essuatíni (Mbabane, Lobamba) and Tanzânia (Dodoma, Dar es Salaam). Where there is no official capital, the de facto seat counts: Nauru (Yaren), Suíça (Berna). Territories use their administrative seat (Groenlândia: Nuuk; Porto Rico: San Juan).
- **Disputed capitals.** Israel: Jerusalém. Palestina: Ramallah, its seat of government, only; so Jerusalém is a wrong answer for Palestina and the same city is never the capital of two entries. Saara Ocidental: El Aaiún. Taiwan: Taipé. Kosovo: Pristina.
- **Typo against another capital.** The typo rule of the typo forgiveness design applies with capitals in place of country names: a typed capital is a typo only when it is not the normalized name or alias of any capital in the data, and it is strictly closer to the target's capitals than to every other entry's. "Kingston" typed for São Vicente e Granadinas (Kingstown) is Jamaica's capital, so it is wrong. Distances run against every capital in `countries.json`, excluded entries included, so the verdict does not change between levels.
- **Small pools.** A pool follows Bandeiras' rules: choice questions show 4 options, `capitalPairs` needs 4 countries, and "the 8 nearest" uses all the others when the pool has fewer than 9. The smallest Capitais pool is an Oceania tier of 8 after exclusions, so every format fits; `MIN_GOAL` keeps the medal goal at 15 there, as it does in Bandeiras.
- **Entries left out of Capitais**, listed by hand in `src/data/capitals-excluded.json` like `map-excluded.json`:
  - Reino Unido (`gb`): Adriano keeps the four nations, each with its capital (Inglaterra: Londres; Escócia: Edimburgo; País de Gales: Cardiff; Irlanda do Norte: Belfast). Londres would then belong to two entries, so `gb` leaves Capitais, as it leaves Maps.
  - Entries with no capital or seat on their own territory: Tokelau (the seat rotates), Território Britânico do Oceano Índico, Ilhas Geórgia do Sul e Sandwich do Sul.
- **Names in Portuguese.** Each capital is stored by its Brazilian Portuguese name (Pequim, Viena, Cidade do México), with aliases for the local and English spellings, as country names are.
- **Data shape.** Each `countries.json` entry outside the excluded list gains `capitals: [{ "name": "...", "aliases": [...] }]`, the first one being the main capital, and `capitalCoords: [longitude, latitude]` of the main capital. The map centroids cannot serve proximity because some 20 entries have no map geometry.
- **Nearest.** "Nearest" is the great-circle distance between `capitalCoords`. A choice question draws its fill-up options at random among the 8 countries of the pool nearest the target, as Maps does.
- **Look-alike sources mixed.** Look-alikes from sources 1 and 2 are used on every level, Fácil and Médio included, since tricky options are the point of this area. When they run short, nearest countries fill the remaining options.
- **Revealing a capital.** After any answer the revelation shows the country's flag, name, badge and all its capitals.
- **Medal goal and Learn rules per level:** `goalFor(difficulty, pool.length)` and the level's `recallWeight` from `LEVEL_RULES`, as in Bandeiras.
- **Storage:** separate keys for Capitais medals and quiz records, keyed by continent and level like the flag keys. The hub header counter shows the Capitais counter, out of 24, while Capitais is selected; each tab counts its own out of 4.
- **Selector memory:** the hub remembers Capitais as the last area the same way it remembers the other two.
- **Review list.** The link under the level cards lists every country of the continent with flag, name and capitals, in alphabetical order.

## Left to the builder

- Filling `capitals` and `capitalCoords` for every entry, from a cited source, committed with the data.
- The content of `similar-capitals.json`, built by the same judgement as `similar-names.json`; the examples above are a start.
- How `capitalPairs` lays out four flags against four capitals.
- Visual style, within the app's existing tokens.

## Testing

- Data: every entry outside `capitals-excluded.json` has at least one capital and `capitalCoords`; no two entries in Capitais share a normalized capital name or alias; every code in `similar-capitals.json` exists and is not excluded.
- Engine: the six formats follow the choice-first rules, with the same tests as the flag Learn engine; distractors prefer look-alike names, then look-alike capitals, then nearest countries, and stay inside the pool.
- Answers: any of a country's capitals is right; a typo of a capital is refused; another country's capital is wrong.
- Records and medals: Capitais keys are written and read separately from Bandeiras and Mapas.
- Screens: hub selector with three areas, the Quiz and each format in DOM tests; layout checked at 390px in the browser.
