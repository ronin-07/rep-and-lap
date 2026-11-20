# RepLap v3.2 — Activity Bell (pre-Milestone 6)

This release **builds on `RepLap-v3.2-M5-Calendar-Mobile-Nav-Complete.zip`**, including all previous v3.2 fixes. Apply the **patch** on top of the latest working `feature/v3.2` branch; do not apply it to an older milestone or to production `main`.

## What's new

- A bell in the fixed header on desktop and iPhone, with unread count capped visually at `9+`.
- A scrollable **Recent activity** panel showing the last 90 days (up to 50 events):
  - Completed gym and swimming sessions, linked to Calendar.
  - Daily hydration goals reached, linked to Log → Water.
  - Six Milestone 5 achievements when unlocked, linked to Achievements.
- Tap an item to mark it read and go to its corresponding screen.
- **Mark all read** and dismiss the panel with the close button, Escape, or a click outside.
- Empty state for an account without qualifying activity.
- Responsive layout with no horizontal overflow; keyboard focus and reduced-motion support follow existing global styles.

## Data integrity and privacy

- The notification feed is **derived from existing records**. It does not write messages to Firestore, duplicate session logs, or add a new collection.
- An ordinary set update is *not* a notification; 50 logged sets can unlock the existing **Iron Habit** achievement.
- An edited, deleted, or unfinished water log does not falsely indicate a completed daily goal.
- A record's actual workout date is shown; entering an older workout today does not relabel the date it was trained.
- Notification IDs are stable, preventing a duplicate inbox item after a refresh or Firebase snapshot. Backfilled source changes can affect when an achievement is inferred to have unlocked.
- **Read/unread state is stored in browser localStorage per account**; it is not synced between devices. The underlying activity history is synced by the existing Firebase adapter.
- This is an **in-app notification inbox**, not OS push notifications. No system permission prompt or background notification delivery has been added.
- Existing account records, Firestore rules, sign-in settings and backups are unchanged.

## Deploy to the v3.2 Preview branch

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
```

Extract `RepLap-v3.2-Activity-Notifications-Patch.zip` into the repository root, replacing files.

```powershell
npm install
npm run typecheck:model
npm run typecheck
npm test
npm run test:rules
npm run build
```

If all checks pass, inspect `git status`, then:

```powershell
git add -A
git commit -m "Add activity notification bell and milestone inbox"
git push origin feature/v3.2
```

Visit the new `feature/v3.2` deployment on Vercel Preview, still pointing at the **development Firebase project**. Do not merge to `main` until Milestone 6 and final release tests are complete.

## Manual Preview checklist

- [ ] On desktop and mobile, the bell appears beside cloud status without overlapping theme or hamburger buttons.
- [ ] Empty/brand-new account shows a friendly empty state and no unread badge.
- [ ] Completing a gym session generates one entry. Check its title, training date and Calendar destination.
- [ ] Completing a swimming session generates one entry; switching away and back does not duplicate it.
- [ ] Logging enough drinks to cross the chosen day's target generates **one** hydration entry, not one per drink. The existing water animation still triggers only on today's first crossing.
- [ ] Deleting the drink that crossed the target removes the hydration entry when the remaining total falls below the goal.
- [ ] Unlocking an achievement adds a distinct entry and opens the separate Achievements screen.
- [ ] Tap an individual entry: the unread count decreases and correct destination opens.
- [ ] Tap **Mark all read**, refresh and reopen: all items remain read on that device.
- [ ] Sign out and use a different account: no other account's notification-read state leaks.
- [ ] Confirm source activity syncs to another device; expect read/unread state to be independent on that device.
- [ ] Check iPhone Safari at narrow widths, scroll the panel, tap outside, and confirm the bottom navigation stays usable.
- [ ] Confirm Calendar backfilling, rest timer, date inputs and routine controls still work.
- [ ] Verify Vercel build, Google login, Firestore rules tests, backup export and restore.

## Verification completed in packaging environment

- `tsc -p tsconfig.model.json`: passed.
- Model smoke checks passed for real-session events, actual training dates, water-goal crossings, deletions, achievement thresholds, deduplication, and account-scoped read receipts.
- 46 TypeScript/TSX files parsed without errors.
- Chromium static-layout smoke checks at 320, 375, 390, 430, 768, and 1440 px: no horizontal overflow or clipped panel.

**Not verified here:** full Next.js dependency-based typecheck/build, Firebase Emulator rules run, live iPhone Safari interaction or two-device synchronization. Those are Preview-release gates.

## Next

Keep the planned **Milestone 6 swimming-field improvements** separate. Wait for the proposed requirements before changing swim data entry or migration behavior.
