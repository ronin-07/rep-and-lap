# RepLap v3.2 — Safari Date Control Hotfix (follow-up)

## Scope
Addresses the iPhone Safari date field protruding beyond its card or abruptly clipping, as reported on the `feature/v3.2` Preview for body-weight weigh-ins and Home rescheduling.

The date picker now uses a stable visible control with left-aligned `Nov 20, 2026`-style text and a right-aligned calendar icon. An invisible **native HTML date input** is layered over the full control, retaining the platform date picker, keyboard accessibility, existing date values and existing React `onChange` handlers. This avoids relying on WebKit's intrinsic date-value layout for sizing.

The four date pickers updated are:
- Home → Reschedule
- Calendar → Reschedule
- Log → Water date selection
- Log → Body Weight weigh-in date

No changes to Firebase, database structure, workout routines or business logic. Existing workout routines can be tested after Milestone 5, as planned.

## Deploy as a targeted patch

Copy the five changed/added files into `feature/v3.2`, preserving directory structure:

- `components/DateInput.tsx` (new)
- `components/dashboard/Dashboard.tsx`
- `components/progress/TrainingCalendar.tsx`
- `components/workout/Workout.tsx`
- `app/globals.css`

Run `npm run typecheck`, `npm test`, `npm run build`, then commit and push to `feature/v3.2` for Vercel Preview.

## iPhone Safari acceptance tests

1. Open the branch Preview; navigate to Log → Body Weight. Date field is wholly within the card, date text and calendar icon fit on one line.
2. Tap the date field anywhere, including the icon. Native date picker opens; choose another date and verify the formatted visible date updates.
3. Repeat Home → Reschedule (expand a workout) and Calendar → Reschedule; check the input is contained on a narrow screen.
4. Repeat Log → Water. Verify chosen date still changes logged water totals.
5. Scroll, rotate device, focus other fields and dismiss Safari's picker; no horizontal overflow or persistent zoom.
6. Test desktop keyboard tabbing to the date field and changing date; focus outline is visible.
7. Test light and dark themes and reduced-motion mode.

**Verification caveat:** Code is checked statically in this package; the native iOS Safari picker must be validated on your iPhone Preview. This patch does not modify or retest workout routines.
