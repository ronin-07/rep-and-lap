# RepLap v3.2 — Milestone 5 (Preview candidate)

**Branch:** `feature/v3.2`  
**Status:** implementation prepared, **not approved for production** until Vercel build and manual regression tests pass.  
**Prerequisite:** apply this patch to the **Pre-Milestone-5 Hotfix** build, not to an earlier M3/M4 release.

## Features

- **Progress → Insights** (one additional horizontally scrollable tab; the four mobile bottom tabs remain unchanged):
  - Weekly **muscle coverage** across Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, and Core. A valid logged set counts 1 for the first mapped muscle group and 0.5 for other distinct named muscle groups. The UI shows these weights and the source counts; this is **not measured muscle activation** or a recovery recommendation. Unknown custom-exercise muscle tags are listed as uncategorized instead of guessed. Deleted and unfinished sets do not count.
  - **Monthly recap** with completed gym/swim sessions, recorded workout duration, lifting volume, sets logged, active days, first-to-last body-weight change when two weigh-ins exist, swim metres, hydrated days where the logged total reached that date's target, and new heaviest-load records (strictly after a previous baseline for the same exercise). Previous and next months can be selected; future months are disabled. Session completion uses actual completion date where recorded, not merely the original training week.
  - **Achievement cabinet** with six computed goals: first session, 12 sessions, 50 logged sets, 1,000 m of logged swimming, 50 m continuous swimming, and seven days reaching the water goal. Locked badges show progress; achievements never fabricate an unlock and require no extra Firestore documents.
- **Progress Overview** contains a brief discovery shortcut for Insights without duplicating the detailed panels on Home.
- **Accuracy fix:** deleted gym sets no longer count in shared `loggedSet` calculations (including strength totals and PRs).
- **PWA cache version** incremented to refresh the offline shell after deployment.
- Responsive layouts for 320 px phones through desktop, high-contrast labels, progress-bar accessibility text, and `prefers-reduced-motion` support.

## Data model and privacy

No additional Firestore collections, environment variables, permissions or database migration are required **for Milestone 5**. Calculations are derived locally from the same `TrackerData` already populated by Firebase listeners. Keep the v3.2 **Milestone 1–2 development Firestore rules** installed in `replap-dev`.

Metrics intentionally distinguish completed sessions from logged in-progress sets, training-duration data from an untracked session, and total swimming distance from a longest continuous swim. The recap labels only compare logged weights against prior logged baselines. Hydration achievements reflect logged drinks, not unobserved intake.

## Apply on `feature/v3.2`

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
# Extract the M5 patch into this repository root; replace matching files.
npm install
npm run typecheck:model
npm run typecheck
npm test
npm run test:rules
npm run build
git add -A
git status
git commit -m "v3.2 milestone 5: insights, recaps, achievements and final polish"
git push origin feature/v3.2
```

`npm run test:rules` requires Java 21 and the Firebase Emulator. If an automated check fails, fix it before pushing. The Preview must use your **development Firebase** environment variables; Production must remain on your original Firebase project. Do not merge to `main` until all acceptance checks below pass.

## Comprehensive Preview acceptance checklist

### A. New insights (with an empty development user and then test logs)

- [ ] **Empty state:** a brand-new account shows no unlocked achievements, no invented time, no invented PRs, and no gym coverage. Swimming milestones require logged continuous distance.
- [ ] Navigate to **Progress → Insights** on desktop and iPhone. The page opens; horizontally scrollable tabs do not overlap.
- [ ] Log 2 Bench Press sets (Chest · Triceps). Check the selected week's heatmap shows Chest **2 primary**, Triceps **2 secondary / 1 weighted**, and other muscles unchanged.
- [ ] Delete one logged set via the confirmation dialog; ensure the heatmap, gym stats and monthly set count drop correctly after sync and refresh.
- [ ] Log a **custom exercise** with an unknown muscle tag; it is counted as uncategorized rather than assigned to an invented muscle group.
- [ ] Use **previous week / next week** on the heatmap; results follow logged session dates, including a rescheduled workout.
- [ ] Log a completed gym workout with start and end timestamps; the monthly recap shows the correct duration, active training days and completed session count. Two weigh-ins in one month produce a body-weight change; one weigh-in shows an empty value.
- [ ] Change recap month backward and forward, including December → January; the month label is correct and you cannot navigate into the future.
- [ ] Hydration-goal days count only when the **logged** sum reaches that day's goal; a partial 750 mL bottle should not count as a completed goal.
- [ ] Log **4 × 25 m with breaks**: total distance increases by 100 m, but the 50 m nonstop achievement remains locked until a 50 m continuous record is logged.
- [ ] Complete the actual goals and verify each achievement unlocks at the defined threshold; refreshing does not create phantom new goals.
- [ ] Record a heavier load for the same exercise in a later session: **new load records** increases; the first ever set for an exercise does **not** count as a new record.

### B. Milestones 1–4 regression

- [ ] Sign in with Google from the stable Vercel branch URL; refresh; existing development Firestore data returns.
- [ ] Log gym sets offline, reconnect, and verify they synchronize. Different set IDs added on two devices do not overwrite each other.
- [ ] Edit the **same set** independently on two devices; a conflict appears in the dedicated Conflicts screen and either resolution works.
- [ ] Save as Default, Restore This Workout and Restore Original Routine display their confirmations and do not delete logged history.
- [ ] Drag/reorder and search exercises; next-set navigation follows the adjusted order; logged-set deletion confirms first.
- [ ] Rest dock appears after logging, survives phone lock and refresh, and **Log next set** targets the correct exercise. It does not obscure bottom navigation or inputs.
- [ ] Calendar is a dedicated screen on desktop and available from Home/mobile header; Rest, Missed, Skipped and Completed remain distinguishable by text/icon.
- [ ] Mark a day as recovery, then undo; skip and reschedule another date; streaks, workout rings and calendar all agree.
- [ ] Log swim distances and intervals, body weight, and 250/500/**750 mL** water; confirm correct total and Firebase persistence.
- [ ] Reaching the daily hydration goal produces the one-time animation, respects reduced-motion, and does not replay on Firebase sync or refresh.
- [ ] JSON backup/export and restore preview work; importing the same backup does not silently overwrite records.

### C. Browser, PWA and release safety

- [ ] Check desktop at 1440 px and mobile at **320, 375 and 390 px**: no overflowing tabs, truncated status text, or overlapping bottom controls.
- [ ] On **iPhone Safari**, date fields (weight, hydration, reschedule) are fully inside their cards; selecting an input does not leave the page zoomed in.
- [ ] On iPhone, check both Safari and the installed Home Screen PWA: offline reopening is possible after loading while online; cached UI updates to the M5 version.
- [ ] Light/dark themes, keyboard focus, accessible text for achievement progress, and reduced-motion preferences work.
- [ ] `npm run typecheck:model`, `npm run typecheck`, `npm test`, `npm run test:rules` and `npm run build` pass; Vercel deployment reports **Ready** for `feature/v3.2`.
- [ ] Preview uses `replap-dev`; production `main` and production Firebase remain untouched. Keep a JSON backup before merging.

## Local verification in this package environment

- `tsc -p tsconfig.model.json`: **passed**.
- New Milestone 5 test source: **6/6** tests passed using a local lightweight runner, including month boundaries, weighting, deleted sets and empty-state accuracy. (Run the repository's real Vitest suite as the release gate.)
- TS/TSX syntax parsing: **33 application files, zero diagnostics**.
- CSS parse: **zero errors**.
- Representative Insights layout smoke at **320, 390 and 1440 px**: no document horizontal overflow. This is a static layout check, not a full Next.js browser test.
- Full npm install / Next.js build / Firebase Emulator / live iPhone Safari and two-device sync: **not verified here** (dependency installation timed out); verify on your machine, Vercel and Firebase development environment.

## Final merge only after approval

```powershell
cd "D:\Personal Projects\rep-and-lap"
git fetch origin
git switch main
git pull --ff-only origin main
git merge --no-ff origin/feature/v3.2 -m "Release RepLap v3.2"
git push origin main
# After verifying Production, optionally tag the release:
git tag v3.2.0
git push origin v3.2.0
```

First confirm Vercel **Production branch = main**, production environment variables point to production Firebase, and the correct domain is authorized under Firebase Authentication. On deployment, rerun critical sign-in, sync, hydration and workout logging checks. Do not publish the development Firebase project's rules or data into Production without separately reviewing the v3.2 Milestone 1–2 rule changes.
