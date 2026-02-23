# Plan 31 — Set up GitHub Actions CI/CD Workflow

---

## Task Analysis

- **Main objective**: Create a GitHub Actions CI/CD workflow at `.github/workflows/ci.yml` that
  runs quality gates (lint, format, audit, test, build) on every push to `main` and on every
  pull request, using a Node.js 18.x/20.x matrix strategy and dependency caching.

- **Identified dependencies**:
  - Task 30 ✓ — Husky, Biome, Commitlint, lint-staged all installed and configured
  - `package.json` has `test`, `lint`, and `format` scripts already defined
  - Biome v2.4.4 installed as devDependency
  - `@zeppos/zeus-cli` (Zeus CLI) is installed **globally** (`v1.8.2`) — **not** in local
    `package.json` devDependencies; must be installed on CI

- **System impact**:
  - **`.gitignore`** — must remove `package-lock.json` entry (critical prerequisite; see below)
  - **`package.json`** — one new npm script added (`format:check`)
  - **`.github/workflows/ci.yml`** — new file; triggers GitHub Actions on push/PR

- **Critical pre-analysis findings** (discovered via deep repository inspection):

  | # | Finding | Impact |
  |---|---|---|
  | 1 | `package-lock.json` is in `.gitignore` | `npm ci` **will fail** — lock file doesn't exist in CI checkout |
  | 2 | `zeus` CLI is global-only, not in `package.json` | CI must install it explicitly |
  | 3 | `biome format --write . --check` crashes — `--check` is not a valid flag for `biome format` in v2.4.4 | `npm run format -- --check` (as written in task spec) will throw an error and break the workflow |
  | 4 | `biome check .` (`npm run lint`) exits 0 with 29 warnings — all existing code already passes format checks | No immediate CI failures expected; warnings are acceptable gate-passing state |
  | 5 | `biome format .` (no `--write`) exits 0 when already formatted, exits 1 if changes needed | Correct check mode — a new `format:check` npm script pointing to this is the fix for finding #3 |

---

## Chosen Approach

### Deepthink Pass — 3 Approaches Evaluated

**Approach A — Single job, full matrix (ALL steps on both Node versions)**
- Runs every step (lint, format, audit, test, build) on both Node 18.x AND 20.x
- Pro: Maximum coverage; detects Node version-specific behaviour
- Con: `zeus build` and CLI installation is repeated twice for no additional value (Zepp OS
  build output is Node-version-agnostic); longer wall-clock time

**Approach B — Single job with conditional matrix steps (chosen ✓)**
- Runs lint, format, audit, and test on the full matrix (18.x AND 20.x)
- Runs `zeus build` only once, on `20.x` only (via `if:` condition)
- Pro: Correct matrix coverage for JS runtime behaviour; avoids redundant build duplication;
  minimal YAML complexity; no separate jobs to coordinate
- Con: Slightly more complex `if:` conditions on build steps

**Approach C — Multi-job pipeline (lint job → test job → build job)**
- Separate jobs for each concern with `needs:` dependencies
- Pro: Parallel execution, cleaner failure isolation, ability to use different runners per stage
- Con: Overengineered for a project of this size; introduces job coordination overhead; three
  separate jobs means three separate `npm ci` installs (or complex artifact passing)

**Verdict**: Approach B — single job with matrix and conditional build step — is the simplest
effective design. Follows the task spec exactly, avoids Approach C's orchestration overhead.

### Proposed Solution

1. **Fix prerequisites** in the repository before creating the workflow:
   - Remove `package-lock.json` from `.gitignore` and commit it (enables `npm ci` and cache key)
   - Add `"format:check": "biome format ."` script to `package.json` (fixes broken `--check` flag)
2. **Create `.github/workflows/ci.yml`** using a single `quality` job with Node 18.x/20.x matrix
3. **Dependency caching**: Use `actions/cache@v4` targeting `node_modules`, keyed on
   `hashFiles('package-lock.json')`, with `npm ci` skipped on cache hit
4. **Build gate**: Install `@zeppos/zeus-cli` globally and run `zeus build` only on the `20.x`
   matrix leg (`if: matrix.node-version == '20.x'`)

### Justification for Simplicity

- One workflow file, one job, two matrix legs — no coordination complexity
- `actions/cache@v4` + `node_modules` caching as the task specifies; cache key is OS +
  Node version + lock file hash to prevent cross-platform contamination
- `npm ci` is skipped on cache hit so subsequent runs are fast
- `zeus build` runs once (not twice) since the build output is device-firmware, not
  Node-version-dependent

### Components to be Modified/Created

| File | Action | Reason |
|---|---|---|
| `.gitignore` | Modified | Remove `package-lock.json` line → enables `npm ci` in CI |
| `package.json` | Modified | Add `"format:check": "biome format ."` script |
| `.github/workflows/ci.yml` | Created | The CI/CD workflow |

---

## Implementation Steps

### Step 0 — Create the feature branch

```bash
git checkout -b feature/PAD-031-github-actions-ci-cd-workflow
```

**Checkpoint**: `git branch` shows `feature/PAD-031-github-actions-ci-cd-workflow` as active.

---

### Step 1 — Fix prerequisite: commit `package-lock.json` (Subtask 31.1 prerequisite)

**Why this is required**: `npm ci` (required by the task) reads and validates `package-lock.json`.
If the file is gitignored, the CI runner will check out the repo without it and `npm ci` will
fail immediately with:
```
npm error The `npm ci` command can only install with an existing package-lock.json
```

**Actions**:

1. Edit `.gitignore` — remove the `package-lock.json` line:

   ```diff
   - package-lock.json
   ```

   The updated `.gitignore` relevant section should look like (only the lock file entry removed):
   ```
   .DS_Store
   node_modules/**
   dist/*
   npm-debug.log
   yarn-debug.log*
   yarn-error.log*
   yarn.lock
   selenium-debug.log
   .idea
   .vscode
   *.suo
   *.ntvs*
   *.njsproj
   *.sln
   ```

2. Regenerate a clean `package-lock.json` (the existing one may be stale or was generated with
   Node 24.x):

   ```bash
   rm -f package-lock.json
   npm install --package-lock-only
   ```

3. Track and commit the lock file:

   ```bash
   git add .gitignore package-lock.json
   git commit -m "chore: track package-lock.json for reproducible ci installs"
   ```

**Checkpoint**:
- `git ls-files package-lock.json` outputs `package-lock.json` (file is now tracked)
- `cat .gitignore | grep package-lock` outputs nothing (entry removed)
- `npm ci --dry-run` exits 0 (lock file is valid and `npm ci` can parse it)

> ⚠️ **Risk note**: If `package-lock.json` was gitignored intentionally (some projects do this
> for libraries), committing it could cause merge conflicts for other contributors working on
> the same branch. For an application project like padelbuddy, this is the **correct and
> recommended practice** (lockfiles belong in application repos).

---

### Step 2 — Add `format:check` npm script (Subtask 31.4 prerequisite)

**Why this is required**: The task specifies `npm run format -- --check` to check formatting in
CI. However, `biome format --write . --check` (what that command produces) crashes in Biome
v2.4.4 with: `"Error: '--check' is not expected in this context"`.

The correct Biome v2 check-only mode for `format` is to run `biome format .` **without** the
`--write` flag: it reports diffs and exits with code 1 if any file needs reformatting, exits 0
if all files are already correctly formatted.

**Action**: Edit `package.json` scripts block:

```json
"scripts": {
  "prepare": "husky",
  "test": "node --test",
  "lint": "biome check .",
  "lint:fix": "biome check --write .",
  "format": "biome format --write .",
  "format:check": "biome format ."
}
```

Only `"format:check": "biome format ."` is added. All other scripts remain unchanged.

**Checkpoint**:
- `npm run format:check` exits 0 (current codebase is already correctly formatted)
- `node -e "require('./package.json').scripts['format:check']"` outputs `biome format .`

> **Note on redundancy**: `npm run lint` (`biome check .`) already checks formatting as part of
> its run in Biome v2 (`biome check` runs formatter, linter, and import sorting together). The
> separate `format:check` step in the workflow is architecturally redundant but provides clearer
> CI log separation and matches the explicit task requirement.

---

### Step 3 — Create `.github/workflows/` directory structure (Subtask 31.1)

```bash
mkdir -p .github/workflows
```

**Checkpoint**: `ls -la .github/workflows/` shows the empty directory exists.

---

### Step 4 — Create `.github/workflows/ci.yml` (Subtasks 31.1–31.5)

Create the file `.github/workflows/ci.yml` with the following exact content:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  quality:
    name: Quality Gate (Node.js ${{ matrix.node-version }})
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        node-version: ['18.x', '20.x']

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Cache node_modules
        id: cache-node-modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ matrix.node-version }}-modules-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-${{ matrix.node-version }}-modules-

      - name: Install dependencies
        if: steps.cache-node-modules.outputs.cache-hit != 'true'
        run: npm ci

      - name: Lint – Biome check
        run: npm run lint

      - name: Format – check only
        run: npm run format:check

      - name: Security – dependency audit
        run: npm audit

      - name: Test suite
        run: npm run test

      - name: Install Zeus CLI
        if: matrix.node-version == '20.x'
        run: npm install -g @zeppos/zeus-cli

      - name: Build – Zepp OS app
        if: matrix.node-version == '20.x'
        run: zeus build
```

#### Workflow Design Rationale

| Element | Value | Reason |
|---|---|---|
| `fail-fast: false` | false | See failures across ALL matrix legs; don't short-circuit on first failure |
| `runs-on` | `ubuntu-latest` | Standard CI runner; most cost-efficient; npm packages have Linux builds |
| `actions/checkout@v4` | v4 | Latest stable; uses Node 20 internally |
| `actions/setup-node@v4` | v4 | Latest stable; supports `node-version` matrix expansion natively |
| `actions/cache@v4` | v4 | Latest stable cache action |
| Cache `path` | `node_modules` | Caches installed packages as task specifies |
| Cache `key` | `${{ runner.os }}-node-${{ matrix.node-version }}-modules-${{ hashFiles('package-lock.json') }}` | Per-OS + per-Node-version + per-lockfile — avoids cross-contamination |
| `restore-keys` | OS + Node version prefix | On cache miss, fall back to most recent cache for same OS/Node combo (partial restore) |
| `npm ci` condition | `cache-hit != 'true'` | Skip install on full cache hit; always runs on cache miss or new lockfile |
| `npm run lint` | `biome check .` | Runs Biome linter AND formatter check in one command |
| `npm run format:check` | `biome format .` | Explicit separate format-only check for CI log clarity |
| `npm audit` | default flags | Fails on any vulnerability; current state is 0 vulnerabilities |
| `npm run test` | `node --test` | Native Node.js test runner, no extra tooling required |
| Zeus install condition | `matrix.node-version == '20.x'` | Run build once, not twice; Zepp OS `.zab` output is node-version-agnostic |
| `zeus build` condition | same | Runs after CLI is installed |

#### Why Node 18.x AND 20.x

The app runtime code uses native `node --test` (18+ feature) and ES module syntax
(`"type": "module"`). Testing on both 18.x (LTS maintenance) and 20.x (LTS active) ensures the
project remains compatible across the two most widely deployed LTS versions without testing on
24.x (local dev version) which is not yet LTS.

---

### Step 5 — Validate YAML syntax locally

```bash
# Option A: use npm's yaml-validator if available
node -e "
const fs = require('fs');
const content = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
// Basic YAML structural checks (tabs in YAML = error)
if (content.includes('\t')) throw new Error('Tabs found in YAML');
console.log('No tabs detected. Length:', content.length, 'chars');
"

# Option B: use npx js-yaml (if available or install temporarily)
npx --yes js-yaml .github/workflows/ci.yml && echo "YAML valid"
```

**Checkpoint**: No syntax errors reported.

---

### Step 6 — Commit all CI/CD files

Stage and commit all changes in a single logical commit:

```bash
git add .gitignore package.json package-lock.json .github/
git commit -m "chore: add github actions ci/cd workflow"
```

This commit passes all Husky hooks:
- `pre-commit`: lint-staged checks `.github/workflows/ci.yml` (YAML — skipped as not in lint-staged
  config) and `package.json` (JSON — Biome checks it) → passes
- `commit-msg`: `"chore: add github actions ci/cd workflow"` is a valid conventional commit → passes
- `pre-push`: `npm test` runs the test suite → passes if all 19 test files are green

**Checkpoint**:
- `git log --oneline -1` shows the new commit
- `git show --name-only HEAD` lists `.gitignore`, `package.json`, `package-lock.json`,
  `.github/workflows/ci.yml`

---

### Step 7 — Push and verify in GitHub Actions

```bash
git push --set-upstream origin feature/PAD-031-github-actions-ci-cd-workflow
```

**Checkpoint**:
- Workflow appears under **Actions → CI** tab in the GitHub repository UI
- Two parallel runs are shown (Node 18.x and Node 20.x)
- All steps display green checkmarks on both matrix legs

---

### Step 8 — Open a Pull Request to trigger PR-scoped workflow

Open a PR from `feature/PAD-031-github-actions-ci-cd-workflow` → `main`.

**Checkpoint**:
- The CI workflow appears in the PR checks section
- Both Node 18.x and Node 20.x jobs complete successfully
- The PR merge button shows "All checks have passed" or similar

---

## Complete File Content Reference

### `.github/workflows/ci.yml` (full file)

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

jobs:
  quality:
    name: Quality Gate (Node.js ${{ matrix.node-version }})
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        node-version: ['18.x', '20.x']

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}

      - name: Cache node_modules
        id: cache-node-modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: ${{ runner.os }}-node-${{ matrix.node-version }}-modules-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            ${{ runner.os }}-node-${{ matrix.node-version }}-modules-

      - name: Install dependencies
        if: steps.cache-node-modules.outputs.cache-hit != 'true'
        run: npm ci

      - name: Lint – Biome check
        run: npm run lint

      - name: Format – check only
        run: npm run format:check

      - name: Security – dependency audit
        run: npm audit

      - name: Test suite
        run: npm run test

      - name: Install Zeus CLI
        if: matrix.node-version == '20.x'
        run: npm install -g @zeppos/zeus-cli

      - name: Build – Zepp OS app
        if: matrix.node-version == '20.x'
        run: zeus build
```

### `package.json` scripts block (after change)

```json
"scripts": {
  "prepare": "husky",
  "test": "node --test",
  "lint": "biome check .",
  "lint:fix": "biome check --write .",
  "format": "biome format --write .",
  "format:check": "biome format ."
}
```

### `.gitignore` change (remove one line)

Remove this line:
```
package-lock.json
```

---

## Validation

### Success Criteria

1. `.github/workflows/ci.yml` exists and passes YAML syntax validation
2. Workflow triggers appear: `push` on `main` branch AND `pull_request` events
3. Node.js matrix covers `18.x` and `20.x` — two parallel job runs visible in Actions UI
4. `npm run format:check` exits 0 on clean code; exits 1 if a file needs formatting
5. `npm run lint` exits 0 on clean code; exits 1 if there are lint errors
6. Both quality steps fail the workflow if violations are present
7. `npm run test` runs all 19 test files; failures cause the workflow to fail
8. `npm audit` reports 0 vulnerabilities (current baseline); non-zero exit on newly introduced
   vulnerabilities
9. Dependency cache: on first run, `node_modules` is populated and saved to cache; on second run
   against the same `package-lock.json`, "Cache restored from key" appears in step logs and
   "Install dependencies" step is skipped
10. `zeus build` step completes successfully on the `20.x` matrix leg
11. Workflow shows correct pass/fail status in GitHub PR checks panel

### Checkpoints by Subtask

**Subtask 31.1 (After Steps 3–4)**:
- [ ] `.github/workflows/ci.yml` exists
- [ ] File contains valid YAML (no tabs, no indentation errors)
- [ ] `on.push.branches` includes `main`
- [ ] `on.pull_request` is present (no branch filter — triggers on all PRs)

**Subtask 31.2 (After Step 4)**:
- [ ] `strategy.matrix.node-version` is `['18.x', '20.x']`
- [ ] `strategy.fail-fast` is `false`
- [ ] Job name includes `${{ matrix.node-version }}` for human-readable labelling

**Subtask 31.3 (After Step 4 — cache and install steps)**:
- [ ] `actions/cache@v4` step present with `path: node_modules`
- [ ] Cache key includes `hashFiles('package-lock.json')`
- [ ] `restore-keys` provides OS + Node version fallback
- [ ] `npm ci` step has `if: steps.cache-node-modules.outputs.cache-hit != 'true'`
- [ ] `package-lock.json` is committed and tracked by git

**Subtask 31.4 (After Steps 2 and 4 — quality steps)**:
- [ ] `npm run lint` step present → runs `biome check .`
- [ ] `npm run format:check` step present → runs `biome format .`
- [ ] `npm audit` step present
- [ ] `"format:check"` script added to `package.json`

**Subtask 31.5 (After Step 4 — build and test steps)**:
- [ ] `npm run test` step present → runs `node --test`
- [ ] `npm install -g @zeppos/zeus-cli` step present with `if: matrix.node-version == '20.x'`
- [ ] `zeus build` step present with `if: matrix.node-version == '20.x'`

### Post-Implementation Verification Tests

**Test 1 — Verify cache works on second run**
1. Push any trivial commit to the feature branch (e.g., a comment in `ci.yml`)
2. Watch the Actions run for the second time
3. Confirm: "Cache restored from key" appears in the "Cache node_modules" step
4. Confirm: "Install dependencies" step shows as **skipped** (cache hit)

**Test 2 — Verify lint gate fails on bad code**
1. Introduce an intentional lint error in any JS file (e.g., `const x = undeclaredVar`)
2. Push to the feature branch
3. Confirm: "Lint – Biome check" step fails with a Biome error in the Actions log
4. Revert the error and push again to confirm the gate passes

**Test 3 — Verify format gate fails on bad formatting**
1. Introduce intentional bad formatting in any JS file (e.g., `const x={a:1}` without spaces)
2. Push to the feature branch
3. Confirm: "Format – check only" step fails with a Biome format diff in the Actions log
4. Revert and push to confirm green

**Test 4 — Verify test gate fails on broken test**
1. Temporarily break an assertion in `tests/scoring-engine.test.js`
2. Push to the feature branch
3. Confirm: "Test suite" step fails with the test failure output
4. Revert and confirm green

**Test 5 — Verify PR check integration**
1. Open a PR from the feature branch
2. Confirm the two CI jobs (`Quality Gate (Node.js 18.x)` and `Quality Gate (Node.js 20.x)`)
   appear as required checks in the PR checks panel
3. Confirm the merge button is blocked until both pass

---

## Edge Cases and Zepp OS/Zeus CLI Specific Notes

### Zeus CLI on Linux CI Runners

- Zeus CLI (`@zeppos/zeus-cli`) is globally installed locally but is **not** in `package.json`.
  The CI workflow installs it via `npm install -g @zeppos/zeus-cli` to get the latest stable
  version compatible with the project's `app.json` (v1.0 API).
- `zeus build` reads `app.json` (present and valid), packages the `page/`, `utils/`, `app-side/`,
  `setting/`, and `assets/` directories into a `.zab` archive. It does **not** require device
  connectivity or authentication for local packaging.
- The `dist/` directory (Zeus CLI output) is gitignored (`dist/*`) — this is correct; the built
  `.zab` is a CI artifact and should not be committed.
- If Zeus CLI v1.x requires additional native dependencies on Linux, the workflow may need
  `sudo apt-get install -y` steps. Monitor first run logs carefully.

### `npm audit` Behaviour

- Current state: 0 vulnerabilities across 136 packages. `npm audit` will exit 0.
- `npm audit` (without `--audit-level` flag) exits non-zero on ANY severity vulnerability in
  npm v7+. If a future dependency introduces a low-severity issue that is not patchable, consider
  adding `--audit-level=moderate` to the step to allow low-severity findings.
- `npm audit` requires `package-lock.json` — satisfied after Step 1.

### Node.js 18.x vs. 20.x Compatibility

- `node --test` (native test runner) is stable in Node 18.12+ and Node 20+. Both matrix versions
  are compatible.
- Biome v2.4.4 supports Node 18+. Both matrix versions are compatible.
- Zeus CLI v1.8.2 was tested locally on Node 24.x. Compatibility with 18.x and 20.x is expected
  but should be confirmed in first CI run.

### Cache Invalidation

- The cache key includes `${{ runner.os }}-node-${{ matrix.node-version }}` which means:
  - Separate caches for Node 18.x and Node 20.x (Biome has Node-version-specific binaries)
  - Separate caches for different OS (ubuntu-latest)
  - Cache is automatically invalidated when `package-lock.json` changes (new/updated package)

### `prepare` Script in CI

- The `package.json` has `"prepare": "husky"` which runs Husky setup on `npm install`.
- `npm ci` does **not** run the `prepare` script (it skips lifecycle scripts).
  This means Husky hooks are NOT installed in CI, which is correct — CI does not need git hooks.
- If a future `npm ci` implementation runs `prepare`, the `husky` command will gracefully exit
  with code 0 in a non-git-hook environment (Husky v9 handles this safely).

### Zepp OS Globals in Lint

- `biome.json` already declares Zepp OS globals (`hmApp`, `hmUI`, `hmSensor`, etc.) to prevent
  false `noUndeclaredVariables` lint errors. This configuration is already in place from Task 30
  and requires no changes for CI.

---

## Rollback and Mitigation Notes

| Risk | Mitigation |
|---|---|
| `zeus build` fails on Ubuntu due to missing native deps | Check Actions log; add `sudo apt-get install -y build-essential` step before Zeus install if needed |
| `zeus build` fails due to version mismatch | Pin the version: `npm install -g @zeppos/zeus-cli@1.8.2` (match local version) |
| `npm audit` fails on a new vulnerability | Either fix the vulnerability or add `--audit-level=moderate` if it's low-severity; open a security task |
| Node 18.x incompatibility with a dependency | If CI fails on 18.x but passes on 20.x, evaluate dropping 18.x from the matrix (it reaches EOL Apr 2025) |
| Cache corruption causes intermittent failures | Clear cache via GitHub Actions → Caches → Delete specific key; next run will do full install |
| `package-lock.json` merge conflicts after committing it | Use `npm install --package-lock-only` to regenerate and commit the resolved lock file |
| Husky `prepare` script runs in CI and causes issues | Change `"prepare": "husky"` to `"prepare": "husky || true"` in `package.json` as a safe fallback |

---

## File Summary

```
.
├── .github/
│   └── workflows/
│       └── ci.yml              # NEW — GitHub Actions CI workflow
├── .gitignore                  # MODIFIED — removed package-lock.json line
└── package.json                # MODIFIED — added format:check script
    package-lock.json           # NOW TRACKED — removed from gitignore, committed
```
