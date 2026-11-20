# Rep & Lap — Firebase setup and GitHub Pages deployment

## 1. Obtain the *public* Firebase web configuration

Firebase Console → Project settings (gear) → **General** → **Your apps** → select your registered web app → **SDK setup and configuration** → **Config**.

Open `firebase-config.js` in your extracted Rep & Lap folder and replace the blank strings:

```js
window.REP_AND_LAP_FIREBASE = {
  apiKey: 'AIza...YOUR-PUBLIC-KEY',
  authDomain: 'YOUR-PROJECT-ID.firebaseapp.com',
  projectId: 'YOUR-PROJECT-ID',
  appId: '1:123456789:web:abcd1234',
  messagingSenderId: '123456789'
};
```

Use the **actual values from your Firebase project** (do not copy the illustration verbatim). The Firebase web `apiKey` and these identifiers are public frontend configuration values; client-side applications must expose them. Firestore Rules and Firebase Auth secure the data.

**NEVER upload** service-account JSON files, Admin SDK private keys, Cloud API secrets, Supabase service-role keys, database passwords or Google OAuth client secrets. You do not need any of those for GitHub Pages + Firebase Google sign-in.

## 2. Firestore Rules

Go to Firebase Console → Build → Firestore Database → Rules. Replace the initial rules with the contents of `firestore.rules` and click **Publish**. These rules restrict access to `users/{firebaseUid}` subcollections and validate each record's expected key type and basic shape. `weeklyChecklists` is not a separate collection: each completed session is stored with its corresponding gym/swim session document.

The frontend uses these paths:

- `users/{uid}/gymSessions/{sessionKey}`
- `users/{uid}/swimSessions/{sessionKey}`
- `users/{uid}/weighIns/{dateKey}`
- `users/{uid}/waterEntries/{entryKey}`
- `users/{uid}/settings/main`

Run Firestore Rules Playground tests: as user A, a read/write in A's matching collection should succeed, while user B or unauthenticated users should be denied.

## 3. Authentication

Firebase Console → Authentication → Sign-in method: **Google enabled**.

Firebase Console → Authentication → Settings → Authorized domains: add `ronin-07.github.io` (the HOST only, not a `/rep-and-lap` path). Use HTTPS after deployment. `localhost` can be added for local testing if required.

Google pop-up auth is used so the app works on GitHub Pages without a Firebase Hosting redirect proxy. On Safari, allow popups for the website if asked. In a home-screen PWA, browser auth behavior can vary; verify on your actual iPhone.

## 4. Replace the GitHub Pages files

1. Extract this ZIP to your local `rep-and-lap` repository root. `index.html` must be at the repository root.
2. Edit `firebase-config.js` with your **public** config.
3. Remove old `supabase-config.js`, `supabase-schema.sql`, and Supabase setup files from the repository if they are no longer needed. Remove old Supabase JS references if any old pages exist. This package already contains none.
4. Deploy with:

```powershell
git status
git add -A
git commit -m "Switch Rep and Lap from Supabase to Firebase Firestore"
git push origin main
```

Your existing GitHub Pages URL should still work: `https://ronin-07.github.io/rep-and-lap/`.

## 5. Validate your deployment

1. Open in a desktop browser, go to Profile → Settings → Continue with Google. Confirm the correct account shows.
2. Log a set with kg/reps. Firestore Database → Data should show the matching document under `users/{your Firebase uid}/gymSessions`.
3. Log water and body weight, then observe their own documents.
4. Open the URL in a second browser/device, log in with the **same Google account**, and confirm the first device's entries appear.
5. Turn off connectivity after a connected session, enter a set and notes, and verify they remain locally available. Reconnect and wait for **Synced**. Then verify the entry appears on the other device.
6. Confirm a second Google account cannot access the first user's records (Security Rules).
7. On iPhone, Add to Home Screen and test an offline reopen (installed service worker must have had at least one online visit).
8. Export a JSON backup.

The Firebase SDK's web persistent cache may fall back to memory if a browser blocks IndexedDB. Rep & Lap still retains local workout edits via localStorage, but local browser data can be cleared by system/browser cleanup. Backups remain important.

## 6. Sync messages

- **Saved locally:** no signed-in account or currently offline; your browser has saved the edit.
- **Syncing:** edited records are awaiting Firestore acknowledgment.
- **Checking cloud:** signed in; waiting for initial server snapshots.
- **Synced:** initial collections have been confirmed and no local pending writes remain.
- **Needs attention:** check network, Firestore Rules, Firebase Auth and configuration.

## 7. Old data and Supabase

The Firebase build starts with an empty Firebase history. Your earlier Supabase data is **not migrated or deleted** automatically. To carry old records later, export JSON from the old website and use Restore backup in this one; the new app queues them for the signed-in Firebase account. If you deliberately want a fresh start, do not restore old backups.

After live testing, you can decide whether to remove the old Supabase project. Do not do that before confirming your new app works across devices.
