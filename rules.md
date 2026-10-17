# RULES.md — How to build and edit the Engagement Tracker (production)

## Scope
This is a production application, not a prototype. Code must be correct,
tested, and maintainable. Clarity and correctness over speed.

## Stack
Modular, standard stack defined in STACK.md. Do not introduce a new
framework or major dependency without explicit approval.

## Process
1. Restate the plan before any edit. Always wait for "go".
   Never edit in the same message as the plan.
2. One change per message. If a request contains multiple changes,
   ask which to do first.
3. Never redesign. Change only what was asked. No opportunistic
   refactors, renames, or formatting sweeps in unrelated files.
4. Ask ONE question if unsure. Never guess on deadlines, roles,
   permissions, or data shape.
5. Never delete live data or drop tables/columns unless explicitly told.
   Destructive migrations must be approved first.

## Quality gates (must pass before commit)
6. Typecheck must pass.
7. Tests must pass (add/extend tests for new logic).
8. Production build must succeed.
9. No `console.log`, debugger, or commented-out code in committed files.

## Change management
10. Work on a branch. Commit with clear messages. Open a PR for
    non-trivial changes; do not push directly to main.
11. Keep commits scoped — one logical change per commit.

## Security & data
12. Never commit secrets, tokens, or credentials. Use env vars / .env
    (git-ignored). Add an .env.example for required keys.
13. Enforce permissions server-side, not only in the UI.
14. Validate all input at the boundary (API/server), not just the client.

## Spec authority
15. WORKFLOW.md is the source of truth for scope and behaviour.
    ISQM is out of scope (handled in the ABOT system). Phase 1 only
    until told otherwise. If code and WORKFLOW.md disagree, stop and ask.
