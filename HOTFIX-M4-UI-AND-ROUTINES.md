# RepLap v3.2 — post-Milestone 4 UI / routine hotfix

This patch is **only** for the `feature/v3.2` branch after Milestone 4. Keep `main` in production until Milestone 5 and final regression testing.

## What changed

- **Home plan cards:** Every planned, completed, missed, rest/recovery, and skipped workout uses the same card structure, icon+text status pill, high contrast, and additional spacing. Recovery/Skipped remain primary headings. Reschedule is an expandable control.
- **Hydration:** The custom amount form aligns input/button on desktop and stacks the **full-width Add drink** button on mobile. Quick Add **+750 mL** remains emphasized.
- **iPhone dates:** Tightened intrinsic widths, `min-inline-size`, form-grid containment, and date control layout without disabling Safari's native date picker or pinch-to-zoom.
- **Routine actions:**
  - **Save as default** requires a confirmation, is disabled when the current list already matches the default, and changes future templates only.
  - **Restore this workout** requires a confirmation with an add/remove preview, preserves logged sets (including substituted exercises), and is disabled for completed workouts.
  - **Restore original RepLap routine** lives under **Advanced routine actions**, requires a confirmation, resets only the template for future sessions, and is disabled when already original.
  - Existing recorded sessions are frozen before saved templates change, to prevent a history display changing retroactively.
- **Calendar mobile:** Calendar remains a dedicated page; open it from Home or the mobile header menu. Includes **Back to Home**. The mobile bottom nav remains Home / Workout / Progress / Profile. Desktop sidebar still has Calendar.

## Apply the update

In PowerShell:

```powershell
cd "D:\Personal Projects\rep-and-lap"
git switch feature/v3.2
git pull --ff-only origin feature/v3.2
```

Extract the ZIP named `RepLap-v3.2-M4-Hotfix-Patch.zip` into the **repository root**, replacing the matching files. The patch does not include `.env.local`, Firebase project configuration, or `firestore.rules`.

```powershell
npm install
npm run typecheck:model
npm run typecheck
npm test
npm run test:rules
npm run build
```

`test:rules` requires the Firebase emulator and Java. Inspect any errors before pushing.

```powershell
git add -A
git status
git commit -m "v3.2: refine Home cards, mobile forms, routine actions and calendar"
git push origin feature/v3.2
```

Wait for **Vercel Preview** to show **Ready**. Do not merge to `main`.

## Manual acceptance checks

### Desktop

- Home: make a day **Rest**, another **Skipped**, leave one **Missed**, complete another. Check icon, label and card alignment match, and reschedule expands only on demand.
- Workout > Gym > Edit routine: change an exercise and **Save as default**. Confirm the modal displays, Cancel does nothing, and Confirm saves the new default for future sessions.
- Log at least two sets of an exercise added just for this workout. Select **Restore this workout**: review add/remove preview, confirm, and verify the logged exercise and both sets are still visible.
- Finish the workout. The restore-current-session action must be disabled, while a saved-default reset can still be performed.
- Open **Advanced routine actions** and restore the original RepLap routine. Check previous sessions did not change; open a new future week to see the original built-in routine.
- Confirm **Calendar** is in the desktop sidebar and no Calendar tab appears in Progress.

### iPhone Safari (narrow viewport)

- Home statuses and action buttons must have consistent spacing, no horizontal scroll, and visible labels without relying only on colors.
- Workout > Water: **+750 mL** logs 750 mL; enter 330 mL and verify the custom input is directly above a full-width Add drink button.
- Workout > Body weight: the native date field remains inside its card. Open and close the date picker, then tap weight and notes inputs. No persistent Safari zoom or horizontal overflow.
- Workout > Gym: open routine confirmations; check the modal fits the viewport and can be canceled.
- Open **Calendar** using the header menu, and from the Home shortcut. Verify the **Back to Home** action. Bottom navigation must remain four tabs.
- Confirm all edits persist after refresh, and Google login / Firebase sync still work on the `replap-dev` Preview project.

## Verification accomplished in packaging environment

- Global TypeScript strict typecheck for `tsconfig.model.json`: **passed**.
- TypeScript/TSX syntax parsing across all source/test files: **passed**.
- Targeted compiled model assertions: default saves, restoring original default, and restoring logged extras without losing sets: **passed**.
- ZIP archives: verified by ZIP integrity checks.

**Not verified here:** a complete `next build`, Firestore emulator test, Vercel Preview runtime or actual iPhone Safari behavior; this environment does not have the installed npm dependencies. Those remain release gates.

**Database impact:** No new Firebase collections or rules changes. Template preferences and session overrides still use the existing Firestore document-level sync, so simultaneous multi-device edits of the same routine may conflict; avoid concurrent routine editing until future conflict handling covers these records.
