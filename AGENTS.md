# Shared agent guide

This project may be edited by both Claude Code and Codex.

## Coordination

- Start every task by inspecting `git status` and the relevant files.
- Treat all pre-existing modified and untracked files as user-owned work.
- Never revert, replace, or reformat unrelated changes.
- Keep each task limited to an explicitly owned file set.
- If another agent is editing the same file, stop and ask the user to assign ownership.
- Prefer role separation: one agent implements; the other reviews, tests, or works on a separate feature.
- For substantial parallel implementation, use separate Git branches or worktrees.

## Engineering workflow

- Read `README.md` and `package.json` before changing architecture or commands.
- Follow the existing Next.js, TypeScript, Supabase, and project conventions.
- Make focused changes and avoid broad refactors unless requested.
- Run the narrowest relevant checks first, then the project's lint, typecheck, test, or build commands when applicable.
- Report changed files, verification results, and unresolved risks when finishing.

## Safety

- Never expose or commit secrets from `.env.local`.
- Do not modify production data, deploy, or perform irreversible operations without explicit approval.
