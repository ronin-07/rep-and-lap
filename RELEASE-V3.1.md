# Rep & Lap v3.1 — Activity rings, workout timing, scheduling and strength intelligence

This release is designed as a **drop-in update for the Vercel Next.js + React + TypeScript version** of Rep & Lap.

## What changed

- Reworked the activity rings with luminous gradient strokes, balanced spacing, a centered total, inline progress bars, and reduced-motion support.
- Redesigned the Gym **Session progress** card: a distinct large set count, a readable label, a separate progress bar and instructions.
- Added **Start workout** / **Finish workout** to Gym and Swimming. Start and end timestamps are stored on the same existing Firebase session document, with a duration that continues after a refresh. Finishing also marks that session complete. Manual completion still works, but does not invent a start time or duration.
- Added a **Training journal** in Progress with date, start/end times and duration. JSON backups and gym/swim CSV exports include the new session fields.
- Added a **Move** date input for unfinished workouts and **Shift remaining sessions forward** when a session is overdue. Sessions remain associated with their original plan week and keep their logged sets, swim data and notes. Sunday is skipped by the automatic shift; manual changes can use any date. If moved into a later week, the Home dashboard shows them as **Carried over to this week**. Moves can create overlaps with the next week's existing plan, so review the dates.
- Home rings and the Progress "sessions this week" card count completions by actual calendar date (where available), including carried-over workouts; the separate weekly plan counts its own six scheduled sessions.
- Added **estimated one-rep max** to Progress → Strength using Epley for logged sets with 1–12 reps, plus a same-exercise first-to-latest change, an aggregate trend based on the geometric mean of comparable exercise changes, weekly/lifetime lifted volume, logged sets and timed training hours. These are estimates, not actual tested max lifts.
- Kept the `+750 mL` Home hydration Quick Add and iOS Safari 16px input sizing from the previous update.

## Data compatibility

No Firebase project or Firestore rules changes. Existing collection paths, record keys, user IDs, local-storage keys and PWA support remain intact. The session document payload now includes optional `timing`, `plannedDate` and `completedAt` fields. Older records remain readable; old workouts display "Not tracked" for duration.

The service worker cache version has been bumped so old application code is replaced after refresh.

## Known constraints

- This package was based on the previously delivered **Vercel Next.js complete source**. It incorporates the successful `Waves` Lucide import correction and the Node.js **26.x** requirement seen in the Vercel build logs, but it does not automatically include unrelated edits you may have made directly in your GitHub repository.
- Local TypeScript/TSX syntax parsing, targeted TypeScript semantic checks with temporary dependency declarations, and pure TypeScript model tests passed. **Full `npm run build`, real Firebase sync, and mobile Safari visual regressions were not run in this environment** because external npm downloads are blocked. Run the Vercel Preview build and verify before merging to production.
- Automatic catch-up shifts only the selected plan week's remaining sessions, leaving other weeks unchanged; it may schedule two workouts on the same calendar day when you carry a session forward. Review the displayed dates and adjust with Move.
- A workout timer measures elapsed wall-clock time, including breaks, not exercise-only effort; it isn't a background notification or GPS tracker.
- Estimates for dumbbells/cables reflect the entered load, without guessing whether you entered a per-hand or total weight. Compare the same exercise with consistent logging conventions.

## Recommended rollout

1. Download/export a JSON backup from the live app.
2. Create a branch from `main` (e.g. `feature/workout-intelligence`).
3. Extract **RepLap-V3.1-Update-Patch.zip** into the repository root; preserve `.env.local` locally and all existing Firebase environment variables in Vercel.
4. Run `npm install`, `npm run typecheck`, `npm test`, and `npm run build` locally **if Node.js/npm is installed**, or push the feature branch and let Vercel Preview build it.
5. In Preview, check old log history, Google sign-in, session Start → Finish, refreshed workout duration, Move / Shift, strength trends, Safari inputs and mobile layout. Test offline edits and reconnect if you rely on them.
6. Merge into `main` only after the Preview passes; Vercel deploys production automatically.

## Files included in the patch

- `components/Rings.tsx`
- `components/dashboard/Dashboard.tsx`
- `components/workout/Workout.tsx`
- `components/progress/Progress.tsx`
- `hooks/useTrainer.ts`
- `lib/types.ts`, `lib/storage.ts`, `lib/metrics.ts`
- `app/globals.css`
- `public/sw.js`
- `package.json`
- `tests/metrics.test.ts`
- This release note
