---
name: basic-memory
description: "Use when an agent must create, update, or store development logs in Basic Memory with a consistent, reusable format for task implementation history."
license: MIT
compatibility: OpenCode
metadata:
  version: "1.0.0"
  owner: agent-skills
---

# Basic Memory Development Logging

## When to Use

Use this skill when a task or subtask implementation has finished and the agent must store a development log in Basic Memory.

Typical triggers:
- "create development log"
- "save implementation notes"
- "store task summary in memory"
- "record what changed for this task"

## Inputs

Inputs:
- Repository path.
- Task identifier (task ID, subtask ID, or equivalent).
- Implementation context:
  - objective
  - files changed
  - key decisions
  - validation commands and outcomes
  - known limitations or follow-ups
- Optional metadata:
  - branch
  - commit hash
  - related PR or MR
  - author or agent name

If any required input is missing, stop and return a structured input error.

## Procedure

Procedure:
1. Validate and normalize the input fields.
2. Resolve Basic Memory interface in this order:
   - `basic-memory`
   - `basic_memory`
   - configured project memory wrapper command
3. Run `<bm> --help` to confirm executable and available create or write command.
4. Build the log body using the canonical format below.
5. Ensure all fields are factual and derived from provided implementation context.
6. Create the memory entry using discovered Basic Memory create command.
7. Run a verification command to confirm persistence and obtain the entry ID.
8. Return structured output including storage result and entry identifier.

Canonical development log format (required):

```markdown
# Development Log: <task-id>

## Metadata
- Task ID: <task-id>
- Date (UTC): <YYYY-MM-DDTHH:MM:SSZ>
- Repository: <repo-name-or-path>
- Branch: <branch-or-n/a>
- Commit: <commit-hash-or-n/a>

## Objective
- <one-line objective>

## Implementation Summary
- <what was implemented>

## Files Changed
- <path>
- <path>

## Key Decisions
- <decision>

## Validation Performed
- <command>: <pass|fail> - <short result>

## Risks and Follow-ups
- <risk or follow-up>
```

## Outputs

Outputs:
- Markdown report with sections:
  - `Logging Context`
  - `Log Content`
  - `Storage Result`
  - `Final Status`

`Storage Result` must include:
- Basic Memory command used
- Stored entry identifier
- Timestamp

`Final Status` must be one of:
- `success`
- `partial`
- `failed`

### File Naming Convention for Development Logs

**MANDATORY**: Development logs **MUST** be saved with this exact filename format:

```
Task [ID] [Full Task Title From Task Master].md
```

**CORRECT Examples:**

- ✅ `Task 1 Implement User Authentication.md`
- ✅ `Task 2 Add Validation Logic.md`
- ✅ `Task 3 Setup Database Schema.md`
- ✅ `Task 70 Strengthen Zod Schema Type Definitions and Export Validation Helpers.md`

## Examples

Input:
- Task ID: `42`
- Objective: add retry logic for API client
- Files changed: `src/api/client.ts`, `src/api/client.test.ts`
- Validation: `npm test -- client.test.ts` passed

Output:
- `Logging Context`: task `42`, repository and metadata resolved.
- `Log Content`: canonical development log generated with objective, files, decisions, validation, and follow-ups.
- `Storage Result`: entry created via Basic Memory and ID returned.
- `Final Status`: `success`.

## Notes and Edge Cases

Notes:
- Always use the canonical format in this skill.
- Never include secrets, API keys, tokens, or credentials.
- If a create command is unavailable in the installed Basic Memory interface, return `failed` with exact command discovery output.
- If persistence succeeds but ID retrieval fails, return `partial` and include verification output.

## Essential Commands

### Core Workflow Commands

```bash
# Project Management
basic-memory project list                                   # List all configured projects with status
basic-memory project add <name> <path>                      # Create/register a new project
basic-memory project default <name>                         # Set the default project
basic-memory project remove <name>                          # Remove a project (doesn't delete files)
basic-memory project info                                   # Show detailed project statistics

# Note Operations
basic-memory tool write-note --title "Title" --content "Content" --project perfil --folder "folder/path" # Create/update a note
basic-memory tool write-note --title "Title" --project perfil --folder "folder/path"                     # Create note in specific folder
basic-memory tool write-note --title "Title" --tags "tag1" --tags "tag2" --project perfil --folder "folder/path" # Create note with tags
basic-memory tool search-notes "search term"  --project perfil                        # Search notes

basic-memory import memory-json /path/to/memory.json        # Import Memory JSON format
basic-memory --project=work import claude conversations     # Import to specific project

# System Status
basic-memory status                                         # Basic status check
basic-memory status --verbose                               # Detailed status with diagnostics
basic-memory status --json                                  # JSON output format
basic-memory --version                                      # Check installed version
```

### Using stdin with write-note

Basic Memory supports piping content directly to notes:

```bash
# Pipe command output to note
echo "Content here" | basic-memory tool write-note --title "Title" --folder "development-logs" --project perfil

# Pipe file content to note
cat README.md | basic-memory tool write-note --title "Project README" --folder "development-logs" --project perfil

# Using heredoc for multi-line content
cat << EOF | basic-memory tool write-note --title "Meeting Notes" --folder "development-logs" --project perfil
# Meeting Notes

## Action Items
- Item 1
- Item 2
EOF

# Input redirection from file
basic-memory tool write-note --title "Notes" --folder "development-logs" --project perfil < input.md
```