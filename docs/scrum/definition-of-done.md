# Definition of Done

Status as of the final sweep (branch `chore/final-readme-dod`). Evidence was re-run on this branch; see the notes.

- [x] Code runs, no build errors, meets the task's acceptance criteria
  - Evidence: backend `npm run build`, unit tests (8 suites) and e2e tests (6 suites) pass; frontend `npx tsc --noEmit`,
    `npm test` (12 files) and `npm run build` pass. Acceptance criteria per task are listed in [sprint-plan.md](sprint-plan.md).
- [ ] Clear Git commits, reviewed by a teammate
  - Commits are small and per task (conventional `feat:` / `test:` / `chore:` prefixes, one branch per task).
  - Not ticked: no teammate review is recorded in the repository. The team should confirm the review before ticking.
- [x] API validates input; UI handles loading and error states
  - API: global `ValidationPipe` (whitelist, forbidNonWhitelisted) plus DTO rules; `Idempotency-Key` format checks;
    state-machine guards return 409; staff key guard returns 403/404.
  - UI: menu skeleton (`components/menu/menu-skeleton.tsx`) and error state (`menu-error.tsx`); route-level
    `loading.tsx` / `error.tsx` / `not-found.tsx` under `app/menu/[id]`; checkout and order pages show
    loading and error messages (payment decline keeps the cart; 401 clears the session).
- [x] README explains how to run it
  - Evidence: [README.md](../../README.md) covers local run, Docker run, env variables, tests, and the demo script.
