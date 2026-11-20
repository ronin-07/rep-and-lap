# Rep & Lap — V2.2 + V2.3

A mobile-first fitness tracker for **three gym days (Push / Pull / Legs)**, **three swimming sessions**, daily water intake and body weight. Works offline-first in your browser, with optional authenticated automatic synchronization using Supabase and Google sign-in.

## What's in this combined release

### V2.2 — Visual redesign

- **Premium dark-first dashboard** with deep navy, subtle purple/teal gradients, restrained glass cards, and a consistent light theme toggle.
- **Better information hierarchy:** the chosen day's workout, a 6-session weekly completion ring, quick water/gym/weight snapshots, weekly sessions, recent PRs, and a seven-week activity heatmap.
- **Four primary mobile tabs:** Home · Workout · Progress · Profile. Desktop keeps a sidebar with these sections plus direct links to the detailed trackers.
- **Microanimations:** progress-ring and chart reveals, hover/tap feedback, a light confetti celebration for completing workouts, and a trophy celebration for beating an existing heaviest-set PR. Dismiss with the button or Escape.
- Respects `prefers-reduced-motion`; no autoplay sound, background video, or accounts required for local use.

### V2.3 — Swimming and weight insights

- **Swimming:** 25 m / 50 m pool-size selector, one-tap length counter, automatic total distance based on logged lengths, and structured interval sets (`repeats × lengths`, rest seconds).
- Intervals are logged **separately** from the session's total distance to avoid accidental double-counting. The session's total distance can still be typed manually; the length counter updates it when used.
- **Body weight:** 7-day calendar-window rolling average on the weight chart (uses available weigh-ins within the previous seven days), plus existing weigh-in history and target weight.
- Keeps breaststroke, sculling, treading water, swimming milestones and all existing V2.1 functionality.

### Existing V2.1 features retained

- Push / Pull / Legs program, flexible set counts, logged weight × reps for each set, previous workout comparison, rest timer, exercise history/PRs.
- Swimming log/drill checklist, body-weight log, water quick-add and schedule-based suggested drink amounts, data backup and CSV exports.
- Optional Google OAuth through Supabase, automatic online sync and local-first storage.

**Still deferred to V3:** custom water-goal controls and calorie/macro tracking. No user-configurable water goal or calorie tracker is included here.

## Publish to GitHub Pages

For a fresh deployment, place **these seven files in the repository root**, not in an extra folder:

```
index.html
app.js
styles.css
icon.svg
manifest.webmanifest
sw.js
supabase-config.js
```

The ZIP also includes `README.md`, `SETUP-SUPABASE.md`, `supabase-schema.sql`, and `MIGRATE-V2-TO-V2.1.sql` as optional setup documentation. These are not required to serve the site.

1. On your current live Rep & Lap site, open **Profile → Settings → Download backup** and save your JSON backup before upgrading.
2. If Supabase worked in V2.1, **no additional SQL migration is required** for the V2.2/V2.3 features. The swimming pool/interval fields are stored inside the existing session JSON records.
3. Unzip the package into your local Git repository. **Keep your existing configured `supabase-config.js`**; the ZIP includes an intentionally blank example and will otherwise disconnect cloud sync.
4. Commit and push:

   ```bash
   git add index.html app.js styles.css icon.svg manifest.webmanifest sw.js
   git commit -m "Release Rep and Lap V2.2 and V2.3"
   git push origin main
   ```

5. Wait for GitHub Pages to deploy, refresh once, then verify the four bottom tabs and the new home screen.

**Do not publish secrets.** Only the Supabase Project URL and **publishable** key may go in `supabase-config.js`. Database passwords, Google OAuth client secrets and Supabase secret/service-role keys do not belong in static files. The existing RLS policies are required for secure access.

### If you are upgrading from V2 or V1 instead

Run `MIGRATE-V2-TO-V2.1.sql` in Supabase SQL Editor if you have an earlier database schema without water record keys. If starting from scratch, run `supabase-schema.sql`. Follow the separate `SETUP-SUPABASE.md` for Google OAuth configuration.

## Local first & synchronization behavior

- **No login needed:** data is kept in the current browser's local storage.
- **Same workout history across devices:** configure Supabase, sign in with the same Google account on each browser, and permit network access. The app syncs on data changes, returning online, app visibility and periodic checks.
- **Sync is not truly real-time multi-user collaboration:** two devices editing the exact same session at nearly the same time can overwrite each other (last-write-wins). Export JSON backups regularly.
- Local storage is tied to the website origin; opening a standalone `file://` version, a localhost copy and the live GitHub Pages site creates separate browser storage.
- A static GitHub Pages site cannot issue secure `HttpOnly` cookie sessions itself; Supabase JS persists and refreshes its auth session in browser storage for this setup.

## Health and training note

The daily water amounts are general app suggestions, not personal fluid prescriptions. Drink according to thirst and consider heat, exercise and sweat. The chart's weight average uses the last **seven calendar days**, not the last seven logged measurements. Swimming deep-water skills should be practised with suitable supervision.

## Testing

Local browser interaction tests covered: navigation, mobile layouts, set entry and completion, previous-load persistence, extra sets, timer, PR celebration, water entries, pool length / distance and interval entries, weigh-ins, light/dark preference, and reduced-motion mode. Layout checks were performed at 320, 390, 768, 1024 and 1440 px without page-level horizontal overflow.

Live Google OAuth and Supabase synchronization still need to be verified against your configured Supabase project and deployed GitHub Pages domain.
