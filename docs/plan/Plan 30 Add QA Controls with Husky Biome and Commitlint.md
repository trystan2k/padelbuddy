# Plan 30 — Add QA Controls with Husky, Biome, and Commitlint

## Task Analysis

- **Main objective**: Bootstrap automated code-quality tooling for the padelbuddy project — Biome
  (lint + format), Husky (git hooks), Commitlint (commit-message validation), and lint-staged
  (staged-file linting) — enforcing quality gates at `pre-commit`, `commit-msg`, and `pre-push`
  lifecycle stages.

- **Identified dependencies**:
  - Task 1 (Project Initialization) ✓ — `package.json`, `app.json`, `app.js` all exist
  - Task 3 (Persistence Layer) ✓ — `utils/storage.js`, `utils/match-storage.js` exist
  - Git repo initialized ✓ — `.git/` directory present
  - Node.js + npm installed ✓ — `package-lock.json` exists

- **System impact**:
  - **`package.json`** — adds 5 devDependencies; adds/updates 4 scripts (`prepare`, `lint`,
    `lint:fix`, `format`)
  - **New root-level config files** — `biome.json`, `commitlint.config.js`, `.lintstagedrc.json`
  - **New directory** — `.husky/` containing 3 executable hook scripts (`pre-commit`,
    `commit-msg`, `pre-push`)
  - **No changes to app logic** unless baseline lint pass (`npm run lint:fix`) auto-corrects
    style inconsistencies in existing source files; all such changes must be verified to keep
    `npm test` green

- **Key findings from codebase analysis**:
  - `package.json` has `"type": "module"` → all `.js` files are ES modules; `commitlint.config.js`
    **must** use `export default` (not `module.exports`)
  - Current code style: **single quotes**, **no semicolons**, 2-space indent, LF line endings
    (observed across `app.js`, `utils/`, `tests/`)
  - Zepp OS globals (`hmUI`, `hmApp`, `hmSetting`) are used **directly** (without `typeof` guards)
    in most page files → must be declared in `biome.json` `javascript.globals` to prevent false
    linting errors
  - `console.log()` is used intentionally in `app.js` for Zepp OS lifecycle logging → must
    suppress Biome's `noConsole` rule
  - Test suite uses the **Node.js native test runner** (`node --test`); no additional test
    framework or config is needed

---

## Chosen Approach

- **Proposed solution**: Install Husky v9 + Biome (latest) + Commitlint v19 + lint-staged as
  devDependencies; configure each tool at project root with a single config file; create 3 git
  hooks using `npx husky init` then populate their content manually.

- **Justification for simplicity**:
  - **Biome over ESLint + Prettier**: one tool, one config file, Rust-based speed — no
    formatter/linter coordination overhead or plugin management
  - **lint-staged**: only checks staged files, keeping commits fast regardless of project size
  - **Husky v9**: minimal configuration; a single `prepare` script auto-installs hooks for all
    contributors after `npm install`
  - **commitlint + @commitlint/config-conventional**: zero custom rule authoring; the
    `config-conventional` preset enforces exactly the commit message format already documented in
    `AGENTS.md` (`[type]: [description]`)

- **Components to be modified/created**:

  | File | Action | Reason |
  |---|---|---|
  | `package.json` | Modified | Add devDependencies + 4 scripts |
  | `biome.json` | Created | Linter + formatter configuration |
  | `commitlint.config.js` | Created | Commit-message validation rules (ESM) |
  | `.lintstagedrc.json` | Created | Maps file globs to Biome lint command |
  | `.husky/pre-commit` | Created | Executes lint-staged on staged files |
  | `.husky/commit-msg` | Created | Validates commit message via commitlint |
  | `.husky/pre-push` | Created | Runs full test suite before push |

---

## Implementation Steps

### Step 1 — Create the feature branch

```bash
git checkout -b feature/PAD-030-qa-controls-husky-biome-commitlint
```

**Checkpoint**: `git branch` shows the new branch as active.

---

### Step 2 — Install all devDependencies (Subtask 30.1)

```bash
npm install --save-dev husky @commitlint/cli @commitlint/config-conventional @biomejs/biome lint-staged
```

**Expected outcome**: `package.json` `devDependencies` block contains all 5 new packages with
resolved semver versions. `node_modules/` directories for each package are present.

**Checkpoint**: `node_modules/@biomejs/biome/configuration_schema.json` exists (confirms
Biome install).

---

### Step 3 — Initialize Husky and register the prepare script (Subtask 30.1)

```bash
npx husky init
```

> **⚠️ Version note**: This project targets **Husky v9**. The correct init command is
> `npx husky init` (not `npx husky install`, which is the v8 syntax documented in the task
> details). Husky v9 `init`:
> 1. Creates the `.husky/` directory
> 2. Creates a sample `.husky/pre-commit` with `npm test` as placeholder content
> 3. Automatically adds `"prepare": "husky"` to `package.json` scripts

**Checkpoint**: `.husky/` directory exists; `package.json` scripts contains `"prepare": "husky"`.

---

### Step 4 — Add lint/format scripts to package.json (Subtask 30.2)

After `npx husky init`, manually edit the `scripts` block in `package.json` to add the three
Biome scripts. The final scripts section must be exactly:

```json
"scripts": {
  "prepare": "husky",
  "test": "node --test",
  "lint": "biome check .",
  "lint:fix": "biome check --write .",
  "format": "biome format --write ."
}
```

> `"prepare"` is already added by the previous step; only `lint`, `lint:fix`, and `format` need
> to be added manually.

**Checkpoint**: `npm run lint --dry-run` (or `npx biome --help`) exits without errors.

---

### Step 5 — Create `biome.json` (Subtask 30.2)

Create `biome.json` at the project root with the following content:

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "files": {
    "ignore": [
      "dist/**",
      "node_modules/**",
      "assets/**",
      ".taskmaster/**",
      ".opencode/**",
      ".serena/**"
    ]
  },
  "organizeImports": {
    "enabled": true
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf"
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "suspicious": {
        "noConsole": "off",
        "noConsoleLog": "off"
      }
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "none",
      "semicolons": "asNeeded"
    },
    "globals": [
      "hmApp",
      "hmUI",
      "hmSensor",
      "hmFS",
      "hmBle",
      "hmSetting",
      "hmLogger",
      "px",
      "deviceName",
      "BUILD_TYPE"
    ]
  }
}
```

**Configuration rationale**:

| Setting | Value | Reason |
|---|---|---|
| `$schema` | Local node_modules path | Version-independent; works with any Biome release |
| `files.ignore` | `dist/`, `node_modules/`, `assets/`, tool dirs | Skip generated/binary/metadata directories |
| `formatter.indentStyle` | `space` | Matches `.editorconfig` |
| `formatter.indentWidth` | `2` | Matches `.editorconfig` |
| `formatter.lineEnding` | `lf` | Matches `.editorconfig` |
| `javascript.formatter.quoteStyle` | `single` | Matches observed code style in all source files |
| `javascript.formatter.semicolons` | `asNeeded` | Matches no-semicolon style in `utils/` and `page/` |
| `javascript.formatter.trailingCommas` | `none` | Matches observed style in existing code |
| `suspicious.noConsole` | `off` | `console.log()` used intentionally in `app.js` lifecycle methods |
| `suspicious.noConsoleLog` | `off` | Same reason; covers older Biome rule name variants |
| `javascript.globals` | Zepp OS API names | Prevents false `noUndeclaredVariables` for `hmUI`, `hmApp`, `hmSetting`, etc. used in `page/*.js` |

**Checkpoint**: Validate JSON syntax — `node -e "JSON.parse(require('fs').readFileSync('biome.json','utf8'))"` exits 0.

---

### Step 6 — Baseline lint pass and fix (Risk Mitigation) (Subtask 30.2)

Run a full auto-fix pass on the entire codebase **before** activating git hooks:

```bash
npm run lint:fix
```

Review the output carefully. Commit any auto-fixed style changes as a **dedicated baseline
commit** before proceeding to hook creation:

```bash
git add -A
git commit --no-verify -m "style: apply initial biome formatting to existing code"
```

> **Why `--no-verify` here**: The hooks do not yet enforce commitlint at this stage (the
> `commit-msg` hook hasn't been created yet), so `--no-verify` is a safety bypass in case the
> `pre-commit` placeholder was already active. Once all hooks are created and validated, all
> future commits must pass through them normally.

> **Risk mitigation**: Separating pre-existing style changes into a dedicated commit keeps the
> feature diff clean and makes it easy to identify whether a linting error belongs to the QA
> tooling setup or pre-existing code.

If Biome reports **unfixable linting errors** (not auto-correctable), evaluate each error:
- Disable a specific rule in `biome.json` under `linter.rules.<category>.<ruleName>: "off"` if
  it is a valid false positive for Zepp OS
- Fix any genuine code issues manually before proceeding

**Checkpoint**: `npm run lint` exits with code 0 after the baseline fix commit.

---

### Step 7 — Create `commitlint.config.js` (Subtask 30.3)

Create `commitlint.config.js` at the project root:

```js
export default {
  extends: ['@commitlint/config-conventional'],
}
```

> **⚠️ ESM required**: Because `package.json` sets `"type": "module"`, every `.js` file in this
> project is treated as an ES module. Use `export default` — **not** `module.exports =`. If
> CommonJS syntax is ever required, rename the file to `commitlint.config.cjs`.

**Checkpoint**: `npx commitlint --from HEAD~1 --to HEAD --verbose` (or
`echo "feat: test" | npx commitlint`) exits 0.

---

### Step 8 — Create the `commit-msg` Husky hook (Subtask 30.3)

Create (or overwrite) `.husky/commit-msg` with the following content:

```sh
npx --no -- commitlint --edit "$1"
```

Ensure the file is executable:

```bash
chmod +x .husky/commit-msg
```

> **`--no` flag** prevents npm/npx from treating subsequent arguments as npm options, ensuring
> `--edit "$1"` is forwarded correctly to commitlint.

**Checkpoint**:
- `ls -la .husky/commit-msg` shows `-rwxr-xr-x` permissions
- `cat .husky/commit-msg` shows the single command line above

---

### Step 9 — Create `.lintstagedrc.json` (Subtask 30.4)

Create `.lintstagedrc.json` at the project root:

```json
{
  "*.{js,ts}": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
  "*.json": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"
}
```

**Configuration rationale**:

| Flag | Purpose |
|---|---|
| `--write` | Auto-fix issues when committing (equivalent to `lint:fix` but scoped to staged files) |
| `--no-errors-on-unmatched` | Prevents lint-staged from failing if a glob matches no files in a given commit |
| `--files-ignore-unknown=true` | Prevents Biome from erroring on file types it cannot process |

> **Separate `*.json` rule**: Allows independent scoping if JSON files need different handling
> in the future. Biome's own `files.ignore` list in `biome.json` already excludes
> `node_modules/**`, `dist/**`, etc., so those are safe even when matched by lint-staged globs.

**Checkpoint**: `cat .lintstagedrc.json` shows valid JSON and correct Biome flags.

---

### Step 10 — Populate the `pre-commit` Husky hook (Subtask 30.4)

`npx husky init` created `.husky/pre-commit` with `npm test` as placeholder content.
**Replace** the entire file content with:

```sh
npx lint-staged
```

Ensure the file remains executable (it should be from the `init` step, but verify):

```bash
chmod +x .husky/pre-commit
```

**Checkpoint**:
- `cat .husky/pre-commit` shows only `npx lint-staged`
- `ls -la .husky/pre-commit` shows `-rwxr-xr-x`

---

### Step 11 — Create the `pre-push` Husky hook (Subtask 30.5)

Create `.husky/pre-push` with the following content:

```sh
npm test
```

Ensure the file is executable:

```bash
chmod +x .husky/pre-push
```

**Checkpoint**:
- `cat .husky/pre-push` shows only `npm test`
- `ls -la .husky/pre-push` shows `-rwxr-xr-x`

---

### Step 12 — Final verification of all hooks are executable

Run a single command to confirm all three hook files exist and are executable:

```bash
ls -la .husky/
```

Expected output (permissions must be `-rwxr-xr-x` for all three):

```
-rwxr-xr-x  commit-msg
-rwxr-xr-x  pre-commit
-rwxr-xr-x  pre-push
```

---

### Step 13 — Commit all QA tooling files (Subtask 30.5)

Stage all new configuration files and hook scripts:

```bash
git add biome.json commitlint.config.js .lintstagedrc.json .husky/ package.json
git commit -m "chore: add qa controls with husky biome and commitlint"
```

This commit **must pass all three hooks**:
- `pre-commit`: lint-staged checks the staged config files — all should pass Biome checks
- `commit-msg`: `"chore: add qa controls with husky biome and commitlint"` is a valid
  conventional commit (`chore` type, imperative description)
- All hooks are `pre-push` only on push, not on local commits, so this commit is unaffected
  by the test gate

---

## Validation

### Success Criteria

1. `npm run lint` exits with code 0 on the clean codebase after Step 6 baseline fix
2. `npm run lint:fix` auto-fixes style issues without breaking `npm test`
3. `npm run format --write .` reformats files consistently and `npm test` remains green
4. Staging a JS file with an intentional linting error and attempting `git commit` is **blocked**
   by the `pre-commit` hook with Biome error output
5. `git commit --allow-empty -m "bad message"` is **rejected** by the `commit-msg` hook
6. `git commit --allow-empty -m "feat: add qa controls"` **succeeds** through the `commit-msg`
   hook
7. `npm test` passes with all 15+ existing test files reporting green
8. Temporarily breaking a test assertion and running `git push` is **blocked** by the `pre-push`
   hook with test failure output

### Checkpoints by Subtask

**Subtask 30.1 (After Steps 2–3)**:
- [ ] `package.json` devDependencies contains: `husky`, `@commitlint/cli`,
  `@commitlint/config-conventional`, `@biomejs/biome`, `lint-staged`
- [ ] `.husky/` directory exists
- [ ] `"prepare": "husky"` is present in `package.json` scripts
- [ ] `npm run prepare` executes without error (reinstalls hooks)

**Subtask 30.2 (After Steps 4–6)**:
- [ ] `package.json` scripts contains `lint`, `lint:fix`, `format`
- [ ] `biome.json` passes JSON syntax validation
- [ ] `npm run lint` exits 0 (no errors on clean codebase)
- [ ] `npm test` still exits 0 after `npm run lint:fix`

**Subtask 30.3 (After Steps 7–8)**:
- [ ] `commitlint.config.js` exists at project root with `export default` syntax
- [ ] `.husky/commit-msg` exists with correct command and `chmod +x`
- [ ] `echo "bad message" | npx commitlint` exits non-zero (rejected)
- [ ] `echo "feat: add qa controls" | npx commitlint` exits 0 (accepted)

**Subtask 30.4 (After Steps 9–10)**:
- [ ] `.lintstagedrc.json` exists with correct Biome flags for `.js`, `.ts`, `.json`
- [ ] `.husky/pre-commit` contains `npx lint-staged` and is executable
- [ ] **End-to-end pre-commit test**:
  1. Add `const _unused = 1` (unused variable) to any `utils/*.js` file
  2. `git add <file>` to stage it
  3. `git commit -m "test: trigger lint"` → commit must be **blocked** with Biome error
  4. `npm run lint:fix` → re-stage → commit succeeds

**Subtask 30.5 (After Steps 11–13)**:
- [ ] `.husky/pre-push` contains `npm test` and is executable
- [ ] All three hooks pass permissions check (`ls -la .husky/`)
- [ ] Final commit `"chore: add qa controls..."` passes all hooks without `--no-verify`
- [ ] **End-to-end pre-push test**:
  1. Break an assertion in any test file (e.g., change `assert.equal(true, true)` to
     `assert.equal(true, false)`)
  2. `git push` → push must be **blocked** with test failure output
  3. Revert the broken assertion
  4. `git push` → push succeeds

### Post-Implementation Regression Check

After all steps complete, run the full test suite one final time to confirm no regressions:

```bash
npm test
```

Expected: all test files pass (15 test files under `tests/`).

---

## Rollback and Mitigation Notes

| Risk | Mitigation |
|---|---|
| Biome flags existing Zepp OS globals as undefined | Add the flagged global name to `javascript.globals` in `biome.json` |
| Biome auto-fix breaks a test | Revert the specific file via `git checkout -- <file>`, add to `files.ignore`, open a follow-up task |
| commitlint rejects a valid commit type | Verify the type is lowercase and from the allowed set: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore` |
| Hooks do not trigger after clone | Run `npm install` (triggers `prepare` → `husky`) or `npm run prepare` manually |
| `npx husky init` fails on CI/bare environment | Add `"prepare": "husky || true"` to package.json as fallback (but do not change this for local dev) |
| ESM commitlint config not recognized | Rename `commitlint.config.js` → `commitlint.config.cjs` and replace `export default` with `module.exports =` |
| Biome `noConsole` rule version mismatch | Both `suspicious.noConsole` and `suspicious.noConsoleLog` are set to `"off"` in the plan to cover all Biome version variants |

---

## File Summary

```
.
├── .husky/
│   ├── commit-msg          # npx --no -- commitlint --edit "$1"
│   ├── pre-commit          # npx lint-staged
│   └── pre-push            # npm test
├── biome.json              # Linter + formatter config (new)
├── commitlint.config.js    # Conventional commits validation (new, ESM)
├── .lintstagedrc.json      # Staged-file → Biome command mapping (new)
└── package.json            # +5 devDependencies, +4 scripts (modified)
```
