---
name: git-worktree
description: "Use when creating, managing, or cleaning up git worktrees for parallel development. Handles worktree creation with branch setup, safety verification, project setup, and cleanup operations."
license: MIT
compatibility: OpenCode
metadata:
  version: "1.0.0"
  owner: agent-skills
  references:
    - https://skills.sh/obra/superpowers/using-git-worktrees
    - https://git-scm.com/docs/git-worktree
---

# Git Worktree Operations

## Overview

Git worktrees create isolated workspaces sharing the same repository, allowing work on multiple branches simultaneously without switching branches in the main working directory.

**Core principle:** Systematic directory selection + safety verification = reliable isolation.

**Announce at start:** "I'm using the git-worktree skill to manage isolated workspaces."

## When to Use

Use this skill when an agent needs to:

- Create isolated workspaces for parallel development
- Set up worktrees for multiple feature branches
- Clean up worktrees after task completion
- List existing worktrees for status reporting

## Configuration

Worktree settings are read from AGENTS.md in the `worktree` section:

```yaml
worktree:
  directory: .worktrees          # Directory for worktrees (default: .worktrees)
  auto_cleanup: false            # Auto-remove worktrees after completion
  skip_baseline_tests: false     # Skip running tests after worktree creation
```

If not configured, defaults are used.

## Directory Selection Process

Follow this priority order:

### 1. Check AGENTS.md Configuration

```bash
# Look for worktree configuration
grep -A5 "worktree:" AGENTS.md 2>/dev/null
```

**If found:** Use the configured directory.

### 2. Check Existing Directories

```bash
# Check in priority order
ls -d .worktrees 2>/dev/null     # Preferred (hidden)
ls -d worktrees 2>/dev/null      # Alternative
```

**If found:** Use that directory. If both exist, `.worktrees` wins.

### 3. Default to .worktrees

If no configuration or existing directory, use `.worktrees/`.

## Safety Verification

### For Project-Local Directories (.worktrees or worktrees)

**MUST verify directory is ignored before creating worktree:**

```bash
# Check if directory is ignored (respects local, global, and system gitignore)
git check-ignore -q .worktrees 2>/dev/null
```

**If NOT ignored:**

1. Add appropriate line to .gitignore:

   ```bash
   echo ".worktrees/" >> .gitignore
   ```

2. Report that .gitignore was updated
3. Proceed with worktree creation

**Why critical:** Prevents accidentally committing worktree contents to repository.

## Operations

### 1. Create Worktree

**Purpose:** Create an isolated workspace for a feature branch.

**Inputs:**

- `branch_name`: Name of the branch (will be created if doesn't exist)
- `base_branch`: Base branch to create from (default: main or master)
- `worktree_path`: Optional custom path (uses configured directory if not provided)

**Procedure:**

```bash
# 1. Determine worktree directory
WORKTREE_DIR=".worktrees"  # or from AGENTS.md config

# 2. Ensure directory is ignored
git check-ignore -q "$WORKTREE_DIR" 2>/dev/null || echo "$WORKTREE_DIR/" >> .gitignore

# 3. Determine base branch
BASE_BRANCH="main"

# 4. Fetch latest
git fetch origin

# 5. Create worktree with new branch from base
git worktree add "$WORKTREE_DIR/$BRANCH_NAME" -b "$BRANCH_NAME" origin/$BASE_BRANCH

# 6. Verify creation
git worktree list
```

**Output:**

```markdown
Worktree Created:
  Path: /path/to/project/.worktrees/feature-branch-name
  Branch: feature-branch-name
  Base: main
```

### 2. Create Worktree with Existing Branch

**Purpose:** Create a worktree for an already-existing branch.

```bash
# Create worktree pointing to existing branch
git worktree add "$WORKTREE_DIR/$BRANCH_NAME" "$BRANCH_NAME"
```

### 3. List Worktrees

**Purpose:** Show all worktrees and their status.

```bash
git worktree list
```

**Output format:**

```
/path/to/project                  abc1234 [main]
/path/to/project/.worktrees/feat  def5678 [feature/my-feature]
```

### 4. Remove Worktree

**Purpose:** Clean up a worktree after task completion.

**Inputs:**

- `worktree_path`: Path to the worktree to remove
- `force`: Force removal even with uncommitted changes (default: false)

```bash
# Safe removal (fails if dirty)
git worktree remove "$WORKTREE_PATH"

# Force removal (use with caution)
git worktree remove --force "$WORKTREE_PATH"
```

**Safety checks:**

- Check for uncommitted changes before removal
- Warn if force is needed
- Verify removal succeeded

### 5. Prune Stale Worktrees

**Purpose:** Clean up worktree references for deleted directories.

```bash
git worktree prune
```

### 6. Project Setup After Creation

**Purpose:** Install dependencies and verify clean baseline in new worktree.

Auto-detect and run appropriate setup:

```bash
cd "$WORKTREE_PATH"

# Node.js
if [ -f package.json ]; then
  npm install
fi

# Node.js with lock files
if [ -f package-lock.json ]; then
  npm ci
elif [ -f yarn.lock ]; then
  yarn install --frozen-lockfile
elif [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
fi

# Rust
if [ -f Cargo.toml ]; then
  cargo build
fi

# Python
if [ -f requirements.txt ]; then
  pip install -r requirements.txt
fi
if [ -f pyproject.toml ]; then
  poetry install 2>/dev/null || pip install -e .
fi

# Go
if [ -f go.mod ]; then
  go mod download
fi
```

### 7. Baseline Test Verification

**Purpose:** Ensure worktree starts with passing tests.

```bash
cd "$WORKTREE_PATH"

# Run project tests (auto-detect)
if [ -f package.json ]; then
  npm test
elif [ -f Cargo.toml ]; then
  cargo test
elif [ -f pytest.ini ] || [ -d tests ]; then
  pytest
elif [ -f go.mod ]; then
  go test ./...
fi
```

**If tests fail:** Report failures, ask whether to proceed or investigate.

**If tests pass:** Report ready.

## Complete Worktree Creation Workflow

```bash
# 1. Announce
echo "Using git-worktree skill to create isolated workspace"

# 2. Get configuration
WORKTREE_DIR=$(grep "directory:" AGENTS.md 2>/dev/null | head -1 | awk '{print $2}' || echo ".worktrees")

# 3. Verify ignored
if ! git check-ignore -q "$WORKTREE_DIR" 2>/dev/null; then
  echo "$WORKTREE_DIR/" >> .gitignore
  echo "Added $WORKTREE_DIR/ to .gitignore"
fi

# 4. Create worktree
BRANCH_NAME="feature/my-feature"
WORKTREE_PATH="$WORKTREE_DIR/$(echo $BRANCH_NAME | sed 's/\//-/g')"
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" origin/main

# 5. Run setup
cd "$WORKTREE_PATH"
[ -f package.json ] && npm install

# 6. Run baseline tests (unless skip_baseline_tests is true)
npm test

# 7. Report
echo "Worktree ready at $WORKTREE_PATH"
echo "Tests passing"
echo "Ready to implement feature"
```

## Quick Reference

| Action | Command |
|--------|---------|
| Create with new branch | `git worktree add <path> -b <branch> <base>` |
| Create with existing branch | `git worktree add <path> <branch>` |
| List all worktrees | `git worktree list` |
| Remove worktree | `git worktree remove <path>` |
| Force remove | `git worktree remove --force <path>` |
| Clean stale refs | `git worktree prune` |
| Check if ignored | `git check-ignore -q <dir>` |

## Common Mistakes

### Skipping ignore verification

- **Problem:** Worktree contents get tracked, pollute git status
- **Fix:** Always use `git check-ignore` before creating project-local worktree

### Not fetching before creation

- **Problem:** Worktree created from stale base
- **Fix:** Always `git fetch origin` before creating worktree

### Proceeding with failing tests

- **Problem:** Can't distinguish new bugs from pre-existing issues
- **Fix:** Report failures, get explicit permission to proceed

### Hardcoding setup commands

- **Problem:** Breaks on projects using different tools
- **Fix:** Auto-detect from project files (package.json, etc.)

## Integration

**Called by:**

- `parallel-task-orchestrator` - For creating isolated workspaces for parallel tasks

**Pairs with:**

- `git-master` skill - For git operations within worktrees
- `task-delivery-orchestrator` - For executing tasks in worktree context

## Output Format

All operations return structured output:

```markdown
## Worktree Operation: [create|remove|list]

**Status:** [success|failed]

**Details:**
- Path: /path/to/worktree
- Branch: feature/branch-name
- Base: main

**Setup Results:**
- Dependencies: installed (npm install)
- Tests: 47 passing, 0 failing

**Next Steps:**
- Worktree ready for development
- Run task-delivery-orchestrator with worktree_path
```
