# RepLap v3.2 — Milestone 6 reviewed build (2026-11-20)

Base: `RepLap-v3.2-Milestone-6-Complete.zip` from the previous Milestone 6 source package. Target: `feature/v3.2`, **development Vercel Preview only**. The existing full Milestone 6 scope is retained.

## Code fixes

- An impossible longest-continuous swim no longer silently awards a reduced continuous record; the user must correct the claimed continuous metres or the outside-interval length count. This avoids false positive analytics and PR notifications.
- Swimming length, practice time and timed-effort edits now reject invalid, negative and out-of-range values before writing to local/Firestore session records. Intermediate empty numeric fields are allowed.
- Custom/default pool-length validation is consistently whole metres in the 10–100 m range, while historical records keep their stored distances.
- Interval form rejects invalid/negative/non-finite repeat times and rest values; caps interval sets to the 60 accepted by backup validation.
- Clearing the swim-plan title temporarily while editing is now possible. An empty title is restored on blur rather than trapping the user on a non-deletable last character.
- Two additional regression tests added to `tests/swimming.test.ts` for invalid input and unsupported nonstop distance claims.

## Verification performed

- `tsc -p tsconfig.model.json`: **PASS** (strict model types).
- TypeScript/TSX syntax parse: **PASS**, 49 app/component/hook/lib/test source files.
- Standalone compiled Node smoke suite: **PASS**, 10 checks including new default/legacy pools, stroke/interval totals, false continuous-record prevention, timed efforts, input limits, per-stroke targets, Firebase record round-trip and backup round-trip.

## Outstanding release gates

Because package downloads were unavailable in this execution environment, a dependency-backed `npm run typecheck`, `npm test` (Vitest), `npm run test:rules` (Firebase Emulator), and `npm run build` (Next.js) **could not be run**. Vercel Preview, Google sign-in, Firestore live sync, and mobile Safari manual acceptance testing were also not verified. Therefore **not certified ready for production**.

On your `feature/v3.2` checkout, apply the reviewed complete ZIP, **preserving `.git` and `.env.local`**, then run:

```powershell
npm install
npm run typecheck:model
npm run typecheck
npm test
npm run test:rules
npm run build
```

Verify the original acceptance checklist in `RELEASE-MILESTONE-6.md` in development Preview. Do not merge to `main` or change production Firebase until the checks pass.
