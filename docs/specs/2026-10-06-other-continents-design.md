# Flags Quiz — Other continents design

Date: 2026-10-06
Status: approved by the operator's request to queue it overnight; the decisions below were made by the agent and are listed for the operator's review

## Goal

Open Learn and Quiz for Américas, Ásia, Europa and Oceania, with the same four levels Africa has.

Success means every continent on the continent screen is enabled, each has Fácil, Médio, Difícil and Geral in both modes, and every Learn format and the Quiz work on every level, including Oceania's small pools.

## Data

The 193 UN member states are already in `countries.json` with continent and Portuguese name; only Africa has tiers today.
This change adds `tier` to every other country, more `aliases`, and similar-flag groups for every continent.

### Tiers

Each continent splits into three tiers of near-equal size, ordered by how recognizable the flag and the country are. Geral holds the whole continent.

| Continent | Tier 1 (Fácil) | Tier 2 (Médio) | Tier 3 (Difícil) |
|---|---|---|---|
| Américas (35) | Brasil, Argentina, Estados Unidos, Canadá, México, Colômbia, Chile, Peru, Uruguai, Cuba, Jamaica, Venezuela | Bolívia, Paraguai, Equador, Panamá, Costa Rica, República Dominicana, Haiti, Guatemala, Honduras, Nicarágua, El Salvador, Trinidad e Tobago | Antígua e Barbuda, Barbados, Bahamas, Belize, Dominica, Granada, Guiana, São Cristóvão e Névis, Santa Lúcia, Suriname, São Vicente e Granadinas |
| Ásia (46) | Japão, China, Índia, Coreia do Sul, Coreia do Norte, Turquia, Arábia Saudita, Israel, Tailândia, Vietnã, Indonésia, Irã, Paquistão, Filipinas, Nepal, Mongólia | Malásia, Singapura, Sri Lanka, Bangladesh, Emirados Árabes Unidos, Catar, Iraque, Síria, Jordânia, Líbano, Afeganistão, Cazaquistão, Camboja, Laos, Mianmar | Armênia, Azerbaijão, Geórgia, Barein, Brunei, Butão, Kuwait, Quirguistão, Maldivas, Omã, Tadjiquistão, Timor-Leste, Turcomenistão, Uzbequistão, Iêmen |
| Europa (44) | Alemanha, França, Itália, Espanha, Portugal, Reino Unido, Países Baixos, Bélgica, Suíça, Suécia, Noruega, Dinamarca, Grécia, Irlanda, Polônia | Áustria, Finlândia, Islândia, Rússia, Ucrânia, Tchéquia, Hungria, Croácia, Romênia, Bulgária, Sérvia, Albânia, Chipre, Malta, Luxemburgo | Andorra, Bósnia e Herzegovina, Bielorrússia, Estônia, Liechtenstein, Lituânia, Letônia, Mônaco, Moldávia, Montenegro, Macedônia do Norte, Eslovênia, Eslováquia, San Marino |
| Oceania (14) | Austrália, Nova Zelândia, Fiji, Papua-Nova Guiné, Samoa | Tonga, Ilhas Salomão, Vanuatu, Quiribati, Micronésia | Ilhas Marshall, Nauru, Palau, Tuvalu |

### Similar-flag groups

Groups stay inside one continent, 2 to 4 flags each.

- **Américas:** Colômbia, Equador, Venezuela · Honduras, Nicarágua, El Salvador, Guatemala · Argentina, Uruguai · Peru, Canadá · Trinidad e Tobago, São Cristóvão e Névis · Panamá, República Dominicana.
- **Ásia:** Indonésia, Singapura · Jordânia, Emirados Árabes Unidos, Kuwait · Síria, Iraque, Iêmen · Japão, Bangladesh · Catar, Barein · China, Vietnã · Irã, Tadjiquistão.
- **Europa:** Romênia, Andorra, Moldávia · Países Baixos, Luxemburgo · Rússia, Eslovênia, Eslováquia, Sérvia · Itália, Irlanda · Hungria, Bulgária · Bélgica, Alemanha · Áustria, Letônia · Polônia, Mônaco · Noruega, Islândia, Dinamarca, Finlândia · Albânia, Montenegro.
- **Oceania:** Austrália, Nova Zelândia, Tuvalu, Fiji · Samoa, Tonga · Micronésia, Nauru, Ilhas Marshall.

### Extra aliases

Holanda (Países Baixos); República Tcheca, Chéquia (Tchéquia); EUA, Estados Unidos da América (Estados Unidos); Grã-Bretanha (Reino Unido); Macedônia (Macedônia do Norte); Bósnia (Bósnia e Herzegovina); Belarus (Bielorrússia); Moldova (Moldávia); Birmânia (Mianmar); Bahrein, Bahrain (Barein); Vietname (Vietnã); Emirados Árabes, EAU (Emirados Árabes Unidos); Tajiquistão (Tadjiquistão); Turquemenistão (Turcomenistão); Quirguízia (Quirguistão); Kiribati (Quiribati); Estados Federados da Micronésia (Micronésia); São Cristóvão e Nevis (São Cristóvão e Névis); Qatar (Catar); Kuait (Kuwait).

## Goals scale with the pool

Africa's goals (12, 18, 25, 30) were set for 18-flag tiers and a 54-flag Geral. Other continents have other sizes, so each level's goal becomes a factor of its pool size, rounded up:

| Level | Factor | Africa | Américas | Ásia | Europa | Oceania |
|---|---|---|---|---|---|---|
| Fácil | 2/3 | 12 | 8 | 11 | 10 | 4 |
| Médio | 1 | 18 | 12 | 15 | 15 | 5 |
| Difícil | 25/18 | 25 | 16 | 21 | 20 | 6 |
| Geral | 30/54 | 30 | 20 | 26 | 25 | 8 |

Africa's numbers do not change. Lives stay 3; recall weights and similar distractors stay per level.

## Small pools

Oceania's tiers hold 4 or 5 flags.
A format offering 6 options draws 6 only when the pool has at least 6 countries; otherwise it draws 4.
Every other format already fits a pool of 4 (four options, four pairs, two pool countries plus an intruder).

## Screens

The continent screen already enables a continent as soon as it has tiered countries, so all five turn on.
The level screen and the Learn result screen show the scaled goal.
Quiz needs no change: it asks the whole pool of the chosen continent and level.

## Testing

- Every continent's tiers partition it and differ in size by at most one; every country of every continent has a tier.
- Every similar-flag group stays inside one continent.
- Goals: Africa's four goals unchanged; one non-African row checked.
- Formats on a 4-country pool never ask for 6 options and never throw.
- A full Learn round runs on every continent and level without throwing.
