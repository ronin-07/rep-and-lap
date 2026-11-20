# Rep & Lap — Firebase Edition

The current Rep & Lap PWA with Google sign-in and Cloud Firestore replacing Supabase. Built to deploy as a static website on GitHub Pages.

## Included

| File | Purpose |
|------|---------|
| `index.html`, `styles.css`, `app.js` | Full mobile-first app: PPL gym, swim intervals, water, body weight, progress charts, notes, rest timer, reminders, backups |
| `firebase-client.js` | Firebase Auth + Firestore adapter, modular Firebase SDK |
| `firebase-config.js` | **Paste your public Firebase web app config here** before deploying |
| `firestore.rules` | User-isolated, record-scoped Firestore rules; paste into Firebase Console → Firestore → Rules |
| `sw.js`, `manifest.webmanifest`, icons | Installable PWA and offline app-shell caching |
| `SETUP-FIREBASE.md` | Installation, auth, rules, testing and deployment steps |

**No database migration:** This build intentionally uses a new local cache key. It does not auto-import old Supabase or V2 records. An older JSON backup can still be restored explicitly in the app. Leave the old project alone until Firebase is tested.

## Data and synchronization

- Device-local editing is immediate; log entries and notes save while offline.
- After Google sign-in, each gym session, swim session, weigh-in, water entry and preferences document is sent independently to Firestore.
- Firestore persistent IndexedDB cache is enabled where supported; the app also keeps a per-user localStorage copy and pending-write list.
- Pending writes are cleared only after Firestore acknowledges them. Cross-device edits arrive through Firestore listeners.
- Records are separated by signed-in Firebase user ID. Unsigned guest data stays separate and is **not uploaded without an explicit backup/restore**.
- Sync of simultaneous edits to the **same session** uses Firestore's last-write-wins behavior. Avoid editing the same workout on two offline devices at once.
- IndexedDB and localStorage are device/browser storage, not a protected encrypted vault. Use trusted devices and export periodic JSON backups.
- Reminders are only active while the app is open or in the foreground; no closed-app push notification service is included.

## Deploy

See `SETUP-FIREBASE.md`. Copy the entire website into the root of your `ronin-07/rep-and-lap` repository and replace the existing Supabase website files. Use the **public** web config; never put service account keys, OAuth client secrets, or Admin SDK credentials in the static site.

## Verification

The app's local interface, login state changes, guest/account isolation, local write queue, mock Firestore acknowledgment and remote record merge, offline cached-account editing, and responsive navigation were exercised with browser mocks at 320px, 390px and 1440px.

**Not yet verified:** Actual Google OAuth, live Firestore permissions, install/reopen under iOS Safari, and real two-device online/offline sync. These require your Firebase configuration and deployed HTTPS site. Follow the test checklist in `SETUP-FIREBASE.md` before deleting Supabase.
