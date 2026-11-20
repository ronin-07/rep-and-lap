# Rep & Lap — Training Tracker (V2.3 refinements)

A mobile-first tracker for Push / Pull / Legs, swimming, hydration and body-weight progress. It saves workouts as you type, supports offline use after the first online visit, and can sync across devices with Google sign-in via Supabase.

## What changed

- Refreshed in-app wording, with roadmap and development filler removed.
- **Installable PWA:** 192 px and 512 px app icons, maskable icon, manifest, home-screen launch, and Install control under Profile → Settings.
- **Offline-first:** app shell cached by a service worker on HTTPS or localhost; workout edits saved to browser storage immediately, even without connectivity.
- **Sync indicators:** Saved locally, Syncing…, Synced, or Needs attention. Pending local edits are recorded until cloud confirmation; reconnection triggers a retry.
- **Autosave:** every weight/reps input, swimming metric and session note saves on input. `Log set` still marks a set complete and starts the rest timer; it is not a separate save operation.
- **Session notes:** how you felt, discomfort, technique cues, and other observations for every gym or swim day; notes are included in backups and cloud session JSON.
- **Backup and restore:** JSON download and import; restore first creates a safety backup of the current local data. CSV exports include session notes.
- **Workout reminders:** opt-in daily reminders on scheduled workout days at a chosen time, available while the app is open. Browser notification permission is optional; in-app reminders work without it.

## GitHub Pages deployment

1. **Before updating:** open your current Rep & Lap app → Profile → Settings → Download backup.
2. Copy the files below into the **root** of your `rep-and-lap` repository (not a nested folder):

   ```text
   index.html
   app.js
   styles.css
   sw.js
   manifest.webmanifest
   icon.svg
   icon-192.png
   icon-512.png
   icon-maskable-512.png
   ```

3. **Keep your existing configured `supabase-config.js`.** The ZIP includes a blank example only for fresh installations. The project URL and publishable/anon key are safe in a public frontend when RLS is configured correctly. Never publish a database password, service-role or secret key, or Google OAuth client secret.
4. If already using the V2.1+ `training_records` table (with `water:` record keys), **no SQL migration is needed**. Session notes and reminder preferences are stored inside existing JSON payloads.
5. Commit and push:

   ```powershell
   git add index.html app.js styles.css sw.js manifest.webmanifest icon.svg icon-192.png icon-512.png icon-maskable-512.png
   git commit -m "Improve offline tracking, reminders and workout notes"
   git push origin main
   ```

6. Open the HTTPS GitHub Pages site. After the new service worker activates, reopen or refresh the app. In Settings, select **Install app** when available. On iOS Safari, choose **Share → Add to Home Screen**.

## Sync status meanings

| Indicator | Meaning |
|---|---|
| Saved locally | Stored in this browser. If signed in, new changes are waiting for network sync. |
| Syncing… | Uploading/reconciling records in Supabase. |
| Synced | Connected records have finished syncing. |
| Needs attention | Local storage failure or cloud error. Open Settings, check connectivity, and use Sync now. |

The browser retains an editable queue of pending changes and retries on reconnect, when the app becomes visible, and periodically. The app does **not** support real-time simultaneous editing of the same workout from multiple devices; the whole session is a single record and later writes can overwrite earlier edits. Export backups regularly.

### Install and offline expectations

- First load, installation, and new updates require a network connection and HTTPS (GitHub Pages supplies HTTPS).
- Later visits can open the cached app shell offline. Workout logs are retained in **browser storage on that device**, so clearing site data may erase records that have not synced.
- Without sign-in, records remain only on the device. Cross-device sync requires the same Google account on each device and an existing working Supabase setup.
- The current reminder is *not* a push-notification service. Alerts are checked on launch, return to the tab, and while the app remains open; they cannot reliably appear when the app is fully closed.
- The standalone HTML preview can run locally but cannot be installed as a PWA from `file://` and does not include cloud configuration.

## Database

The existing `supabase-schema.sql` is for **new** Supabase projects. Existing earlier projects can use `MIGRATE-V2-TO-V2.1.sql` if water record keys were not enabled. Do not rerun an unnecessary migration just to enable PWA/reminders/notes.

## Testing

- JavaScript syntax passed Node checks for both the app and service worker.
- Tested app UI at desktop, 390 px and 320 px widths, including set entry, session notes, autosave, reminders, backup export/restore, and horizontal overflow.
- Tested simulated disconnected editing with stored data reloaded; cloud status/queue transitions tested using a mocked Supabase client.
- **Not verified from this environment:** real service-worker-controlled offline reload on HTTPS, installation on iOS/Android, Google OAuth with your project, and live Supabase writes. Test these on your deployed GitHub Pages URL.
