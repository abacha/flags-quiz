# Map pool: every country, a few territories

## Reasoning

Maps left out every entry under 100 km² of 1:50m polygons. That rule dropped six sovereign states (Monaco, Maldives, Nauru, San Marino, Tuvalu and Vatican City) while keeping 33 territories that only padded the pool, such as Christmas Island, Wallis and Futuna and the French Southern Lands.

Adriano's decision: every sovereign state is on the map, whatever its size, and territories are out except a short hand-picked list of the ones a player expects to find on a map: Greenland, French Guiana, Puerto Rico, Hong Kong, the Falklands, New Caledonia, French Polynesia and the Faroe Islands. Area is a poor proxy for that choice, so the list is curated by hand.

The United Kingdom stays out as before, because the map asks its four nations.

## Technical

- `src/data/map-excluded.json` is the hand-edited source of truth: the 38 other territories plus `gb`. `scripts/build-map.mjs` reads it and fails when a pool entry has no polygon. It no longer computes or writes the list, and the 100 km² rule is gone.
- Pool entries under 10,000 km² with no land border keep taking their outline from the 1:10m data, so the Maldives, Nauru and Tuvalu now come from 1:10m. The build drops every islet under 1 km², keeping each country's largest polygon: quantization folded the smallest Maldives and French Polynesia islets into inverted rings, which d3 fills as the whole globe.
- `src/data/map-regions.json` is rebalanced to keep every region between 5 and 11 countries:
  - África: Tanzania and Mozambique join the islands as "Costa e Ilhas do Índico".
  - Américas: "Caribe Sul" merges into "Pequenas Antilhas", and the Bahamas move to "América do Norte".
  - Ásia: the Maldives join "Subcontinente Indiano".
  - Europa: a new "Itália e Microestados" region holds Italy, San Marino, Vatican City, Monaco and Malta.
  - Oceania: Nauru joins Micronesia, Tuvalu and New Zealand join Polynesia.
- `src/ui/map/map.ts`: a hit circle whose country is drawn smaller than its outline threshold moves to a layer above the country shapes, so an enclave such as Vatican City or San Marino stays tappable inside Italy. Larger countries keep their circle below the shapes, as before.
- Stored progress keeps its shape. Medals and records of a region whose pool changed stay as they are, and the ones for the removed "Caribe Sul" level are no longer shown.

## Checklist

- [x] Tests: every sovereign state is in the world pool, and the territories are exactly the eight chosen.
- [x] Tests: an outlined small country's hit circle sits above Italy and drops back below once zoomed in.
- [x] `npm run build:map` regenerates the topology with no globe-wrapping ring.
- [x] `npx vitest run` and `npx tsc --noEmit` pass.
- [x] Browser at 390 px: tapping Vatican City, San Marino, Monaco, Luxembourg and the Maldives selects them.
