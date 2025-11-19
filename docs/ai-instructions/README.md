# AI Instruction Hub

Centralized reference for every AI-specific rule. Use this hub together with `AGENTS.md` to prove compliance on each task.

## Document Map

| File                                                                     | Purpose                                                                                                            |
|--------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `AGENTS.md`                                                              | Entry point + high-level contract                                                                                  |
| `docs/ai-instructions/README.md`                                         | Hub + protocol + evidence requirements                                                                             |
| `docs/ai-instructions/task-playbooks.md`                                 | Task classification and scoped obligations                                                                         |
| `docs/ai-instructions/preflight-checklists.md`                           | Complete PRE-FLIGHT / POST-FLIGHT steps (global + per-type)                                                        |
| `docs/ai-instructions/*.guide.md` (e.g., `test-implementation-guide.md`) | Task-specific deep dives. Always cite the guide that matches the current task instead of hardcoding the test guide |
| `.eslintrc.json`                                                         | Canonical linter rules (always read first)                                                                         |
| `docs/CODING_GUIDELINES.md`                                              | General engineering standards (naming, structure, assertions, test data, etc.)                                     |
| `docs/pom-in-practice.md`                                                | Required reference when touching POM components                                                                    |
| `docs/localhost-run.md`                                                  | Env-specific notes for local/dev-proxy runs                                                                        |
| `ai-agent-local/ai-compliance-log.md`                                    | Evidence log (untracked, must exist locally; `.gitkeep` keeps the folder in Git)                                   |

> Use this table instead of duplicating requirements everywhere: pick the playbook + matching guide so you load only the rules that matter for the current task.

## Instruction Access Protocol (IAP)

1. **Identify the task type** using `docs/ai-instructions/task-playbooks.md`.
2. **Compute the required document set**: always include `.eslintrc.json`, this hub, `docs/ai-instructions/preflight-checklists.md`, the relevant playbook section, and any additional docs referenced by that playbook (e.g., `docs/pom-in-practice.md` for POM work).
3. **Locate every document**. If a file is missing or unreadable, halt immediately and ask for help.
4. **Read each document before continuing**. Summaries or past knowledge do not count.
5. **Report findings in PRE-FLIGHT**: output a checklist under “Instruction files” that states `Found + read` for each path. Explicitly mention any dependency docs (e.g., `docs/CODING_GUIDELINES.md §Locator Strategy`). Do not proceed until every entry is checked off.

Failure to follow IAP voids the run; missing evidence is treated as non-compliance.

## PRE-FLIGHT / POST-FLIGHT Expectations

- Assemble the PRE-FLIGHT checklist by concatenating:
  1. Global base steps from `docs/ai-instructions/preflight-checklists.md`.
  2. Task-type additions from the same document.
  3. Any ad-hoc requirements introduced by the user request.
- Print the entire combined list in the PRE-FLIGHT block and mirror it in the todo list.
- POST-FLIGHT must reference every lint/test command (even when `n/a`) and state whether instruction docs or compliance artifacts were updated.

Refer to `docs/ai-instructions/preflight-checklists.md` for the exact wording of each step and for output templates.

## Compliance Evidence

- Maintain `ai-agent-local/ai-compliance-log.md` outside Git. The folder is ignored, so create it locally before work if needed.
- Each entry records: UTC date, short summary, task type, link to the PRE-FLIGHT message, lint command/result, test command/result, docs touched, and notable follow-up items.
- If errors occurred, update the appropriate "Common Errors" section (usually inside `docs/ai-instructions/test-implementation-guide.md`) before closing the task.

## Workflow Summary

1. Run the workspace detection script (see `AGENTS.md`).
2. Execute the Instruction Access Protocol (this document).
3. Select the playbook and load its dependencies plus the relevant task guide.
4. Follow the playbook’s implementation guidance.
5. Format with dprint (if available), run `npx eslint --fix` across all touched files, execute required tests, and log compliance evidence.
6. Re-check documentation for accuracy and update it whenever behavior or workflow changes.

Keep responses terse but complete: cite exact files, commands, and verification steps so reviewers can reconstruct the session without guesswork.
