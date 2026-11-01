# Beer Exchange

<p>
  <a href="https://github.com/jensmjahle/SkjebergBil-Bryggeri-Feat.Nissen-BrewFriend/releases/latest"><img alt="Gjeldende versjon" src="https://img.shields.io/github/v/release/jensmjahle/SkjebergBil-Bryggeri-Feat.Nissen-BrewFriend?style=for-the-badge&label=versjon&labelColor=3b1c0f&color=65a30d&logo=github&logoColor=fdf6e3" /></a>
  <a href="https://github.com/jensmjahle/SkjebergBil-Bryggeri-Feat.Nissen-BrewFriend/actions/workflows/release.yml"><img alt="Ny release" src="https://img.shields.io/badge/%F0%9F%8D%BA%20Ny%20release-65a30d?style=for-the-badge&labelColor=3b1c0f&logo=githubactions&logoColor=fdf6e3" /></a>
</p>

Introduction here yes, very nice great success.

# Maintainers

- Torbjørn Antonsen
- Jens Martin Jahle

# Getting Started

## Prerequisites

- Node.js
- npm or yarn

## Installation

### Install Dependencies

```bash
npm install
# or
yarn install
```

### Run Server

```bash
npm run dev:server
# or
yarn dev:server
```

### Run Client

```bash
npm run dev:client
# or
yarn dev:client
```

## Ny release

Trykk på **Ny release**-knappen øverst (eller Actions → *Ny release* → *Run workflow*), velg `patch`, `minor` eller `major` og kjør. Workflowen finner siste `vX.Y.Z`-tag, lager neste tag og en GitHub-release med automatiske release notes, og bygger og publiserer Docker-imagene til GHCR med den nye taggen.

## Run in Production Mode (Docker)

```bash
docker-compose up --build
```

## New MongoDB Backend (Brew Buddy)

The repository now includes a MongoDB-based backend for a brew companion domain:

- `Brewer` profile with `username`, `name`, `phoneNumber`, `password`, `profileImageUrl`
- `Recipe` with defaults (`FG`, `OG`, `SG`, `CO2 volumes`, `IBU`), flavor/type/color/image and steps
- `Brew` that can be linked to a recipe (or created without one), timeline fields, target metrics and measurements
- `Measurement` time-series for graphing (`temperatureC`, `OG`, `FG`, `SG`, `pH`, `CO2 volumes`, `IBU`)

### Environment variables

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=brewbuddy
JWT_SECRET=change-me
```

If `MONGODB_URI` is missing, `/api/*` returns `503`.

### V2 API endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/brewers/me`
- `PATCH /api/brewers/me`
- `POST /api/recipes`
- `GET /api/recipes`
- `GET /api/recipes/:id`
- `PATCH /api/recipes/:id`
- `DELETE /api/recipes/:id`
- `POST /api/brews`
- `GET /api/brews`
- `GET /api/brews/:id`
- `PATCH /api/brews/:id`
- `DELETE /api/brews/:id`
- `POST /api/brews/:id/measurements`
- `GET /api/brews/:id/graph?metric=temperatureC`

## Batchnummer og bryggfaser

Ved serveroppstart tildeles eksisterende brygg uten batchnummer et permanent nummer per brygger, i opprettelsesrekkefølge. Migreringen oppdaterer bare `batchNumber`, beholder historiske `updatedAt`-verdier og kan kjøres flere ganger. Nye brygg bruker en atomisk MongoDB-teller; slettede eller avbrutte opprettelser kan gi hull, men nummer gjenbrukes ikke. En unik indeks beskytter nummeret per brygger.

Bryggets lagrede livssyklus beholdes. Den synlige fasen utledes fra aktivt steg og stegtype, med valgfritt `phase`-felt for manuell kobling i oppskrift- og bryggredigering. Sammenhengende steg med samme fase deler tidslinje; pauser og lagrede sluttider brukes også etter gjeninnlasting.

Kontroller: `node --test server/domain/brewPhase.test.js`, `npx tsx --test server/mongo/batchNumbers.test.ts`, `npm run build`, `npm run build:server`. Migreringstestene bruker simulerte databaseoperasjoner og erstatter ikke en integrasjonstest mot MongoDB.

## Oppsummering, vurderinger og import

Fullførte brygg åpner i Oversikt. Faktisk ABV krever registrert OG og FG; manglende tid eller målinger vises som ukjent. Vurderinger lagres som separate oppføringer, med den gamle vurderingen bevart ved første endring. Sluttnotater lagres separat, og endring av vurderinger endrer ikke fullføringsdatoen. Oppskriftsstatistikken bruker fortsatt ett gjennomsnitt per brygg.

Bryggere er deltakernavn og er adskilt fra bryggets eier. Nedtelling kan spoles med dra-bevegelser eller piltaster, og dette lagres uten å skrive om faktisk stegtid. Venstre legger til tid, høyre trekker fra; piltaster har samme retning. Fullførte steg/brygg kan ikke spoles. Home gjenoppretter timerens totale varighet og End setter resttid til null.

Oppskriftsoversikten tilbyr nedlasting av public/templates/guttabrew-oppskrift-mal.md og import av UTF-8 Markdown/JSON. Import krever format guttabrew-recipe, versjon 1; fila valideres både i nettleseren og på serveren før en ny oppskrift opprettes. Filgrense: 512 KiB. Ukjente felter, gjentatte JSON-nøkler, ugyldige datatyper og brutte ingrediens-stegkoblinger avvises.

Kjør npm run test:brews for testene av faser, oppsummering, vurderinger, timerjusteringer, batchmigrering og oppskriftsimport. API-testene bruker ekte HTTP og Mongoose-validering med simulerte databaseoperasjoner; de skriver ikke til en faktisk MongoDB.
