# RepLap v3.2 — Milestone 4 + UI hotfixes

**Release candidate for `feature/v3.2` / Vercel Preview only.** Based directly on the **Milestone 3 complete** Next.js source package. This patch should not be applied to the old vanilla JavaScript site or directly to production.

## Features and UI fixes

### Desktop and mobile
- Workout and Progress tabs are horizontally scrollable on small screens, with non-overlapping text and iOS-sized touch targets.
- Weigh-in date fields and body-weight value/unit have safer mobile alignment. Chart empty states no longer show misleading `1 kg` axis labels.
- Calendar has its own desktop sidebar destination; Home and Progress offer one-tap Calendar links. Four mobile bottom tabs remain unchanged.
- Marked rest days display **Recovery Day / Marked for recovery** as the primary state, and skipped sessions display **Workout Skipped**, with original workout beneath and clearer undo actions.
- Calendar day cells and legends use differentiated **icons, borders, text labels and colors** to support more users with color-vision differences. Browser hover titles and tap-to-select detail help identify a date.
- Changed **Move** to **Reschedule**, using an expandable form in the selected-day card and on Home.
- Gym routine editor: handle-based pointer drag reordering (mouse and touch), with up/down buttons retained for keyboard use; searchable, categorized **96-exercise library** plus custom entry.
- Resetting a saved routine now preserves current-week exercises containing logged sets; resetting a session keeps logged exercises visible. Tests cover the underlying data-preserving logic.
- Deleting a logged set requires explicit confirmation. Deletion uses the existing per-set tombstone sync path and leaves a blank slot to reuse. Unlogging a set also requests confirmation.

### Milestone 4 intelligence
- Home's time card now summarizes **this week**, rather than lifetime time.
- Progress Overview adds **weekly training time**, calculated from *finished* workout timers and actual completion dates (Monday–Sunday). Untimed past sessions are not guessed; time includes rest between sets.
- Progressive-overload guidance suggests an optional next rep or small weight increase based on logged working sets, target rep range, and any available RIR. An exercise needs a prior logged session; the suggestion never changes a set automatically and is not a training prescription.
- Swimming Progress adds total logged metres, longest *continuous* recorded freestyle, session-distance trend, pace per 100 m when duration and distance are recorded, and 25/50/75/100/200 m milestones. Session pace includes rests; it is not equivalent to timed continuous-swim pace.

## Architecture and data
- No new Firestore collection or rules change is required in this milestone. Existing Milestone 3 schema v4, per-set sync, routine overrides and session timing are reused.
- Added pure TypeScript analytics in `lib/training-intelligence.ts` with `tests/training-intelligence.test.ts`.
- PWA cache version bumped to `rep-lap-next-vercel-v3-milestone-4`.
- `main` and production Firebase project should remain unchanged.

## Apply to Vercel Preview

1. On Windows PowerShell, in your repository:
   ```powershell
   git switch feature/v3.2
   git pull --ff-only origin feature/v3.2
   ```
2. Extract `RepLap-V3.2-Milestone-4-Patch.zip` **into the repo root**. Replace the corresponding files, preserving `.git` and `.env.local`.
3. Run:
   ```powershell
   npm install
   npm run typecheck:model
   npm run typecheck
   npm test
   npm run test:rules
   npm run build
   ```
   `test:rules` requires Java and Firebase Emulator. Fix any failed checks before pushing.
4. Commit and push:
   ```powershell
   git add -A
   git status
   git commit -m "v3.2 milestone 4: training intelligence and UI fixes"
   git push origin feature/v3.2
   ```
5. Open the **stable branch Preview URL** in Vercel and use the **replap-dev** Firebase project. Do **not** merge into `main` yet.

## Preview acceptance checks (repeat on desktop and iPhone Safari)

### UI and scheduling
- At 320–390 px, Workout/Progress tabs scroll horizontally, never overlap or expand the page width; no unwanted Safari focus zoom.
- No clipped body-weight unit, target-weight field, date control, or bottom navigation. Empty weight trend shows an informative empty state.
- Mark Pull day **Rest**: Recovery Day is the main heading on Home and Calendar. Undo restores Pull day. Repeat with **Skipped**.
- Calendar is a separate desktop sidebar item and accessible from Home on mobile. Select/hover date cells and verify icons/legend contrast, then reschedule across weeks.

### Routine editor and set safety
- Open Gym → Edit routine, drag an exercise up/down on desktop and on touch, and verify order after refresh/sync; check arrow buttons work with keyboard.
- Search for "lat", "squat", "curl"; filter by category, add one, substitute one, and add a custom entry. Verify no duplicate names can be selected.
- Log a set on a custom exercise, then **Reset saved default** and **Reset this session**; ensure no error and that logged history remains visible after refresh.
- Tap Delete on a logged set. Verify Cancel leaves it unchanged; Confirm clears that set, it remains deleted after refresh and after another device syncs. Try unlogging via Logged button and verify confirmation.

### Analytics
- Complete a *timed* workout from 17:00–18:15. It should contribute **75 minutes** to the calendar week of completion. An untimed workout shouldn't invent a duration.
- Log bench press at 30 kg × 10 and 30 kg × 9 in one week; the following week, see an optional next-rep target. Bring all working sets to the top range and check that a modest weight suggestion appears; verify it doesn't automatically change logged values.
- Swim 4 × 25 m, logging 100 m total and 25 m continuous. The dashboard must not award 100 m continuous. Add a duration and check the pace label clearly says it includes rest.
- Regression: Google auth, independent per-set offline sync, conflict review, rest timer, export/restore, weight/hydration logging.

## Verification limitations

The local environment could not download npm dependencies, so **the full Next.js build, Vitest suite, Firebase Emulator, browser layout, iPhone Safari and cross-device behavior have not been verified here**. Completed checks: strict TypeScript model typecheck, TS/TSX syntax parsing, CSS parse, and targeted executable analytics checks. Vercel Preview must pass the full pipeline before accepting M4.
