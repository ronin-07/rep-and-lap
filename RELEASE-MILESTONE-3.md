# RepLap v3.2 — Milestone 3: Flexible scheduling and routines

**For `feature/v3.2` Vercel Preview only. Do not merge into `main` until all five milestones are accepted.**

## Features

- **Mark as Rest Day, Skip, Restore:** On the Dashboard's weekly schedule and in Progress → Calendar. Rest is deliberately neutral in streak calculations; Skip records an uncompleted training commitment. Neither counts as a completed activity-ring session. Undo restores the scheduled workout.
- **Calendar:** Monday-first monthly calendar, with planned, completed, rest and skipped statuses. Sessions are shown on their current planned date; completed workouts use their actual finish date. Includes carried-over sessions from other plan weeks and direct actions to open, reschedule, rest, skip or restore.
- **Rescheduling:** Keeps the original `{week, day}` record identity and the logged sets. Moving restores a rest/skipped session to planned. Shift remaining workouts forward ignores rest/skipped/finished sessions; completed sessions and active timers cannot be moved.
- **Flexible gym routines:** Workout → Gym → **Edit routine**. Reorder exercises, substitute from a curated list, add a custom movement or remove an exercise. All changes are scoped to the selected training-week session unless **Save as default** is selected. **Reset this session** and **Reset saved default** are available. Exercise logs are not deleted when a movement is removed from the active plan.
- **Set flow:** Existing next-set rest timer follows the custom exercise order, including substituted movements. An active rest timer referring to a removed movement is dismissed.
- **Consistency:** Current/best training-day streaks now ignore deliberate rest days and dates without scheduled activity. Skipped or overdue scheduled sessions break the streak; unfinished sessions today do not yet break it. Weekly plan adherence excludes declared rest days from the denominator.
- **Backup and compatibility:** Data schema v4 adds optional `scheduleStatus`, `routineOverrides` in the existing per-day session payload, and `routineTemplates` in the existing preferences payload. Data from schema v1–v3 remains supported. Import preview validates the new fields; non-destructive merge preserves existing session records and does not overwrite saved templates.

## Data model / Firestore

No new Firestore collections or rules changes are required: the existing owner-only `gymSessions`, `swimSessions`, and `settings/main` document envelopes contain map payloads. **Keep the Milestone 2 development `firestore.rules` installed; do not relax rules.** `gymSets` continues its separate per-set version checks.

**Limitations:** Per-session schedule changes and saved templates use their existing document-level synchronization and do not yet have set-style revision-conflict resolution. Avoid simultaneous edits to the *same routine or schedule* from multiple devices. A renamed/substituted exercise is treated as a distinct exercise for strength history; its prior sets remain in storage but may be hidden from the active workout layout. Changes to template routines affect future sessions, unless a session already has its own frozen exercise list. Rest days are assigned to planned training sessions, not to arbitrary dates with no scheduled training (Sunday is already an implicit rest day).

## Apply to the existing development branch

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
# Extract RepLap-V3.2-Milestone-3-Patch.zip into the repository ROOT.
# Replace matching files and keep your local .env.local untouched.

npm install
npm run typecheck
npm run typecheck:model
npm test
npm run test:rules   # requires Firebase Emulator + Java
npm run build

git status
git add -A
git commit -m "v3.2 milestone 3: flexible schedule and routines"
git push origin feature/v3.2
```

Vercel should automatically build a **Preview** from the same `feature/v3.2` branch. Use the stable branch Preview hostname already authorized in Firebase Authentication, with the `replap-dev` Firebase project. Leave `main` and Production Firebase unchanged.

## Preview acceptance tests

1. **Calendar:** Progress → Calendar, navigate previous/next months, click a weekday and Sunday. Verify Monday-first calendar, today highlight, correct statuses, no cramped or overflowing cells at 320–390px mobile widths.
2. **Rest day:** Home → weekly schedule → mark Tuesday as Rest. Its badge changes; it disappears as a due workout, is marked as rest in the calendar and does not reduce your current training streak. Undo Rest restores Tuesday. Do not expect the activity ring to count it.
3. **Skip:** Mark Thursday Skipped; it shows a skipped indicator in both Home and Calendar and is excluded from the active-workout shortcut. Undo works. Skips do not count toward completed workouts and are *not* exempted from adherence like planned rest days.
4. **Reschedule:** Move a missed Monday workout to the next Thursday, even across training weeks. Check the calendar for its new date, then navigate to Workout. Existing sets and notes should be unchanged. Mark Rest and Move the same session: Move should restore it to a scheduled session. Try moving a completed or running session: it should be refused.
5. **Shift:** In a past week with missed sessions, use Shift remaining sessions. Explicitly Rest/Skipped dates and finished workouts should not be shifted. Check cross-week dates in the calendar.
6. **Custom routine:** Workout → Gym → Edit routine → reorder, add an exercise, swap one for a preset, add a custom exercise, then remove one. Log sets and confirm the rest-timer's next-set target follows the new order. Saved sets should remain under the original exercise names after removing/substituting.
7. **Template:** Save a changed Push workout as default, switch to a new future week and confirm the list follows your template. Reset the saved default; restore the previous standard routine. Changing one session must not mutate previously logged sessions.
8. **Cloud round-trip:** Sign in to `replap-dev`, mark a session Rest, save an exercise customization, refresh, sign out/in, and confirm both persist. In development Firestore inspect `gymSessions` / `swimSessions` payload `scheduleStatus` / `routineOverride` and `settings/main` payload `routineTemplates`.
9. **Backup:** Export JSON, inspect preview, test Merge into a clean guest account in a separate browser profile. Check rest statuses and routine templates survive. A second Merge should report duplicates instead of overwriting existing sessions.
10. **Regression:** Retest Milestone 1 set-level conflicts and Milestone 2 rest dock, RIR/RPE, Google sign-in, swimming, hydration +750 mL, body weight, mobile Safari keyboard, and cloud/offline data persistence.

## Verification performed in package creation

- Strict TypeScript checking passed for the pure scheduling, routine, storage, backup, metrics, and workout-flow data-model modules.
- All 37 TypeScript/TSX files passed syntax parsing.
- A local, dependency-free test runner executed **37/37 pure-model test cases successfully** (including the existing data-safety and workout-flow cases and new calendar/routine coverage). This is not a substitute for running Vitest in the Vercel/GitHub Actions environment.
- One inherited Milestone 2 rest-timer test fixture incorrectly wrote sets into an uninitialized gym log; its setup was corrected.
- **Not yet verified:** full Next.js build, installed browser/UI testing, Firebase Emulator rules tests, live Preview deployment, real multi-device schedule edits. Run the commands and Preview tests above before accepting this milestone.

## Upcoming

- **Milestone 4:** progressive-overload recommendations, weekly training-time stats and swimming progression analytics.
- **Milestone 5:** muscle-group heatmap, monthly recap and final UI polish.
