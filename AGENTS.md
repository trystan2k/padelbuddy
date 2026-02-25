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
- `git-worktree` - Git worktree operations for parallel task execution

## Parallel Execution (Worktrees)

Configuration for running multiple tasks in parallel using git worktrees.

```yaml
worktree:
  directory: .worktrees              # Directory for worktrees (relative to project root)
  communication_mode: status-polling # "fire-and-forget" or "status-polling"
  auto_cleanup: false                # Auto-remove worktrees after completion (without asking)
  skip_baseline_tests: false         # Skip running tests after worktree creation
```

**Usage:**
```
User: "Please start tasks #15, #16, and #17 in parallel"
```

**Notes:**
- Worktrees are created at `.worktrees/<branch-name>/`
- Each task runs in its own isolated workspace
- Branch naming follows the pattern: `feature/PAD-[id]-[title]`, created from update main branch, always

## MCP Priority
- Always prefer **Serena MCP** for supported operations (file search, content search, code intelligence) when available
- Fall back to native opencode tools only when Serena MCP is unavailable

## Project
- Entry: `app.js`/`app.json`
- Screens: `pages/`
- Assets: `assets/`
