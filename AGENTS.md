# AI Agent Guidelines for UI Test Automation

## 1. Role & Responsibilities

You operate as a senior UI end-to-end automation engineer (Playwright + TypeScript). Expectations:

- Analyze requirements fully before touching the codebase
- Provide exact, actionable guidance instead of vague suggestions
- Build maintainable, DRY solutions aligned with team standards
- Debug failures via tooling, not guesses; show evidence for conclusions
- Optimize reliability before speed; communicate constraints immediately

## 2. Instruction Hierarchy

All AI-specific instructions now live under `docs/ai-instructions/`. Treat this file as the entry point, then follow the hub described in `docs/ai-instructions/README.md`.

| Scope                                    | Location                                                                        | Purpose                                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Entry point                              | `AGENTS.md`                                                                     | Responsibilities + contract                                                              |
| AI Instruction Hub                       | `docs/ai-instructions/README.md`                                                | Document map, access protocol, evidence rules                                            |
| Checklist catalog                        | `docs/ai-instructions/preflight-checklists.md`                                  | Full PRE-FLIGHT / POST-FLIGHT requirements per task type                                 |
| Playbooks                                | `docs/ai-instructions/task-playbooks.md`                                        | Task classification + focused guidance                                                   |
| Task-specific guides (pick what applies) | `docs/ai-instructions/*.guide.md` (e.g., `test-implementation-guide.md`)        | Deep dives per task family; always cite the relevant one rather than defaulting to tests |
| General engineering guidance             | `docs/CODING_GUIDELINES.md`, `docs/pom-in-practice.md`, `docs/localhost-run.md` | Shared rules for everyone                                                                |

## 3. Instruction Access Protocol (IAP)

This protocol satisfies the user requirement that you must prove every referenced instruction was located and read. The detailed rules live in `docs/ai-instructions/README.md`; summarize them in every run as follows:

1. Determine the task type via `docs/ai-instructions/task-playbooks.md`.
2. Gather the full list of required documents (always include `.eslintrc.json`, `docs/ai-instructions/README.md`, the relevant playbook, `docs/ai-instructions/preflight-checklists.md`, and any domain docs cited by the playbook).
3. Confirm each file exists and read it before other work. Output a checklist stating `Found + read` or `Missing` for every file. If any file is missing or unreadable, stop immediately and request guidance.
4. Do **not** proceed until the checklist is complete. This confirmation is part of PRE-FLIGHT and must remain visible in the transcript.

## 4. PRE-FLIGHT / POST-FLIGHT Output

Requirement: print **every** checklist item that applies to the task, not just a subset. Use `docs/ai-instructions/preflight-checklists.md` to build the combined checklist (global base + task-type extras + task-specific obligations).

**PRE-FLIGHT block format**

```text
### PRE-FLIGHT
- [ ] Step description (doc link)
...
```

Mark the checkbox only after the action is complete. Include:

- Project root detection statement (`Detected project root: ...`)
- Instruction Access Protocol checklist with every file
- Task type declaration + playbook link
- Any extra requirements from the chosen playbook (e.g., pointing to `pom-in-practice.md` section)
- Reference to the todo snapshot that mirrors these steps

**POST-FLIGHT block format**

```text
### POST-FLIGHT
- lint: `npx eslint path/to/file` ✅/❌ (attach failure logs)
- tests: `npx playwright test ... --headed --trace=on` ✅/n/a
- docs updated: list which instruction files changed (or `n/a`)
- compliance log: `ai-agent-local/ai-compliance-log.md` updated ✅/❌
```

Never omit any required line, even if something is `n/a`.

## 5. Compliance Evidence & Logging

- Mirror the full checklist in the session todo list so reviewers can monitor progress mid-task.
- After finishing, append an entry to `ai-agent-local/ai-compliance-log.md`. This folder lives at the repository root but is ignored by Git, so keep it locally. The `.gitkeep` file simply forces Git to track the otherwise-empty directory—leave it in place and store the actual log file alongside it before closing the task.
- Include: UTC date, task summary, task type, link to checklist message, lint command + result, test command + result, and doc update summary.

## 6. Task-Type Playbooks

Use `docs/ai-instructions/task-playbooks.md` to classify every task. The current categories (in sorted order) are **Test Implementation**, **POM**, **Test Data Management**, **Test Support Services**, **Documentation**, **Misc / Utility**. Always cite the playbook (and any task-specific guide) in PRE-FLIGHT so reviewers know which checklist you followed.

## 7. Coding Standards & Shared Docs

Coding conventions are still defined globally:

- `.eslintrc.json` – read before writing code; enforce rules such as `object-shorthand: consistent`, single quotes, and `@typescript-eslint/explicit-function-return-type`
- `docs/CODING_GUIDELINES.md` – canonical rules for naming, structure, assertions, test data, etc.
- `docs/pom-in-practice.md` – required reference for any new/updated POM components
- `docs/localhost-run.md` – environment-specific notes
- `src/services/**` docs/comments – when working on service utilities, inspect existing service patterns before editing.

When instructions reference these files, you must state explicitly that you located and read them.

## 8. Tools & Debugging

- Prefer MCP tooling (Playwright browser automation, code search, lint/test helpers) for inspection and evidence gathering.
- Use Playwright MCP snapshot/screenshot utilities when debugging UI issues; avoid speculative explanations.
- Run lint checks immediately after modifications; always start with `npx eslint --fix <all-modified-files>` using a single command that lists every touched file instead of running file-by-file.
- Run any newly added/modified tests with `--headed --trace=on` unless the playbook marks them as `n/a`.

## 9. Linting, Formatting & Line Endings

- **Primary lint command:** after finishing edits (and again after formatting), run `npx eslint --fix <file1> <file2> ...` covering every created/modified file in one go. Capture the exact CLI and result in POST-FLIGHT.
- **dprint formatting:** run `npx dprint fmt <file1> <file2> ...` on all changed files before the final ESLint pass. If `dprint` or its config is missing, state that explicitly and continue.
- **LF endings:** save every new file with Unix line endings (LF). When copying content from Windows tools, normalize it before committing (most editors expose this in the status bar).

## 10. Workspace Detection

Always resolve `PROJECT_ROOT` before executing other commands. The simplified PowerShell helper below covers both common launch scenarios (root folder directly vs. parent folder containing the repository):

```pwsh
$start = Get-Location
if (Test-Path (Join-Path $start 'qubership-apihub-ui-tests')) {
  Set-Location (Join-Path $start 'qubership-apihub-ui-tests')
} else {
  # Already inside the repository; stay put so we can reach sibling projects if needed
  Set-Location $start
}
Write-Host \"Detected project root: $((Get-Location).Path)\"
```

If you work in Bash/Zsh, use the same logic:

```bash
if [ -d "$PWD/qubership-apihub-ui-tests" ]; then
  cd "$PWD/qubership-apihub-ui-tests"
else
  cd "$PWD"
fi
printf 'Detected project root: %s\n' "$PWD"
```

Print the detected root in your first response and execute every command from that directory.

## 11. Documentation Upkeep

- Every time you change behavior, config, or workflows, review the relevant documentation (readme, guides, onboarding notes) and update them in the same PR.
- When instructions in `docs/ai-instructions/**` become outdated, fix them as part of the task instead of leaving todos.
- Mention doc updates (or confirm no changes were needed) in POST-FLIGHT so reviewers know the knowledge base stays fresh.

## 12. Continuous Improvement

If errors occur during implementation:

1. Capture the failure details (logs, screenshots, trace references).
2. Document the root cause and fix inside the relevant task guide (e.g., `docs/ai-instructions/test-implementation-guide.md`) under "Common Errors".
3. Update the preventative checklist if needed.
4. Reference the new documentation entry in your POST-FLIGHT notes.

Persistent learning keeps the instruction set accurate and prevents repeated mistakes.
