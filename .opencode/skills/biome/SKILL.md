---
name: biome
description: "Use when configuring, running, or troubleshooting Biome (linter + formatter) in a JavaScript/TypeScript project. Covers biome.json setup, rule tuning, CLI commands, lint-staged integration, and migration from ESLint/Prettier."
license: MIT
compatibility: OpenCode
metadata:
  version: "1.0.0"
  owner: agent-skills
  references:
    - https://biomejs.dev/
    - https://biomejs.dev/reference/configuration/
    - https://biomejs.dev/linter/rules/
    - https://biomejs.dev/guides/getting-started/
    - https://biomejs.dev/guides/migrate-eslint-prettier/
---

# Biome Specialist

## Mission

Configure, run, and maintain [Biome](https://biomejs.dev/) as the unified linter and formatter for JavaScript, TypeScript, and JSON files. Make pragmatic decisions about rule severity, project-specific globals, and CI/pre-commit integration that keep the developer experience fast and non-disruptive.

---

## When to Use

Activate this skill for any of the following:

- Initial Biome setup in a new or existing project
- Writing or tuning `biome.json` configuration
- Diagnosing lint/format errors or warnings
- Migrating from ESLint + Prettier to Biome
- Adding Biome to a pre-commit (lint-staged) workflow
- Choosing which rules to enable, disable, or promote to errors
- Investigating `noUndeclaredVariables` false positives for platform globals
- Upgrading Biome (v1 → v2 schema changes)

---

## Installation

### npm

```bash
npm install --save-dev @biomejs/biome
```

### Initialise configuration

```bash
npx @biomejs/biome init
```

This creates a `biome.json` with sensible defaults. Customise from there.

---

## Configuration Reference (`biome.json`)

### Minimal production-ready config

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "files": {
    "includes": [
      "**",
      "!dist",
      "!node_modules",
      "!build",
      "!coverage"
    ]
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
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "none",
      "semicolons": "asNeeded"
    }
  }
}
```

### Key configuration fields

| Field | Purpose | Common values |
|-------|---------|---------------|
| `files.includes` | File glob inclusion/exclusion (v2) | `["**", "!dist", "!node_modules"]` |
| `formatter.indentStyle` | Tab vs space | `"space"` \| `"tab"` |
| `formatter.indentWidth` | Spaces per indent level | `2` \| `4` |
| `formatter.lineEnding` | Line ending style | `"lf"` \| `"crlf"` |
| `linter.rules.recommended` | Enable all recommended rules | `true` \| `false` |
| `javascript.formatter.quoteStyle` | String quote style | `"single"` \| `"double"` |
| `javascript.formatter.semicolons` | Semicolon style | `"always"` \| `"asNeeded"` |
| `javascript.formatter.trailingCommas` | Trailing comma style | `"none"` \| `"all"` \| `"es5"` |
| `javascript.globals` | Declare platform-specific globals | `["myGlobal", "anotherGlobal"]` |

### ⚠️ Biome v1 vs v2 schema changes

| v1 key | v2 equivalent | Notes |
|--------|--------------|-------|
| `files.ignore` | `files.includes` with `!` negation | `files.ignore` is deprecated in v2 |
| `organizeImports` (top-level) | `assist.actions.organizeImports` | Moved in v2 |
| `noConsoleLog` rule | Does not exist in v2 | Use `noConsole: "off"` instead |

Always check the version with `npx biome --version` and reference the matching schema.

---

## CLI Commands

```bash
# Check all files (lint + format check, no writes)
npx biome check .

# Check and auto-fix all files
npx biome check --write .

# Format only (no lint)
npx biome format --write .

# Check a specific file
npx biome check src/index.js

# Output in JSON (for CI parsing)
npx biome check . --reporter=json

# Lint only (no format)
npx biome lint .
```

### Recommended `package.json` scripts

```json
{
  "scripts": {
    "lint":     "biome check .",
    "lint:fix": "biome check --write .",
    "format":   "biome format --write ."
  }
}
```

---

## Rule Configuration

### Rule severity levels

```json
{
  "linter": {
    "rules": {
      "recommended": true,
      "suspicious": {
        "noConsole": "off",
        "noExplicitAny": "warn"
      },
      "correctness": {
        "noUnusedVariables": "error"
      }
    }
  }
}
```

Severity values:
- `"error"` — blocks CI / pre-commit
- `"warn"` — reported but does not fail (advisory)
- `"off"` — rule disabled
- `"info"` — informational only (does not affect exit code)

### Common rules to tune

| Rule | Category | When to disable/tune |
|------|----------|---------------------|
| `noConsole` | suspicious | Disable for server/CLI/device apps that log intentionally |
| `noUnusedVariables` | correctness | May produce false positives for API callback signatures |
| `noUnusedFunctionParameters` | correctness | Disable if using framework-required parameter slots |
| `noUndeclaredVariables` | correctness | Declare platform globals in `javascript.globals` instead |
| `useIterableCallbackReturn` | correctness | Disable if callbacks return non-void values (e.g. platform APIs) |
| `useTemplate` | style | Informational — prefer template literals over concatenation |

---

## Declaring Platform Globals

For projects running in non-browser environments (Zepp OS, React Native, browser extensions, Node builtins), declare globals to prevent `noUndeclaredVariables` false positives:

```json
{
  "javascript": {
    "globals": [
      "process",
      "Buffer",
      "__dirname",
      "__filename"
    ]
  }
}
```

Do **not** disable `noUndeclaredVariables` globally — prefer targeted globals declarations.

---

## Integration with lint-staged

For pre-commit use, pass the `--no-errors-on-unmatched` and `--files-ignore-unknown=true` flags to avoid failures on auto-generated or non-matching files:

```json
{
  "*.{js,ts}": "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true",
  "*.json":    "biome check --write --no-errors-on-unmatched --files-ignore-unknown=true"
}
```

---

## Ignoring Files and Directories

### Via `biome.json` (preferred)

```json
{
  "files": {
    "includes": [
      "**",
      "!dist",
      "!node_modules",
      "!coverage",
      "!*.generated.js"
    ]
  }
}
```

### Via inline comments (escape hatch)

```js
// biome-ignore lint/suspicious/noConsole: intentional debug log
console.log('debug')
```

---

## Diagnosing Warnings vs Errors

Exit code behaviour:
- Exit `0` → no errors (warnings and infos are non-blocking)
- Exit `1` → at least one error-severity finding
- Exit `2` → Biome itself crashed (config/syntax error)

To distinguish warnings from errors in output, look for the severity label in the output:
- `error` — must fix before commit
- `warn` — advisory, does not block
- `info` — informational

---

## Migration from ESLint + Prettier

```bash
# Automated migration helper (Biome v2)
npx @biomejs/biome migrate eslint --write
npx @biomejs/biome migrate prettier --write
```

These commands read your existing ESLint/Prettier configs and produce a `biome.json` equivalent. Review the output carefully — some rules have no direct equivalent.

---

## Upgrade Checklist (v1 → v2)

1. Update `@biomejs/biome` to latest v2: `npm install --save-dev @biomejs/biome@latest`
2. Replace `files.ignore` with `files.includes` using `!` negation patterns
3. Move `organizeImports` to `assist.actions.organizeImports` (or remove if not needed)
4. Replace `noConsoleLog: "off"` with `noConsole: "off"` (rule renamed in v2)
5. Run `npx biome check .` and review any new rule findings
6. Update `$schema` path if needed: `"./node_modules/@biomejs/biome/configuration_schema.json"`
