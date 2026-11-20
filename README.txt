Rep & Lap V2.3 — iPhone Safari + PR hotfix

In your local rep-and-lap Git repo, replace the four files in this ZIP:
  index.html
  app.js
  styles.css
  sw.js

Leave supabase-config.js and your other website files untouched.
No database migration is necessary. Back up local workout data before updating.

Changes:
  • Better iOS dark root/background and installed PWA safe areas.
  • Settings gear is a centered SVG icon instead of an emoji.
  • Initial logged exercise session is only a baseline; no PR celebration.
  • Future true PRs still celebrate.
  • Keep going button displays normal text and an SVG arrow.
  • Service-worker cache version bumped to load the update.

Deploy:
  git add index.html app.js styles.css sw.js
  git commit -m "Fix iOS Safari layout and PR celebration"
  git push origin main

After deployment, reload the live page. If old assets persist, close and reopen
Safari / the installed Home Screen app. Installing via Safari Share > Add to
Home Screen removes Safari's bottom address toolbar.

Note: iOS Safari's system-owned bars cannot be guaranteed dark by website CSS.
