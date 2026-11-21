# RepLap v3.2 — Calendar Completion Date + Mobile Navigation Patch

Target: `feature/v3.2` **after** Milestone 5. Do not merge into `main` yet; Milestone 6 is planned.

## Changes

- Marking an unfinished workout complete **manually** now opens a date chooser: **Scheduled date**, **Today**, or **Another date**. A future completion date is rejected. Rest/skipped statuses are explained before replacement.
- Finishing a workout with the **active timer** automatically records the actual local finish date and retains the end timestamp.
- Scheduled date, original plan date, timestamp when marked complete, and actual training date are distinct. The new optional `completedOn` field holds the local `YYYY-MM-DD` training date. No data deletion or Firestore rules changes are needed.
- The calendar shows completed sessions on their **actual** date. If that differs from the scheduled date, the scheduled day contains a neutral history reference with a link to the completion. It **does not** add a second completion to statistics.
- Completed calendar entries now offer **Edit completion date** for correcting an old entry.
- The technical label `Original plan week: YYYY-MM-DD` was replaced by useful dates: **Completed**, **Scheduled for**, and **Originally planned** (when relevant).
- On phones, **Training Insights** and **Achievements** are separate destinations in the hamburger menu. **Insights** is hidden from the mobile Progress tab row. Achievements has its own screen and appears in the desktop sidebar; desktop Progress retains its Insights analytics tab. Mobile bottom navigation stays four items.
- Updated the PWA cache revision to pick up new scripts.

## Deploy to Vercel Preview

1. Ensure the latest Milestone 5 patch and all earlier hotfixes are on `feature/v3.2`.
2. Extract the patch ZIP into the **repository root**, replacing only matching files.
3. Run:

```powershell
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
npm run typecheck:model
npm run typecheck
npm test
npm run test:rules
npm run build
git add -A
git status
git commit -m "Fix calendar completion dates and separate mobile achievements"
git push origin feature/v3.2
```

4. Use the stable branch Preview domain, signed into the `replap-dev` Firebase project.
5. Do not modify production Firebase rules or merge `main` before your later Milestone 6 work and final tests.

## Acceptance checklist

- [ ] Complete a previous Thursday swim on Friday; choose **Scheduled date**. It stays on Thursday and counts once.
- [ ] Repeat another session and choose **Today**. It counts on Friday; Thursday shows "Planned here — completed on Friday". Clicking the reference opens Friday.
- [ ] Choose **Another date**. A past date works and a future date is rejected.
- [ ] On a completed calendar entry, select **Edit completion date**, choose another past date and verify both calendar and monthly/weekly totals update correctly.
- [ ] Reschedule an uncompleted session across weeks, complete it, and check that **originally planned**, **scheduled for**, and **completed** are all correct; plan adherence stays in the original plan week.
- [ ] Start/finish a timed workout; actual completion date is automatic and the duration survives refresh.
- [ ] Sign out/in and reload; the selected actual date persists through Firestore and JSON export/restore.
- [ ] On iPhone, open hamburger menu: **Training Insights** and **Achievements** are distinct; both open full screens with Back to Progress.
- [ ] Mobile Progress tabs do not show a redundant Insights tab. Desktop still allows Progress → Insights and has an Achievements destination.
- [ ] Check Safari picker alignment and small viewport for the new completion dialog.
- [ ] Retest rest timer, gym and swim logging, rest/skipped days, conflict review, water and weight logging, and PWA reload.

## Validation performed here

- Model-only TypeScript typecheck passed.
- TypeScript / TSX source parsing passed.
- Focused runtime tests passed for date backfill, actual-vs-scheduled cross-month accounting, legacy fallback, backup and Firestore round-trips, and same-day multiple completions.
- Full Next.js build, Firebase emulator and real Safari Preview tests still require the Vercel/local environment with installed dependencies.
