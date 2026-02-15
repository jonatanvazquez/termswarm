<p align="center">
  <img src="build/termswarm-icon.svg" alt="TermSwarm Logo" width="120" />
</p>

<h1 align="center">TermSwarm</h1>

<p align="center">
  <strong>All your terminals. One command center.</strong>
</p>

<p align="center">
  A desktop app that unifies terminal sessions, Claude Code workflows, and web previews into a single organized workspace.
</p>

<p align="center">
  <a href="https://github.com/jonatanvazquez/termswarm/releases">Download v1.0.0</a> ·
  <a href="https://jonatanvazquez.github.io/termswarm">Website</a> ·
  <a href="https://github.com/jonatanvazquez/termswarm/issues">Report Bug</a>
</p>

---

## The Problem

Working with multiple projects means juggling dozens of terminal windows, losing track of which Claude Code session belongs to where, and constantly switching contexts. It's chaos.

**TermSwarm** solves this by giving you a single workspace where every terminal, every Claude Code conversation, and every dev server preview lives together — organized by project.

## Key Features

**Multi-Project Organization** — Group your terminal sessions by project with color-coded labels. Collapse, expand, and switch between projects instantly.

**Claude Code Integration** — Spawn Claude Code sessions inside any project directory. Fork sessions to explore different approaches while keeping the original context. Real-time status detection (running, waiting, idle, paused).

**Built-in Terminal** — Full terminal emulator powered by xterm.js with WebGL rendering. Run any shell command just like your regular terminal.

**Git Panel** — See branch info, staged/unstaged changes, and untracked files at a glance. Stage, unstage, commit, and pull without leaving the app.

**Web Preview** — Preview your dev servers in a built-in browser pane. Toggle between desktop and mobile viewports. Auto-detects running servers.

**Session Persistence** — Your projects, terminal buffers, settings, and UI layout are saved automatically and restored when you reopen the app.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Framework | Electron 39 |
| Frontend | React 19 + TypeScript 5.9 |
| Build Tool | Vite 7 via electron-vite |
| Styling | Tailwind CSS 4 |
| Terminal | xterm.js 6 with WebGL addon |
| PTY | node-pty (native pseudo-terminal) |
| State Management | Zustand |
| Icons | Lucide React |

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+
- **macOS**, **Windows**, or **Linux**

### Install from Source

```bash
# Clone the repo
git clone https://github.com/jonatanvazquez/termswarm.git
cd termswarm

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Download Pre-built App

Go to [Releases](https://github.com/jonatanvazquez/termswarm/releases) to download the latest macOS DMG. Windows and Linux builds coming soon.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the app in development mode with hot reload |
| `npm start` | Preview the built app locally |
| `npm run build` | Type-check and build the app |
| `npm run build:mac` | Build and package for macOS (.dmg) |
| `npm run build:win` | Build and package for Windows (.exe) |
| `npm run build:linux` | Build and package for Linux (.AppImage, .deb, .snap) |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript type checking |

## Project Structure

```
src/
├── main/                   # Electron main process
│   ├── index.ts            # Window creation, IPC handlers
│   ├── ptyManager.ts       # Terminal session lifecycle & status detection
│   ├── gitManager.ts       # Git operations wrapper
│   └── persistence.ts      # Save/load projects, buffers, settings
├── preload/
│   └── index.ts            # Context bridge — secure API for renderer
├── renderer/src/           # React frontend
│   ├── App.tsx             # Root component
│   ├── components/
│   │   ├── layout/         # AppLayout, Sidebar, TitleBar, StatusBar
│   │   ├── terminal/       # xterm.js wrapper
│   │   ├── sidebar/        # Project tree, Git panel
│   │   ├── preview/        # Built-in web preview
│   │   ├── notifications/  # Notification system
│   │   ├── settings/       # Settings panel
│   │   └── common/         # Reusable UI components
│   ├── store/              # Zustand stores (7 stores)
│   ├── hooks/              # Custom React hooks
│   └── types/              # TypeScript interfaces
└── shared/                 # Types shared between main & renderer
```

## How It Works

1. **Main Process** — Manages the Electron window, spawns and controls PTY (pseudo-terminal) sessions via `node-pty`, handles Git operations, and persists data to disk.

2. **Preload Bridge** — Exposes a secure API through Electron's context bridge so the renderer can control terminals, query Git status, and manage persistence without direct access to Node.js.

3. **Renderer** — A React app with Zustand for state management. Renders the terminal UI via xterm.js, manages the project sidebar, and orchestrates the overall workspace layout.

4. **PTY Manager** — The core engine. Each terminal tab spawns a real PTY process. For Claude Code sessions, it monitors output to detect prompt patterns, status changes, and BEL signals for smart status indicators.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## License

MIT

---

<p align="center">
  Built by <a href="https://github.com/jonatanvazquez">Jonatan Vazquez</a>
</p>
