> **Development branch `feature/v3.2`: Milestone 2 workout-flow update.** See [RELEASE-MILESTONE-2.md](RELEASE-MILESTONE-2.md). Do not merge to production until all five milestones are tested.

> **New (v3.2 Milestone 1):** Read [RELEASE-MILESTONE-1.md](./RELEASE-MILESTONE-1.md) before deploying. It requires publishing updated Firestore rules before installing this app update.

# RepLap — React + TypeScript + Next.js on Vercel

**Rep & Lap** is a mobile-first gym, swimming, hydration and weight-tracking PWA built with **Next.js App Router, React, TypeScript, Firebase Authentication and Cloud Firestore**. This edition is configured for **Vercel hosting at `/`**, rather than the old GitHub Pages `/rep-and-lap/` path.

The app name shown in the interface stays **Rep & Lap**; use **`replap`** as the Vercel project name if available for a short URL. Vercel assigns the actual domain; availability is not guaranteed.

## Features preserved

- Three animated rings for weekly Gym, weekly Swimming and daily Hydration, plus milestones and training streaks.
- Gym set logging, history, rest timer, personal records and notes.
- Swimming intervals, lengths, drills and session notes.
- Water logs with **+750 mL** bottle Quick Add (plus 250/500 mL options).
- Weight logging, progress graphs and data export.
- Profile and Settings as separate screens; mobile bottom tabs; dark/light mode; iPhone input font size >=16px to avoid Safari focus zoom.
- Google sign-in, Firestore synchronization, offline local caching and pending sync queue, PWA installation, JSON backup/restore.

No Firestore migration or rules change is needed. It uses the same `users/{uid}` Firestore collections and `rep-and-lap-firebase-v1:<uid>` local-storage format. **Important:** browser-local storage does NOT move between the old `github.io` URL and the new `vercel.app` URL. Sync signed-in records and download a JSON backup before switching.

## Hosting changes from the GitHub Pages version

- Removed `output: 'export'`, the `/rep-and-lap` `basePath` and old trailing-slash overrides from `next.config.ts`.
- Removed `NEXT_PUBLIC_REPO_NAME` and updated manifest, icons, service worker, notifications and 404 home link to root `/` paths.
- Removed `.github/workflows/deploy.yml` and `public/.nojekyll` (GitHub Pages-only files).
- Service worker script has a new cache version and is sent with `Cache-Control: no-cache` to aid updates.
- Pinned Vercel's Node.js major version to **22.x** with `package.json` `engines.node`.
- Vercel automatically builds and deploys from GitHub; no `vercel.json`, custom output directory or GitHub Actions deployment workflow is needed. Next.js's standard output is `.next/`.

## Get ready to deploy

Follow **[VERCEL-DEPLOY.md](VERCEL-DEPLOY.md)** for step-by-step Windows/GitHub/Vercel/Firebase instructions. Summary:

1. Keep the old GitHub Pages website until the new Vercel deployment is fully tested; export a JSON backup and ensure your recent records say **Synced**.
2. In your existing Git repository, create a migration branch. Copy the **contents** of this package (not its containing folder) into the repository root so `package.json` and `app/` are at root. Preserve `.git` and your Firebase web config until you've copied its public values to Vercel.
3. Remove the old GitHub Pages workflow, legacy top-level vanilla JS/HTML files and any GitHub Pages `NEXT_PUBLIC_REPO_NAME` setting. `git status` to verify; commit and push the new branch.
4. On [Vercel](https://vercel.com/new), import your repository, choose **Next.js**, **Root Directory `./`** if files are in the repository root, and project name `replap` if available.
5. Add Firebase's `NEXT_PUBLIC_FIREBASE_*` values (see below) in **Vercel Project > Settings > Environment Variables** for Production and relevant previews. Trigger a new deployment if changed after a build.
6. Add the actual Vercel domain in **Firebase Console > Authentication > Settings > Authorized domains**. Preview URLs are different origins and may need to be authorized individually.
7. Test sign-in, a workout and swim log, hydration, offline sync, backup, home-screen install, Safari input focus, and mobile navigation on the new URL. Only then move your main production branch and disable old GitHub Pages deployment.

### Firebase web config

Copy `.env.example` to `.env.local` to run locally (this file is gitignored). Set the **same public client config** in Vercel environment variables; do **not** upload your `.env.local` or Firebase Admin/service account credentials.

| Environment variable | Firebase web app config field |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `appId` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |

These public web identifiers are exposed in the client bundle by design. **Privacy depends on proper Firestore Security Rules**, not the secrecy of the web `apiKey`. Keep the published Firestore rules in Firebase.

### Local development (optional)

Node.js 22 and npm are used for local development; Vercel can build on its servers without your machine running npm.

```powershell
npm install
Copy-Item .env.example .env.local
# Fill .env.local with your existing Firebase web config
npm run typecheck
npm test
npm run build
npm run dev
```

Open http://localhost:3000. Commit `package-lock.json` once generated by `npm install` for reproducible builds. Make sure `localhost` is an allowed Firebase Auth domain for local Google sign-in.

### Vercel build settings

| Field | Value |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` (if these project files are at the repo root) |
| Build Command | Default (`npm run build`) |
| Output Directory | Default (don't override to `out`) |
| Install Command | Default (`npm install` / `npm ci` when lockfile is present) |
| Node.js runtime | 22.x (pinned in `package.json`) |

**Don't set `NEXT_PUBLIC_REPO_NAME`, don't configure a `/rep-and-lap` base path, and don't use the GitHub Pages deployment workflow.** Vercel performs Git-linked deployments without it.

## Architecture / data safety

```text
app/               Next.js App Router and global CSS
components/        Dashboard, Workout, Progress, Profile and Settings
hooks/useTrainer.ts React state, local cache, offline writes, Firestore listeners
lib/               Firebase adapter, types, calculations, training plans
public/            PWA manifest, service worker and app icons
firestore.rules     User-level permissions; publish separately in Firebase
```

Firestore document paths remain:

```text
users/{uid}/gymSessions/{recordKey}
users/{uid}/swimSessions/{recordKey}
users/{uid}/weighIns/{recordKey}
users/{uid}/waterEntries/{recordKey}
users/{uid}/settings/main
```

Offline edits to the same session from multiple disconnected devices can conflict (last-write-wins). Installed PWAs have their own origin-specific storage. Workout reminders only work when the app is open; push notifications while the app is closed would require separate infrastructure.

## Verification

All project source files were packaged and syntax-checked, and Vercel-specific paths and configuration were reviewed. **A full `npm install`, `npm run typecheck`, `npm run build` and real Vercel/Firebase browser deployment were not possible in the packaging environment**, so this is **deployment-ready source configuration, not a proven live production site**. Review the Vercel build log and complete the QA checklist before decommissioning your old deployment.
