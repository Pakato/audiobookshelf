# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Audiobookshelf is a self-hosted audiobook and podcast server. It's a client-server monorepo with a Node.js/Express backend and a Nuxt.js 2 (Vue 2) frontend. Uses SQLite via Sequelize ORM and Socket.io for real-time client updates.

## Commands

### Server (root)

```bash
npm run dev          # Start backend with nodemon (watches server/, port 3333)
npm test             # Run Mocha unit tests (recursive in test/)
npm run coverage     # Coverage report via nyc
npm run prod         # Build client + start production server
```

### Client (cd client/)

```bash
npm run dev          # Nuxt dev server (port 3000, proxies API to :3333)
npm test             # Cypress component tests (compiles Tailwind first)
npm run test-visually # Cypress interactive UI
npm run generate     # Build static client for production
```

### Running a single test

```bash
npx mocha test/server/path/to/File.test.js
```

## Architecture

### Server (`server/`)

- **Server.js** - Main orchestrator; initializes Database, Auth, all managers, routers, and Socket.io
- **Database.js** - Sequelize setup with lazy model getters (e.g., `Database.bookModel`)
- **Auth.js** - JWT + Passport.js (local, OIDC strategies)
- **SocketAuthority.js** - Socket.io event broadcasting to clients

**Request flow:** Express middleware -> Router (ApiRouter, HlsRouter, PublicRouter) -> Controller -> Manager -> Model

- **controllers/** - HTTP request handlers, one per resource (LibraryController, UserController, etc.)
- **routers/ApiRouter.js** - Central route registration, mounts all controllers under `/api/`
- **managers/** - Business logic services (PlaybackSessionManager, PodcastManager, BackupManager, CronManager, etc.)
- **models/** - Sequelize models (User, Book, Podcast, LibraryItem, MediaProgress, PlaybackSession, etc.)
- **scanner/** - Library scanning pipeline: LibraryScanner -> LibraryItemScanner -> AudioFileScanner/BookScanner/PodcastScanner
- **migrations/** - Sequential database migrations (naming: `vN.NN.N-description.js`)
- **providers/** - External metadata providers (Audible, OpenLibrary, iTunes, etc.)
- **objects/** - Value objects and legacy data structures

### Client (`client/`)

- Nuxt.js 2 with file-based routing (`pages/`), Vuex store (`store/`), Tailwind CSS 4
- Socket.io via `nuxt-socket-io` plugin for real-time updates
- API calls through `@nuxtjs/axios` proxied to backend

### Core Domain Model

- **LibraryItem** - Container with `mediaType` ('book' or 'podcast'), belongs to a Library
- **Book** - Audiobook metadata, related to Authors and Series (many-to-many)
- **Podcast / PodcastEpisode** - Podcast with episodes
- **MediaProgress** - Per-user, per-item playback progress (enables cross-device sync)
- **PlaybackSession** - Active listening session, updated in real-time via Socket.io

### Key Patterns

- Controllers receive the Server instance and access managers through it
- Socket events broadcast changes to connected clients: `SocketAuthority.emitter('item_updated', data)`
- Database models are accessed via static getters on Database: `Database.bookModel`, `Database.userModel`
- Server config via CLI flags (`--dev`, `-p PORT`, `-c CONFIG_PATH`) or env vars (`PORT`, `CONFIG_PATH`, `METADATA_PATH`)

## Testing

- **Unit tests** (Mocha + Chai + Sinon): `test/server/` mirrors `server/` structure
- **Component tests** (Cypress): `client/cypress/`
- CI runs on every push/PR via GitHub Actions (`.github/workflows/`)
