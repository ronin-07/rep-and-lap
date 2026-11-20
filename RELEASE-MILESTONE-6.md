# RepLap v3.2 — Milestone 6: Swimming Studio

**Branch:** `feature/v3.2` (Vercel Preview). **Do not merge to `main` until all checks pass.**

## What's new

Milestone 6 extends existing swim sessions with separately logged stroke and drill segments and introduces independent Learning and Advanced modes. It does not replace Firestore, the existing collection names, or your previous swim history.

1. **50 m default pool** for new sessions, with 25 m quick choice or custom 10–100 m; previously logged pool measurements are preserved. One length is one end-to-end traversal.
2. **Editable swim plans:** modify session name, focus, planned strokes/drills and planned minutes for Thursday, Friday and Saturday; move dates with the existing rescheduling control. `Save as default` asks for confirmation and affects future sessions; restoring built-in defaults preserves old sessions.
3. **Mixed stroke/drill sessions:** add Freestyle, Breaststroke, Backstroke, Butterfly and 10 drills. Each segment has practice minutes, optional difficulty (Easy, Moderate, Difficult), notes, and for strokes: a skill level and a technique checklist.
4. **Learning and Advanced:** per-stroke modes; both allow direct length entry and ± controls. Advanced adds longest nonstop distance, timed efforts, interval sets (repeats × lengths), rest in seconds and optional seconds per repeat. Switching mode preserves existing entries.
5. **Drill catalog:** Sculling, kickboard kicking, streamline glide, side kicking, breathing drill, floating, treading water, catch-up freestyle, single-arm drill, easy cooldown.
6. **Progress → Swimming:** independently filter Freestyle, Breaststroke, Backstroke and Butterfly; view distance, continuous best, practice minutes, time/pace records, learning stage and checklists, goals and recent sessions. Set individual continuous-distance goals, defaulting to 400 m for freestyle, 50 m breaststroke, 50 m backstroke and 25 m butterfly.
7. **Personal bests:** new completed-session continuous-distance and same-stroke/same-distance timed PRs enter the existing notification bell; a one-time PR celebration appears when finishing a swim.
8. **Exports and compatibility:** session records, settings, backup/restore and swimming CSV capture new details; older workout data stays readable. Existing local and Firestore document keys remain unchanged.

## How distance and records work

- **Total distance** = lengths swum outside interval sets × pool length + sum(interval repeats × lengths per repeat × pool length). Timed efforts are subsets of already logged lengths, never extra distance.
- **Continuous record** applies only to nonstop swimming and cannot exceed lengths recorded outside interval sets. It is **not inferred from interval repetitions**. Example: four separate 50 m lengths with rests yield 200 m total but **not** a 200 m continuous record unless 200 m is explicitly recorded as uninterrupted swimming and supported by nonstop lengths.
- **Timed record** applies to a stroke and an identical distance (e.g., Freestyle 100 m), so a 50 m time is never compared with a 100 m time.
- **Legacy sessions** keep historical distance and pool semantics. Unclassified old swim distance is **not assigned to a specific stroke**. Older recorded freestyle nonstop achievements remain valid.
- **Elapsed session duration** from Start/Finish includes breaks; individual practice minutes are entered per segment and are not necessarily additive to active elapsed time.

## Firebase and data migration

- No new Firestore collections or rules are introduced in M6. New swim segments and swim-plan overrides are properties within the existing `swimSessions` documents; swimming preferences remain in `settings/main`. Keep the M1/M2 v3.2 Firestore rules already published to the **development** Firebase project.
- **No destructive migration or deletion needed**. Previous data will load via backward-compatible adapters.
- Existing **swim session and template updates remain document-level synchronized**; avoid simultaneously editing the same swim session on two devices until conflict-safe swimming writes are added in a later release. Gym-set conflict protection remains intact.
- Back up the current Preview account before testing restore and sync. Continue using development Firebase variables in Vercel's **Preview** environment; leave production values and `main` alone.

## Deploy to Vercel Preview

Extract `RepLap-v3.2-Milestone-6-Patch.zip` into the **root of your existing `feature/v3.2` checkout**, after applying the Milestone 5 notification update. It updates existing source files and introduces `components/swimming/SwimLogger.tsx`, `lib/swimming.ts`, `tests/swimming.test.ts`.

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
# Extract ZIP contents into this repository's root; don't create a nested folder.
npm install
npm run typecheck:model
npm run typecheck
npm test
npm run test:rules
npm run build
# Only after checks succeed:
git add -A
git status
git commit -m "v3.2 milestone 6: multi-stroke swimming studio"
git push origin feature/v3.2
```

Open the **latest Preview** deployment from `feature/v3.2` in Vercel. Confirm the Preview environment points to `replap-dev` and the stable Preview hostname is authorized for Google authentication.

## Acceptance checklist (test on Preview)

### 1. Session setup and plans
- [ ] New swim starts with 50 m pool; 25 m and valid custom pool lengths work; invalid lengths cannot be applied.
- [ ] Previously recorded 25 m workouts keep their stored total distance after the default is changed.
- [ ] Edit the Thursday swim plan name, included strokes, drill order and planned minutes. Save as default and verify a future week's plan; older logs remain unchanged.
- [ ] Rest-day, skip, and reschedule actions still work for swim sessions; Calendar and Home show the customized plan name.

### 2. Stroke logging and technique
- [ ] In a single session, add Freestyle, Breaststroke and Sculling. Save practice minutes and Easy/Moderate/Difficult independently.
- [ ] All four strokes have usable technique checklists and learning stages. Tick a checklist step, refresh and verify it's retained.
- [ ] Switch Breaststroke from Learning to Advanced; logged checklist and minutes remain. Open a future week and verify mode preference is remembered.
- [ ] Enter lengths directly and use both + and − on an iPhone; the distance reflects the selected pool length. No Safari focus zoom, cut-off input, or fixed-bottom-nav obstruction.
- [ ] Use the drill library for kickboard, streamline glide, side kicking, sculling and breathing drills. Notes save correctly.

### 3. Interval vs continuous and personal records
- [ ] In a 50 m pool, log 4 × 1 length as intervals with 30 s rest: **200 m total**, **0 m nonstop** unless additional nonstop lengths are logged.
- [ ] Add 2 independent nonstop lengths and set 100 m as the longest continuous swim; this should raise a **100 m continuous record**, without double counting interval distance.
- [ ] Enter a timed Freestyle 100 m effort, then a faster one in another completed session. The second is a timed PR; a slower one is not.
- [ ] Check notifications and one-time PR celebration only after a completed session and correct new record; refreshing or switching devices should not generate duplicate event IDs.

### 4. Insights, safety and integration
- [ ] Progress → Swimming shows different numbers for Freestyle, Breaststroke, Backstroke and Butterfly. Stroke goals are editable and persist after refresh/login.
- [ ] New entries survive refresh, sign-out/in, Firestore synchronization and offline edits (test offline then reconnect).
- [ ] Export JSON backup and swim CSV; verify stroke names, intervals/rest, duration, difficulty and checklists. Import backup into a **disposable development account only** and verify restoration.
- [ ] Existing gym exercises, rest timer, milestones, hydration, body weight, achievements, monthly insights and Calendar still work.
- [ ] Vercel Preview is Ready; `npm run typecheck`, `npm test`, `npm run test:rules`, and `npm run build` pass; check desktop and iPhone Safari navigation, dark/light and reduced motion.

## Verification performed while packaging

- Strict model TypeScript check and syntax parsing of **50 TypeScript/TSX source files** passed.
- 10 focused Node model/runtime checks passed: 50 m and legacy 25 m pools, mixed strokes, interval/nonstop separation, per-stroke analytics, stroke targets, PB event deduplication, Firestore payload format, backup/restore and malformed interval rejection.
- CSS parsing passed.
- **Not verified:** full Next.js production build, Vitest suite, Firestore Emulator, live Google login, and physical iPhone Safari. npm package download was inaccessible in this environment; run the commands above on your machine or via CI/Vercel.

## After Preview passes

Keep any remaining UI or behavior feedback on `feature/v3.2`; after all six milestones pass a combined regression review, synchronize/back up production, publish the appropriate v3.2 production Firestore rules, merge to `main`, tag the release, and verify the production Vercel build and authentication again.
