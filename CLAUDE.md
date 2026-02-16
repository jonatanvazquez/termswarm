# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is TermSwarm

A desktop app (Electron + React) that unifies terminal sessions, Claude Code workflows, and web previews into a single workspace organized by project.

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with hot reload (electron-vite dev) |
| `npm run build` | Type-check + build |
| `npm run typecheck` | TypeScript only (runs `typecheck:node` then `typecheck:web`) |
| `npm run lint` | ESLint with caching |
| `npm run format` | Prettier (single quotes, no semicolons, 100 char width) |
| `npm run build:mac` | Package for macOS (.dmg) |
| `npm run build:win` | Package for Windows (.exe) |
| `npm run build:linux` | Package for Linux (.AppImage, .deb, .snap) |

There is no test suite.

## Architecture

### Process Model (Electron)

Three isolated contexts communicate via IPC:

1. **Main process** (`src/main/`) — Window management, PTY spawning via node-pty, Git CLI wrapper, JSON-based persistence to `~/.config/TermSwarm/termswarm-data/`.
2. **Preload bridge** (`src/preload/index.ts`) — Context-isolated bridge exposing `window.api` to the renderer. All main↔renderer communication goes through this file's IPC channels.
3. **Renderer** (`src/renderer/src/`) — React 19 app with Zustand state management, xterm.js terminal rendering with WebGL addon, Tailwind CSS 4 styling.

Shared types live in `src/shared/` (imported by both main and renderer via composite TS projects).

### PTY Manager (`src/main/ptyManager.ts`)

The core engine. Each terminal tab gets a real PTY process. Two spawn modes:
- `claude` — Resolves the Claude Code binary, runs with `--dangerously-skip-permissions`, monitors output for prompt patterns (❯ character, BEL signal) to detect status.
- `terminal` — Spawns the user's default shell.

Status detection runs on a 500ms polling interval, analyzing ANSI-stripped output to determine: `running`, `waiting`, `idle`, `error`, `paused`.

### State Management (7 Zustand stores in `src/renderer/src/store/`)

All stores auto-persist to disk via `window.api` calls:
- **projectStore** — Projects and conversations (Claude/terminal sessions), color coding
- **terminalStore** — xterm.js instances, buffers, theme config
- **conversationStore** — Tab management
- **uiStore** — Sidebar width, preview state, layout
- **settingsStore** — Zoom (BASE_ZOOM=1.2), auto-saves with 500ms debounce
- **notificationStore** — Read/unread tracking
- **gitStore** — Git status polling per project, commit state

### IPC Channels

PTY: `pty:spawn`, `pty:write`, `pty:resize`, `pty:kill`, `pty:pause`, `pty:resume`, `pty:killAll`
Git: `git:isRepo`, `git:status`, `git:log`, `git:stage`, `git:unstage`, `git:stageAll`, `git:unstageAll`, `git:commit`, `git:pull`
Persistence: `store:load`, `store:save`, `store:loadBuffers`, `store:saveBuffers`, `store:loadSettings`, `store:saveSettings`, `store:loadUILayout`, `store:saveUILayout`
Other: `dialog:openDirectory`, `probe:url`, `claude:forkSession`

### Build System

electron-vite bundles three targets (main, preload, renderer). `node-pty` is externalized as a native addon. Path alias `@renderer` maps to `src/renderer/src/`. TypeScript uses two composite configs: `tsconfig.node.json` (main + preload + shared) and `tsconfig.web.json` (renderer + shared).

### Key Patterns

- **Adding IPC channels**: Define handler in `src/main/index.ts`, expose in `src/preload/index.ts`, call via `window.api` in renderer.
- **Claude session forking**: Copies `.jsonl` files from `~/.claude/projects/` to create branched conversations.
- **Terminal rendering**: xterm.js 6 with WebGL addon, JetBrains Mono 13px, 10k line scrollback. Buffers serialized to `buffers.json` for session restore.
- **Web preview**: Electron `<webview>` with port detection via Node.js `net.createConnection()` (bypasses Chromium restrictions).
- **HMR guard**: `main.tsx` blocks Vite's Navigation API reload on network recovery to prevent state loss.

## Code Style

- Prettier: single quotes, no semicolons, 100 char width, no trailing commas
- ESLint v9 flat config with TypeScript, React, React Hooks, and React Refresh rules
