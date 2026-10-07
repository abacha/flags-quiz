# Flags Quiz — World, territories and continent-first navigation design

Date: 2026-10-07
Status: approved

## Goal

Three changes requested together:

1. Navigation starts from the continent; Learn and Quiz become two buttons on each level.
2. Every flag flagcdn offers outside the UN joins the game, mixed into the continents' levels, with a badge that says what it is.
3. A sixth choice, "Mundo", plays every continent at once.

Success means the player opens the app, taps a continent or Mundo, sees the four levels each with "Aprender" and "Quiz", and meets territories in every continent's levels with their badge shown.

## Navigation

- Início lists Mundo, África, Américas, Ásia, Europa and Oceania.
- The continent screen lists Fácil, Médio, Difícil and Geral.
  Each level shows its flag count, the Learn medal and goal, and the Quiz best score and best time, with two buttons: "Aprender" and "Quiz".
- The mode screen is removed. "Voltar" from a game or a result returns to the continent screen.
- The Learn keyboard shortcuts and the multi-click guard stay as they are.

## Flags outside the UN

### Who joins

Every flagcdn code that is not a UN member joins, except:

- the 50 US states;
- União Europeia, Organização das Nações Unidas and Antártida (no continent);
- flags that render identical to another flag in the game: Ilhas Menores Distantes dos Estados Unidos (= Estados Unidos), Ilha Bouvet and Svalbard e Jan Mayen (= Noruega), São Martinho (França) (= França). Any further flag found identical when rendered side by side is excluded the same way.

That leaves 56 new flags (including the Vatican back), for 249 in total.

### Badge

Each flag carries a status, shown as a small badge next to its name wherever the game reveals a name after the answer (Learn feedback, Learn result, Quiz result) and in the Quiz "wrong flags" list. The badge never appears on answer options, where it would give the answer away.

| Status | Badge | Members |
|---|---|---|
| UN member | ONU | the 193 |
| State outside the UN | Não-membro | Vaticano, Palestina, Taiwan, Kosovo, Saara Ocidental |
| UK constituent nation | Nação do Reino Unido | Inglaterra, Escócia, País de Gales, Irlanda do Norte |
| Territory | Território | every other new flag |

### Names and continents

- Names come from flagcdn's Portuguese list, corrected to pt-BR: Groenlândia, Nova Caledônia, Ilhas Faroé, Curaçao, Tokelau, Montserrat, São Pedro e Miquelon, Palestina, Ilhas Cocos. "Malvinas" and "Falklands" are aliases of Ilhas Malvinas; "Faroé"/"Feroe" are aliases of Ilhas Faroé.
- The continent comes from the same mledoze dataset as before. Antarctic-region territories go to the nearest continent: Ilhas Geórgia do Sul e Sandwich do Sul → Américas, Terras Austrais e Antárticas Francesas → África, Ilha Heard e Ilhas McDonald → Oceania (unless excluded as identical to Austrália).

### Levels redistributed

Every continent is re-split into three tiers of near-equal size over its UN and non-UN flags together, ordered by how recognizable the flag and the place are.
Well-known places can rise above Difícil (for example Porto Rico, Groenlândia, Hong Kong, Taiwan, Inglaterra, Escócia), and most small territories land in Difícil.
Goals keep the per-level factors (Fácil 2/3, Médio 1, Difícil 25/18, Geral 30/54 of the pool, rounded up), so every goal moves with the new sizes, Africa's included.
Medals already earned stay on their levels.

### Look-alike groups

New groups follow the existing rules (one continent, 2 to 4 flags) and must keep the test "every level of every continent holds a look-alike group".
Required: Porto Rico with Cuba; Palestina joins Jordânia, Emirados Árabes Unidos and Kuwait; the British blue ensigns of the Caribbean (Ilhas Cayman, Ilhas Virgens Britânicas, Montserrat, Ilhas Turcas e Caicos); Inglaterra with Guernsey and Jersey. Further groups are the implementer's call, listed for review.

## Mundo

- Mundo has the same four levels: each level is the union of that level across the five continents; Geral is all 249 flags.
- Goals use the same factors over the union's size.
- Learn and Quiz both work; records and medals are kept under the continent key `world`.
- The odd-one-out format in Mundo picks three flags from one continent and an intruder from another, and names the three's continent in the prompt.

## Testing

- Data: 249 flags, every one with a status, continent and tier; the excluded codes are absent; tiers partition each continent with sizes differing by at most one; every look-alike group stays in one continent; every level of every continent and of Mundo holds a look-alike group.
- Pools: Mundo's pool per level is the union of the continents' pools.
- Badge: the badge text per status; the badge is absent from options.
- Navigation and every continent plus Mundo are checked in the browser.
