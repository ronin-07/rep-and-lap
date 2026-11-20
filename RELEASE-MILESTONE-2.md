# RepLap v3.2 — Milestone 2 (Workout Flow)

**Preview-only.** This builds on the Milestone 1 data-safety implementation. Apply the patch to `feature/v3.2`, not to `main`.

## What's new

- **Mobile rest dock:** Completing a set starts a timestamp-based rest timer, anchored above the four-tab bottom navigation. It uses wall-clock timestamps rather than relying on background JavaScript. Extend by 30 seconds, skip, or dismiss. When rest expires, tap **Log next set** to move to and focus the next unfinished set. The timer is saved per signed-in account in local browser storage and can be restored after refresh or phone lock. No locked-screen push alert is promised. A completed final set does not start another timer.
- **Previous set:** Each set shows the latest comparable previous set. **Copy previous** fills both weight and reps and leaves them unlogged for review. The next-set action only autofills fields if both are empty. Nothing is logged automatically.
- **Effort tracking:** Settings → Effort tracking offers Off, RIR (0–4+) or RPE (6–10 in 0.5 increments). Ratings are optional and stored on individual gym set documents for conflict-safe sync.
- **Recovery check-in:** After finishing a gym or swim workout, an optional check-in asks for session RPE, soreness, and a takeaway. Existing session notes remain available.
- **Conflict review:** A new **Conflicts** screen shows local and cloud set versions side-by-side, with **Keep my edit** or **Use cloud**. A non-blocking notification and top-bar badge appear when a conflict is detected. Full conflict resolution is no longer buried in Settings.
- **Mobile polish:** The rest dock avoids the bottom navigation and hides while the iPhone keyboard is open. Inputs remain 16px or larger to prevent Safari autozoom.

## Firebase development rules update REQUIRED

**Publish the included `firestore.rules` to the `replap-dev` development project BEFORE trying to sync RIR/RPE sets.** It extends Milestone 1's `gymSets` whitelist to permit `rir` and `rpe` values, while keeping owner checks and monotonic revisions. All previous rules and collection paths are preserved. **Do not publish these development rules to the production Firebase project yet.**

No destructive Firestore migration and no data reset are required. Optional fields are added to the existing v3 data format. Existing workouts, sessions and set IDs remain compatible.

## Apply on long-lived branch

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
# Extract RepLap-V3.2-Milestone-2-Patch.zip into the repository root, replacing matching files.
git status
npm install
npm run typecheck
npm test
npm run test:rules  # needs Java + Firebase Emulator
npm run build
git add -A
git commit -m "v3.2 milestone 2: fluid workout flow and conflict review"
git push origin feature/v3.2
```

Vercel should create a new Preview build for `feature/v3.2`. Keep Production environment variables on your original Firebase project and Preview variables on `replap-dev`.

## Required Preview checks

1. **Basic navigation:** Open Preview in a mobile viewport. Home, Workout, Progress, Profile and Settings load normally. Review conflicts appears only when pending. Four mobile tabs and rest dock never overlap.
2. **Rest timer:** Workout → Gym → enter valid kg/reps → **Log set**. A timer appears just above bottom navigation. Test +30 seconds and Skip. Repeat, lock phone for longer than timer duration, unlock and return: it should show **Rest complete**, not restart. Refresh mid-rest: the countdown should remain accurate. Tap **Log next set**; it should scroll to the next unfinished set, without logging it. Complete all planned sets: no new countdown should start.
3. **Previous data:** Log a comparable exercise in a previous week (or use test fixtures), choose the current week, tap **Copy previous**. Confirm both kg and reps are filled, and `Log set` is still required. Tap next-set when blank; it may prefill previous results, but must never overwrite entered values.
4. **Effort and recovery:** Settings → choose RIR, log a set with value 2, refresh and check it persists. Switch to RPE, record 8.5, refresh and verify. Finish the workout and confirm the recovery dialog; set session effort/soreness and a note. Verify in Session notes and export a JSON backup.
5. **Firestore:** In the `replap-dev` Firebase Console, check `users/{uid}/gymSets/{setKey}` for optional `rir`/`rpe` and the correct owner, set ID and increasing revision. Session notes remain in `gymSessions`/`swimSessions` payloads. Security rules should reject invalid values and cross-user access.
6. **Conflict popup:** On Device A open the same logged set, go offline, edit it. On Device B (online), edit that exact set. Reconnect A. A non-modal prompt and a top-bar badge should offer **Review**, opening **Conflicts**. Choose Use cloud, then repeat and choose Keep my edit. Both must resolve. Conflict details should not be a section in Settings.
7. **Regression:** Log swim, water (+750 mL), weight, export JSON and CSV, change theme, sign out/in, check offline local edits sync after reconnect. Test iPhone Safari (installed PWA as well, if available), including the keyboard and safe areas.

## Verification performed in the build workspace

- All project TypeScript/TSX files passed TypeScript's **syntax parsing**.
- Strict TypeScript checking passed for the **pure data-model modules**.
- Direct runtime assertions passed for timestamp rest countdown, last-set behavior, previous history fallback and effort validation.
- **Not verified here:** full Next.js production build, React runtime UI, Firebase Emulator rules tests, real multi-device conflicts, and physical-device Safari. The environment could not install npm dependencies. Verify these in your GitHub Actions/Vercel Preview before considering this milestone accepted.

## Not part of Milestone 2

Rest-day calendar and custom routine scheduling (M3), progressive overload suggestions and advanced swimming/weekly training analytics (M4), and monthly recaps/muscle heatmaps (M5). No merge to `main` yet.
