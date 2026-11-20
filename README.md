# Rep & Lap V2.1 — Gym, Swim, Body Weight & Hydration

A mobile-friendly, local-first fitness tracker for the **3-day Push–Pull–Legs + 3-day swimming** schedule, now with a hydration journal and faster gym logging.

## What's new in V2.1

- **Water log:** quick-add 150 / 250 / 500 / 750 mL, custom amount per drink, daily history, delete mistakes, 7-day chart, and a progress ring.
- **Suggested daily beverage goals:** 2,500 mL on Mon–Wed gym days, 2,400 mL on Thu–Sat swim days, 2,000 mL on Sunday rest day. These are **illustrative, schedule-based starting points**, not medical prescriptions. The amount excludes water in food; use thirst, sweating and circumstances to guide hydration. Do **not** force yourself to hit a target.
- **Gym upgrades:** your latest previous logged exercise sets, reusable previous **weight** (without auto-claiming reps), explicit Log set button, and a configurable 1 / 1.5 / 2 / 3 minute rest timer.
- **Exercise history:** weekly top-set load chart and heaviest recorded set for each of the 18 planned exercises.
- **Sync-friendly water records:** every drink is a separate uniquely keyed record, so adding drinks on two devices is more robust than overwriting one daily total.
- Includes V2's themes, Google sign-in / Supabase option, swimming, weigh-ins, charts, PWA support, and JSON/CSV export.

**Deferred to V3:** custom water goal settings and calorie tracking. V2.1 does not include them.

## Website files to publish to GitHub Pages

Upload these seven files directly to the repository root (not a nested folder):

```
index.html
app.js
styles.css
icon.svg
manifest.webmanifest
sw.js
supabase-config.js
```

`index.html` must be at the root. Do not upload PNG previews or the ZIP itself for GitHub Pages deployment.

### Before replacing V2

1. Open V2 Settings and **Download backup** (JSON).
2. If you already use V2 Supabase sync: run `MIGRATE-V2-TO-V2.1.sql` in Supabase **SQL Editor** before adding water online. This expands the allowed record keys without deleting existing records.
3. If you have *not* set up the database yet: use `supabase-schema.sql` instead.
4. Copy the seven website files from this folder over the same files in your Git repo. **Keep your already-configured `supabase-config.js`** if it contains your actual project URL and publishable API key. This ZIP's file is a blank example.
5. Commit and push to `main`, then open your GitHub Pages URL and refresh after the deployment. The new service-worker cache name helps browsers receive V2.1; if you see V2, reload once more or clear the site's cached files.

```bash
git status
git add index.html app.js styles.css icon.svg manifest.webmanifest sw.js supabase-config.js
git commit -m "Release Rep and Lap V2.1 hydration and gym upgrades"
git push origin main
```

### Water recommendation context

The European Food Safety Authority reference of 2.5 L/day for adult men is **total water** from food plus drinks under moderate conditions. The UI's simple beverage suggestions are separate heuristic app defaults, **not** individualized from body mass, not mandatory, and may be unsuitable for individuals under medical fluid restrictions. Sweat loss, weather and exercise intensity change needs. Avoid overdrinking; drink according to thirst.

References:
- EFSA 2010: <https://doi.org/10.2903/j.efsa.2010.1459>
- Nordic Nutrition Recommendations 2023: <https://pub.norden.org/nord2023-003/energy>
- NATA 2017 on fluid replacement: <https://pmc.ncbi.nlm.nih.gov/articles/PMC5634236/>

## Data & privacy

- Records are saved locally in your browser immediately. **Google sign-in requires your own Supabase project to be configured.** The website does not automatically communicate with Google Sheets.
- Signed-in users automatically retry cloud sync online on changes, returning to the app, and periodic refresh. Browser local storage keeps a backup and lets you log offline.
- Every water entry has its own record key in Supabase; deletion creates a synced tombstone to prevent deleted entries reappearing.
- Remote sync uses record-level **last-write-wins** for training sessions, weight entries and preferences. Avoid editing the exact same exercise on multiple devices simultaneously. A real-time conflict resolution system is a future enhancement.
- Do not place Supabase secret/service-role keys, Google OAuth client secrets, or database passwords in `supabase-config.js`. Only the **publishable key** and project URL belong there.
- Backup using Settings → Download backup before reinstalling, switching domains, or clearing browser data.

## Local development

Open `index.html` in your browser, or run a simple local static server, e.g. `python -m http.server 8000`. Google OAuth redirects should be tested on the published HTTPS site.

For Google OAuth, see `SETUP-SUPABASE.md`.
