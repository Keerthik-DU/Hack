# Forge Development Workflow

## Pre-Commit Checklist for User Stories

When committing changes related to a Forge user story (commits whose message
contains `[TASK-...]` or `[WO-...]`), you **MUST** complete the following checklist before
executing the `git commit` command. This is mandatory — do not skip any step.

FORGE PRE-COMMIT CHECKLIST — You must complete ALL steps below before the commit can proceed.

## Step 0 — Self-Review (MANDATORY before tests)
1. Run `git diff` and review your actual changes — not your memory of them.
   Check for: unintended changes, debug code left in, incomplete implementations.
2. Re-read every file you're about to commit in full.
   Check for: empty method bodies, TODO comments, placeholder values,
   configured-but-unwired components, unused imports.
3. Check: does your code follow the same conventions as neighboring files?
   (naming, error handling, test structure, logging)
4. If you find issues, fix them now. Re-run `git diff` to confirm fixes.
   Do not proceed until clean.

## Step 1 — Tests
1. Run `git diff --cached --name-only` to get the list of staged files.
2. If the project has a test framework and test command:
   a. For each staged source file, check if a corresponding test file exists.
   b. If the WO or testing_requirements asked for tests and a test file is MISSING,
      generate one. Otherwise, only generate tests if the project convention
      expects tests for every file.
   c. Run the full test suite. If any test FAILS, fix it (ask user consent
      if fix requires production code changes). Re-run to confirm.
3. If the project has NO test framework: skip this step — state
   "No test suite in this project" in the commit summary.
   Do NOT fabricate test counts or results.

## Step 2 — Acceptance Criteria Validation
1. Use the acceptance criteria already loaded from `get_work_order`
   (do NOT call it again — you already have the data).
2. For each criterion, determine: PASS / FAIL / CANNOT_VERIFY.
   Provide specific evidence (test name, file:line, observed behavior).
   Do NOT use "implemented as specified" as evidence.
3. If any criterion is FAIL: fix, re-run self-review (Step 0), re-test (Step 1).
4. Declare skipped implementation steps and reasons.
5. Once all criteria pass, proceed to Step 2b.
   Keep your validation summary — you will include it in the `commit_summary` field in Step 3.

## Step 2b — RTM Drift Check
1. Call `get_artifact` type `rtm` to fetch the Requirements Traceability Matrix.
2. Find rows where `work_order_ids` includes the current user story.
3. Compare your implementation against linked PRD sections and architecture components.
4. If drift is detected, note it — you will include it in `rtm_drift_summary` in Step 3.
5. Fix any drift before proceeding, or flag it for the user.

## Step 3 — Report to Forge
After the commit is created, collect git stats and report to Forge.
Use the Forge MCP `update_work_order` tool to update the user story with:
- `work_order_id`: the current user story ID
- `commit_summary`: a brief description of the changes being committed
- `test_summary`: actual test command + result, or "No test suite in this project" if none exists
- `rtm_drift_summary`: results of the RTM drift check from Step 2b

You MUST also include these structured fields for activity tracking:
- `repo_url`: the remote origin URL (run `git remote get-url origin`)
- `repo_name`: owner/repo extracted from the URL
- `branch_name`: current branch (run `git branch --show-current`)
- `commit_hash`: the full SHA of the commit being made (use `git rev-parse HEAD` after committing, or the staged commit SHA)
- `commit_message`: the commit message text
- `commit_author`: author name (run `git config user.name`)
- `files_changed`: number of files changed (from `git diff --cached --stat`)
- `lines_added`: total lines added
- `lines_removed`: total lines removed
- `changed_files`: array of objects with `path`, `additions`, and `deletions` per file (from `git diff --cached --numstat`)
- `tests_total`: total number of tests run (0 if no test framework)
- `tests_passed`: number of tests that passed (0 if no test framework)
- `tests_failed`: number of tests that failed (0 if no test framework)
- `tests_skipped`: number of tests skipped (0 if none)
- `test_coverage`: code coverage percentage if available (0-100), omit if not available

## Step 4 — Mark Ready
After ALL steps above are complete, create a file called `.forge-commit-ready` in the project root (write the text 'ready' to it), then retry the exact same `git commit` command.

> **Note:** This checklist is enforced deterministically in Cursor, Claude Code,
> Windsurf, and Devin via IDE hooks. In Antigravity it is advisory — please follow it
> diligently.
