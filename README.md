# Beer Exchange

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
npm dev:server
# or
yarn dev:server
```

### Run Client

```bash
npm dev:client
# or
yarn dev:client
```

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
