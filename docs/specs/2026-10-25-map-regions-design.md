# Flags Quiz — Map levels by region design

Date: 2026-10-25
Status: implemented

## Reasoning

The Maps levels reuse the flag tiers: Fácil asks the famous countries of a continent, Difícil the obscure ones.
That works for flags, where each flag is learned on its own, and fails for maps, where a country is learned by its place among its neighbours.
Adriano plays "Onde fica X?" and reaches the right region but confuses the neighbours: on "Senegal" he knows it is on the west coast and picks Gâmbia or Guiné-Bissau.
A tier round never drills that, because it jumps from Senegal to Moldova to Iceland, and the West African neighbours rarely meet in the same round.

Maps levels become regions of 5 to 11 neighbouring countries.
A round drills one region until its neighbours stop being confused, and a last level asks the whole continent.

## Goals

- Every map country belongs to exactly one region of its continent.
- A region round only asks and only accepts the countries of that region, so every mistake is a mistake between neighbours.
- The whole continent stays playable as the last level, as Geral is today.

## Non-goals

- No change to the flag levels, which keep their tiers.
- No new question format; Learn keeps `mapToNames`, `nameToMap`, `mapPairs`, `mapTrueFalse` and `mapTypeName`.

## Decided (Adriano, 2026-10-25)

- **Cards.** In the Mapas area, Fácil, Médio, Difícil and Geral are replaced by one card per region, in the order below, and a last card "Continente inteiro". Each card keeps Aprender, Quiz, the medal tag and the Quiz tag.
- **Mundo.** Mundo has a single card, "Mundo inteiro", since its regions are the continents themselves.
- **Region map.** A region question and the region Quiz open framed on the region. Countries of other regions are drawn grey like the neighbours outside the continent, and a tap on them does nothing.
- **Progress.** The Maps medals and Quiz records saved per difficulty are dropped; Maps progress starts from zero.
- **Goal.** A region keeps the minimum goal of 15 correct answers, so a region of 8 countries asks each one about twice per round.

## Division

Region names are the labels shown on the cards.

### África (60)

| Region | Countries |
|---|---|
| Norte (7) | Marrocos, Saara Ocidental, Argélia, Tunísia, Líbia, Egito, Sudão |
| Costa Oeste (9) | Mauritânia, Senegal, Gâmbia, Guiné-Bissau, Guiné, Serra Leoa, Libéria, Mali, Cabo Verde |
| Golfo da Guiné (7) | Costa do Marfim, Burquina Faso, Gana, Togo, Benin, Níger, Nigéria |
| Central (10) | Chade, Camarões, República Centro-Africana, Guiné Equatorial, Gabão, São Tomé e Príncipe, República do Congo, República Democrática do Congo, Angola, Santa Helena |
| Chifre e Grandes Lagos (10) | Sudão do Sul, Eritreia, Etiópia, Djibuti, Somália, Quênia, Uganda, Ruanda, Burundi, Tanzânia |
| Austral (9) | Zâmbia, Malaui, Moçambique, Zimbábue, Botsuana, Namíbia, África do Sul, Lesoto, Essuatíni |
| Ilhas do Índico (8) | Madagascar, Comores, Mayotte, Seicheles, Maurício, Reunião, Território Britânico do Oceano Índico, Terras Austrais e Antárticas Francesas |

### Américas (50)

| Region | Countries |
|---|---|
| América do Norte (5) | Canadá, Estados Unidos, México, Groenlândia, São Pedro e Miquelon |
| América Central (7) | Guatemala, Belize, El Salvador, Honduras, Nicarágua, Costa Rica, Panamá |
| Grandes Antilhas (10) | Cuba, Jamaica, Haiti, República Dominicana, Porto Rico, Bahamas, Ilhas Turcas e Caicos, Ilhas Cayman, Ilhas Virgens Americanas, Ilhas Virgens Britânicas |
| Pequenas Antilhas (6) | Antígua e Barbuda, São Cristóvão e Névis, Guadalupe, Dominica, Martinica, Santa Lúcia |
| Caribe Sul (7) | São Vicente e Granadinas, Barbados, Granada, Trinidad e Tobago, Aruba, Curaçao, Países Baixos Caribenhos |
| Norte e Andes (8) | Colômbia, Venezuela, Guiana, Suriname, Guiana Francesa, Equador, Peru, Bolívia |
| Cone Sul (7) | Brasil, Argentina, Chile, Paraguai, Uruguai, Ilhas Malvinas, Ilhas Geórgia do Sul e Sandwich do Sul |

### Ásia (48)

| Region | Countries |
|---|---|
| Oriente Médio e Cáucaso (10) | Turquia, Geórgia, Armênia, Azerbaijão, Síria, Líbano, Israel, Palestina, Jordânia, Iraque |
| Península Arábica (7) | Arábia Saudita, Iêmen, Omã, Emirados Árabes Unidos, Catar, Barein, Kuwait |
| Ásia Central (7) | Cazaquistão, Uzbequistão, Turcomenistão, Quirguistão, Tadjiquistão, Afeganistão, Irã |
| Subcontinente Indiano (6) | Índia, Paquistão, Nepal, Butão, Bangladesh, Sri Lanka |
| Extremo Oriente (7) | China, Mongólia, Coreia do Norte, Coreia do Sul, Japão, Taiwan, Hong Kong |
| Sudeste Continental (5) | Mianmar, Tailândia, Laos, Camboja, Vietnã |
| Sudeste Insular (6) | Malásia, Singapura, Indonésia, Brunei, Filipinas, Timor-Leste |

### Europa (50)

| Region | Countries |
|---|---|
| Ilhas Britânicas e Atlântico Norte (9) | Inglaterra, Escócia, País de Gales, Irlanda do Norte, Irlanda, Ilha de Man, Jersey, Islândia, Ilhas Faroé |
| Nórdicos e Bálticos (8) | Noruega, Suécia, Finlândia, Dinamarca, Ilhas Åland, Estônia, Letônia, Lituânia |
| Ocidental (9) | Portugal, Espanha, Andorra, França, Bélgica, Países Baixos, Luxemburgo, Itália, Malta |
| Central (8) | Alemanha, Suíça, Liechtenstein, Áustria, Tchéquia, Eslováquia, Polônia, Hungria |
| Bálcãs (11) | Eslovênia, Croácia, Bósnia e Herzegovina, Sérvia, Montenegro, Kosovo, Macedônia do Norte, Albânia, Grécia, Bulgária, Chipre |
| Leste (5) | Rússia, Bielorrússia, Ucrânia, Moldávia, Romênia |

### Oceania (20)

| Region | Countries |
|---|---|
| Austrália e Melanésia (8) | Austrália, Nova Zelândia, Papua-Nova Guiné, Ilhas Salomão, Vanuatu, Nova Caledônia, Fiji, Ilha Christmas |
| Micronésia (6) | Palau, Micronésia, Guam, Ilhas Marianas do Norte, Ilhas Marshall, Quiribati |
| Polinésia (6) | Samoa, Samoa Americana, Tonga, Niue, Wallis e Futuna, Polinésia Francesa |

With "Continente inteiro" per continent and "Mundo inteiro", Maps has 36 levels: 8 each for África, Américas and Ásia, 7 for Europa, 4 for Oceania and 1 for Mundo. The hub header counts them as it counts the levels today.

## My calls (Adriano did not decide these)

- **Learn rules for a region:** the `recallWeight` of Médio (2). "Continente inteiro" and "Mundo inteiro" keep Geral's rules and goal.
- **Distractors in a region:** the 8 nearest countries of the level's pool, as today; a region of 9 or fewer uses all its other countries.
- **Review gap in a small region:** a country comes back after at most `pool size − 1` other questions, since a region of 5 cannot wait 5 questions; larger pools keep the gap of 5.
- **"Onde fica X?" in a region** opens framed on the whole region, so the answer is not given away and the tap is between neighbours. "Continente inteiro" keeps the whole continent.

## Technical

- `src/data/map-regions.json`: per continent, the ordered list of regions, each with a `key`, a `label` and its `iso2` list. A data test asserts every map country of the continent sits in exactly one region.
- `src/data/maps.ts`: a map level is a region key or `all`; `mapPool(continent, level)` returns the region's countries, or the continent's whole map pool for `all`.
- `src/ui/map/map.ts`: `renderMap` takes the level's countries as the playable set. Pool countries outside it get the `context` class and no hit circle, and a region view opens framed on the set.
- `src/engine/mapFormats.ts`, `src/ui/screens/mapGame.ts`, `mapQuiz.ts`, `mapResult.ts`, `mapQuizResult.ts`, `src/ui/navigation.ts`: the map screens carry a `level` in place of `difficulty`, and titles show the region label.
- `src/mapRecords.ts`: medals and Quiz records keyed by continent and level, under new storage keys, so the per-difficulty Maps entries are no longer read.
- `src/ui/screens/hub.ts`: the Mapas area renders the region cards and "Continente inteiro"; the tab check and the header counter count the region levels.

## Testing

- Data: full coverage, no duplicate, no unknown `iso2`.
- Map: a region view frames the region, its outsiders are grey and ignore taps.
- Learn and Quiz on a region only ask its countries; goal 15.
- Hub: region cards per continent in order, "Mundo inteiro" alone on Mundo, counters.
- Records: a region medal and Quiz record are saved and read back; the old Maps keys are ignored.
- Browser at 390px: África › Costa Oeste, Learn and Quiz.
