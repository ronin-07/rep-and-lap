# RepLap v3.2 — Pre–Milestone 5 polish hotfix

Apply to the existing `feature/v3.2` branch **after** the Safari date-field hotfix. This change does not modify Firebase schemas or rules.

## Changes

- **Body Weight date (Safari):** Fix a CSS selector collision: `.weigh-date-field>span` unintentionally styled the `DateInput` wrapper as a label and disabled its flex layout. Style only the caption, and explicitly preserve the date wrapper's flex alignment. Other date controls are unchanged.
- **Home schedule hover/focus:** Use a single roomy outer-card emphasis instead of the tight inner highlight. Increase padding and action spacing; provide keyboard focus styling and reduced-motion fallback.
- **Mobile and desktop navigation:** Rename `Workout` destination to **Log**, with **Training log** as the screen title. Route keys and tracking behavior remain the same.
- **Hydration achievement:** Trigger only when a drink logged *on this device* crosses today's daily water goal. Show a water ripple/droplet animation and playful text. One celebration per account per calendar day, stored in localStorage. No celebration during Firebase snapshot replay or on opening the site. Reduced-motion fallback included.

## Verify in Vercel Preview

1. In iPhone Safari, open **Log → Body weight**. Date field should be a correctly rounded, aligned component with visible date and calendar icon. Tap to open native picker and change date.
2. Verify rescheduling and water date fields still look and work normally.
3. Hover the Home schedule cards on desktop. Only the outer card should highlight; text and status pills stay legible. Navigate using keyboard Tab/Enter and check focus.
4. Verify the mobile tab reads **Log** and desktop sidebar uses **Log**. Your workout data, tracking tabs and features remain unchanged.
5. On a fresh local test day with 0 mL, tap +750 mL until you cross the daily goal. Expect **one** water celebration. Refresh, log another drink and confirm it does not repeat. Log a historical date and confirm it doesn't celebrate. Use DevTools prefers-reduced-motion to verify animations stop.
6. Retest Firebase sync, backup, set logs and recent milestones. Production remains untouched.

## Rollout

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
# Extract patch files into repository root
git add components/AppShell.tsx hooks/useTrainer.ts app/globals.css PRE-M5-HOTFIX.md
git commit -m "Polish mobile date field, schedule cards and hydration celebration"
git push origin feature/v3.2
```

Review the diff before commit. Do not merge to `main` until iPhone and Preview checks pass.
