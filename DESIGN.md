# Dev Session Manager

A lightweight system for managing remote development sessions with AI coding agents (OpenCode, Claude Code).

## Overview

Single-user system running on a remote Ubuntu server, accessed via:
- SSH/terminal from laptop
- Web dashboard via Cloudflare Tunnel / Tailscale Funnel
- Android (PWA or browser via tunnel)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Your Laptop / Phone                       │
├─────────────────────────────────────────────────────────────────┤
│  Browser → Tunnel → Dashboard (:3000)                           │
│                         │                                        │
│                         ├── List sessions                        │
│                         ├── Create session (repo picker)         │
│                         ├── View session (ttyd iframe + prompt) │
│                         └── Delete session                       │
│                                                                  │
│  Terminal → SSH → dev-* scripts                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Remote Dev Server                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ~/dev/                                                          │
│  ├── config.json          # ntfy topic, default agent           │
│  ├── repos.json           # registered repos (via gh)           │
│  ├── repos/               # bare git clones                     │
│  ├── worktrees/           # active worktrees                    │
│  ├── sessions/            # session metadata + history          │
│  └── scripts/             # CLI tools                           │
│                                                                  │
│  Per Session:                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ tmux session: "feature-auth"                             │    │
│  │ ├── window 0: agent   ←── ttyd (:7700+) ←── browser     │    │
│  │ ├── window 1: servers     (dev servers in panes)         │    │
│  │ ├── window 2: nvim                                       │    │
│  │ └── window 3: term                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  Dashboard (:3000) ─── Next.js calling shell scripts            │
│  ttyd (:7700-7799) ─── one per session, agent window            │
│  dev-watch ─────────── monitors agents, sends ntfy              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Prompt Flow

```
Dashboard                    Server                      tmux
    │                           │                          │
    │  "Add auth flow"          │                          │
    │ ──────────────────────>   │                          │
    │       (HTTP POST)         │  dev-send "..."          │
    │                           │ ────────────────────────>│
    │                           │                          │ tmux send-keys
    │                           │                          │ to agent pane
    │                           │                          │
    │   ttyd websocket ◄────────────────────────────────── │ you see it
    │   (iframe in dashboard)   │                          │ instantly
```

## CLI Tools

```bash
# Repository management (uses gh CLI)
dev-repo github              # list your GitHub repos (sorted by activity)
dev-repo github --org 75am   # list org repos
dev-repo pick                # interactive picker
dev-repo add owner/repo      # add by name
dev-repo list                # show registered
dev-repo branches <repo>     # list branches
dev-repo set-servers <repo>  # configure dev servers

# Session management
dev-new <repo> <branch>      # create session + tmux + ttyd + agent
dev-list                     # show all sessions
dev-attach <session>         # attach to tmux
dev-send <session> "prompt"  # send prompt to agent
dev-delete <session>         # cleanup everything

# Background daemon
dev-watch                    # monitor agents, send notifications
```

## Notifications

Using [ntfy.sh](https://ntfy.sh):
- Install ntfy app on Android
- Subscribe to your topic
- Get push when agent finishes or errors

```bash
# Config in ~/dev/config.json
{
  "notifications": {
    "ntfy_server": "https://ntfy.sh",
    "ntfy_topic": "dev-sessions-abc123"
  }
}
```

## Installation

```bash
# On your dev server
unzip dev-session-manager.zip
cd dev-session-manager

# Install dependencies
sudo apt install tmux jq
# Install ttyd: https://github.com/tsl0922/ttyd/releases
# Install gh: sudo apt install gh && gh auth login

# Run installer
chmod +x install.sh scripts/*
./install.sh

# Add first repo
dev-repo pick

# Start dashboard
cd dashboard && pnpm install && pnpm dev

# Start watcher (for notifications)
systemctl --user enable --now dev-watch

# Setup tunnel (pick one)
cloudflared tunnel --url http://localhost:3000
# or later: tailscale funnel 3000
```

## Dashboard Features

- **Home**: Grid of sessions with status (idle/working/error)
- **Repos**: GitHub picker sorted by last activity
- **New**: Create session (repo → branch → agent)
- **Session Detail**:
  - Tabbed terminal view (agent, servers, nvim, term)
  - Agent window embedded via ttyd iframe (interactive!)
  - Quick prompt input (sends via tmux)
  - History sidebar
  - Session metadata

## Session Structure

```
~/dev/sessions/feature-auth/
├── meta.json      # name, repo, branch, agent, ttyd_port, etc.
├── history.jsonl  # prompt/response log
├── ttyd.pid       # ttyd process ID
└── ttyd.log       # ttyd output

tmux session: feature-auth
├── agent   (window 0) ← ttyd attached here
├── servers (window 1) ← dev server panes
├── nvim    (window 2)
└── term    (window 3)
```

## Port Allocation

- Dashboard: 3000
- ttyd per session: 7700-7799 (auto-allocated)
- Dev servers: whatever they choose (Tailscale = no problem)

## Files

```
dev-session-manager/
├── DESIGN.md
├── install.sh
├── scripts/
│   ├── dev-repo      # gh-based repo management
│   ├── dev-new       # create session + tmux + ttyd
│   ├── dev-list      # list sessions (JSON for dashboard)
│   ├── dev-attach    # attach to tmux
│   ├── dev-send      # send prompt
│   ├── dev-delete    # cleanup
│   └── dev-watch     # notification daemon
└── dashboard/
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx           # session list
    │   │   ├── repos/page.tsx     # repo picker
    │   │   ├── new/page.tsx       # create session
    │   │   ├── sessions/[name]/   # session detail
    │   │   └── actions.ts         # server actions
    │   ├── components/
    │   │   ├── session-card.tsx
    │   │   ├── terminal-tabs.tsx  # ttyd iframe + tabs
    │   │   ├── prompt-form.tsx    # quick prompt
    │   │   ├── github-repo-picker.tsx
    │   │   └── ...
    │   └── lib/
    │       └── sessions.ts        # calls shell scripts
    └── ...
```
