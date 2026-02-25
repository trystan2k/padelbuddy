# AGENTS.md – Padel Buddy (Zepp OS v1.0)

## Context
Padel match score tracker for Amazfit watches.

## Constraints
- **API**: Zepp OS v1.0 only (see [CONTEXT.md](./CONTEXT.md))
- **Reference**: https://docs.zepp.com/docs/1.0/intro/

## QA
`npm run complete-check`

## Conventions
- **Branch**: `feature/PAD-[id]-[title]`
- **Commit**: `[type]: [description]` (feat/fix/docs/style/refactor/test/chore)
- **Indent**: 2 spaces
- **Files**: snake_case/kebab-case | **Code**: camelCase
- **Units**: rpx (prefer), px (only for fixed sizing)

## Skills (load when needed)
- `zepp-os` - Zepp OS features
- `biome` - Linting/formatting
- `husky` / `lint-staged` - Git hooks
- `gh-cli` - GitHub operations

## MCP Priority
- Always prefer **Serena MCP** for supported operations (file search, content search, code intelligence) when available
- Fall back to native opencode tools only when Serena MCP is unavailable

## Project
- Entry: `app.js`/`app.json`
- Screens: `pages/`
- Assets: `assets/`
