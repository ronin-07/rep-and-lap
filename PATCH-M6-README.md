# RepLap v3.2 Milestone 6 patch

Apply this patch **only on top of the latest RepLap v3.2 Activity Notifications update** on `feature/v3.2`.

- Extract ZIP files to the **repository root**, preserving your existing `.git`, `.env.local` and Vercel configuration.
- Do not overwrite files from a newer branch/release with an older ZIP.
- Read `RELEASE-MILESTONE-6.md` for features, model compatibility, Preview test scenarios and release gate.
- New files: `lib/swimming.ts`, `components/swimming/SwimLogger.tsx`, `tests/swimming.test.ts`.
- No new Firestore collections/rules. Do **not** publish development Firebase rules to Production until final v3.2 rollout.
- Your `main` branch and Vercel Production are unaffected until you explicitly merge.
