# Rep & Lap V2

A responsive, local-first Push–Pull–Legs + Swimming tracker with a body-weight journal, goal tracking, theme toggle, adjustable working sets, progress charts, JSON/CSV exports and optional automatic Supabase cross-device synchronization with Google sign-in.

## Open locally

Open `index.html` in your browser. It saves data on the same browser/device and works without an account. For a local web server during development, use `python -m http.server 8000` from this directory and visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create or open your `rep-and-lap` repository.
2. Upload the **contents** of this folder to the repository root. `index.html` must be directly at the root, alongside `app.js`, `styles.css`, `icon.svg`, `sw.js`, `manifest.webmanifest`, and `supabase-config.js`.
3. In repository **Settings → Pages**, select **Deploy from a branch → main → /(root)**.
4. Open `https://YOUR-USERNAME.github.io/rep-and-lap/` when deployment completes.
5. On updates, replace the published files and commit. The service worker uses a versioned cache to upgrade offline resources.

## Optional cloud sync

Read `SETUP-SUPABASE.md`, execute `supabase-schema.sql` in your own Supabase project, and put only its **publishable key** and project URL in `supabase-config.js`. Google OAuth sign-in then links devices automatically; email magic-link sign-in remains as a fallback. Client sessions persist in browser storage. No server or paid GitHub hosting is required; backend free-tier limits still apply.

## Notes

- Uses browser `localStorage` for local tracking and offline access.
- First run automatically reads existing V1 local data when opened on the **same origin** (same exact website address). Browser storage isn't automatically shared between a file and a GitHub Pages URL.
- If you switch origin, use a **V1 JSON export** from the old site and **Restore backup** in V2 Settings. Your old workout data is preserved. RIR values from V1 may remain in old backups, but V2 does not display or use RIR.
- Exercise +/− controls update the current week and the default for future weeks. Existing logged weeks retain their chosen number of sets.
- Dumbbell weights are logged **per dumbbell**; volume uses displayed weight × reps (not two-dumbbell tonnage).
- The original Google Sheet remains linked, but it doesn't automatically sync to the website.
- The gradient backgrounds use CSS only; no image assets or tracking scripts are needed. Remote Supabase JS client is optional.
- Avoid simultaneous edits to the exact same session from different devices; the last update wins. Back up data regularly.
