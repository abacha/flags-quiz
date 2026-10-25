# Flags Quiz — Name toggle and map table design

Date: 2026-10-25
Status: implemented

## Goal

The flag table lets the player study a continent's flags, but the names always show, so it cannot be used to self-test.
A "Nomes" toggle hides them.
The Mapas area has no study screen at all, so it gets the same thing as a map: the continent with every country named on it, with the same toggle.

## Flag table

- A "Nomes" checkbox sits in the header, before "Voltar", checked when the screen opens.
- Unchecked, the cards show only the flags; the name and the status badge are hidden.
- Tapping a flag still opens it large with its name, so the player can check an answer.
- The choice is not remembered: every visit opens with the names on.

## Map table

- In the Mapas area, Início shows a link under the levels: "Ver o mapa dos N países da Europa →" ("do Mundo" for Mundo), where N is the size of the continent's map pool.
- The screen header has the continent name, "N países", the "Nomes" checkbox and "Voltar".
- Below it, the continent map fills the rest of the screen, with the usual zoom and pan.
- Names checked: every country of the continent carries its name on the map. Neighbouring countries from other continents stay unnamed.
- Names unchecked: no names; tapping a country highlights it and shows its name, and tapping another moves the highlight there.
- "Voltar" and the device back return to Início on the same continent.

## Technical

- `src/ui/namesToggle.ts`: the checkbox label, shared by both screens, calling back with the new state.
- `src/ui/screens/flagTable.ts`: the toggle switches a `hide-names` class on `.solution-grid`; CSS hides the captions under it.
- `src/ui/screens/mapTable.ts`: a new `mapTable` screen built on `renderMap`, painting each country of `mapPool(continent, 'general')` with or without its label.
- `src/ui/screens/hub.ts`: the maps area gets the `see-all` link to `mapTable`.

## Testing

DOM tests per screen: the toggle hides and shows names, the tap reveals one name with names off, the hub link and its wording, and "Voltar".
