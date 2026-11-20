# RepLap v3.2 — Milestone 1: Data safety foundation

This patch is based on the RepLap **v3.1 Next.js + Firebase** source. It does not add the planned new workout UI features from milestones 2–5.

## Features

- **Storage schema v3**: preserves the existing localStorage namespace, week/session keys, and Firestore gym/swim/water/weight collections. Older cached workouts acquire deterministic set IDs on load; no bulk destructive data migration runs.
- **Independent gym-set documents**: new `users/{uid}/gymSets/{sessionKey}~{setId}` documents. Set edits are saved locally first, then written through a version-checked Firestore transaction. Different sets can sync independently, including when an old session snapshot arrives in another tab.
- **Conflict review**: edits to the same set from two devices are not silently resolved. Settings shows local and cloud values with **Use cloud** or **Keep my edit**. Resolving with "Keep my edit" rebases onto the cloud revision and requires an explicit retry.
- **Backup preview**: JSON import is validated, shows record counts and duplicate counts, requires confirmation, downloads a safety backup, and merges only new records. Existing sessions, weights, and drink IDs are preserved. A full local replacement is offered to signed-out guests only (not a destructive Firebase-wide replacement).
- **CSV export**: gym export includes a stable set ID.
- **Rules and tests**: new owner-only `gymSets` rules that enforce document identity and sequential revision numbers; unit tests and emulator-backed rule tests.

## Critical: deploy Firestore rules BEFORE the preview code

1. Download a JSON backup from the current production RepLap (Settings → Backups & exports). Confirm it downloaded.
2. In Firebase Console → Firestore Database → Rules, merge/publish **the exact `firestore.rules` bundled with this patch**. It retains the pre-existing collection rules and adds only the `/users/{uid}/gymSets/{recordId}` match. Rules do NOT deploy automatically from Vercel.
3. Wait until rules are published. Your existing production v3.1 site will continue to use the old collections; its existing rules are preserved.
4. Apply the patch to a feature branch made from the **same v3.1 source**. Never overwrite Vercel environment variables.
5. Run `npm install`, `npm run typecheck`, `npm run test`, `npm run test:rules`, `npm run build`. Rule tests require the Firebase CLI and Java 21 (installed as dev dependency / in CI).
6. Push the branch and check the Vercel Preview deployment. Test a set change offline, refresh, reconnect, sign in on another device, and verify that you have the same values.
7. Only merge to `main` after successful preview checks. Vercel auto-deploys main to production.

## Note on data compatibility

- No cloud rewrite of all old sets occurs. A legacy set's document is created **when it is next edited**. Until then, its prior value is read from the existing gym-session payload.
- Canonical gym-set documents take priority over the legacy snapshot if they disagree. This allows old session documents to remain readable.
- A v3.1 browser tab left open can still write legacy full-session documents. Close or reload old tabs before testing cross-device edits; all active devices should be on v3.2 for the best guarantees.
- Set editing uses Firestore transactions when online. Transactions do not work offline, so local edits stay in a queue until reconnection, then undergo revision comparison.
- There is no automatic deletion of old Firestore data. Importing an existing record in **Merge** mode skips the duplicate and never overwrites it. True destructive cloud replacement is intentionally unavailable.
- This design protects separate gym SET edits; it does **not yet** provide field-level conflict resolution for old session notes, schedule, swimming, weight and preferences. Those legacy records retain their existing document-level last-write-wins behavior. Back up before large imports.
- Same-set edits on two devices trigger explicit review instead of silently overwriting a remote change.

## Preview / manual acceptance tests

- Google sign in and existing history load without resets.
- Add two distinct sets on separate devices while one is offline: both survive reconnection.
- Modify the *same* set on two devices while one is offline: Settings displays the conflict and offers both values.
- Export JSON then select the same file for Restore. Preview counts should appear, but matching records should not be overwritten.
- Import an older v2 JSON backup into a guest profile. Verify stable set IDs and previous workouts.
- Confirm swim notes, gym notes, hydration entries, weigh-ins and session times still synchronize.
- Verify small-screen layout remains unchanged except the Settings data-safety sections.

## CI / tests

```powershell
npm install
npm run typecheck
npm run test
npm run test:rules
npm run build
```

`npm run test:rules` spins up the local Firestore emulator and executes rules tests. The GitHub Actions workflow `data-safety.yml` runs the checks on pushes and pull requests.

## Rollback

If you detect a regression, revert the v3.2 feature branch or Vercel production deployment to the prior v3.1 commit. **Do not revert the Firestore security rules to a version that is less restrictive.** The new `gymSets` records can remain in Firestore and are unused by v3.1; restoring v3.2 later will read them again. Avoid editing the same old workout on v3.1 while v3.2 edits are pending.

## Validation limitation

The TypeScript core-model files were type-checked and exercised by targeted local model assertions. The complete Next.js build, Vitest suite, and Firestore emulator tests require installing npm dependencies; those commands must still pass in your Vercel Preview/CI environment before production.
