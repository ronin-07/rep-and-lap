# Rep & Lap — Training Tracker Website

A responsive, account-free training site for 3 gym days (Push / Pull / Legs) and 3 swimming days every week.

## Start

Open `index.html` in a modern browser, or deploy the folder to any static host (GitHub Pages, Netlify, Cloudflare Pages, etc.). For local development you can run:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Features

- Monday–Saturday six-session checklist and Sunday recovery day
- 18 gym exercises with *individual* weights, reps, and RIR, plus weekly volume calculations
- Three swimming sessions with distance, longest continuous freestyle, breaststroke level, sculling/treading time, rest intervals, drills, notes and effort
- Progress charts for gym volume, swimming distance, workout consistency and freestyle endurance
- Original Google Sheet link in the sidebar and Settings tab
- Offline-capable progressive web app when hosted over HTTPS, after initial visit
- Local browser storage, JSON backup/restore and CSV export for manual use with spreadsheets

## Privacy and synchronization

Workout entries are saved in this browser's local storage. They do **not** automatically sync to the Google Sheet or other devices. Use Settings > Download backup to preserve your data, and Settings > Restore backup to import it in another browser/device. No account or external services are required.

## Original Google Sheet

[Gym + Swimming Weekly Training Tracker](https://docs.google.com/spreadsheets/d/1wXWgc62YyYDiqV9XPjyDYlgbsHwoxJQeUpl6htIvSew/edit?usp=drivesdk)

## Deployment

To make a live public URL: unzip the folder and drag the folder into Netlify's deployment page, or commit files into a GitHub repository and enable GitHub Pages. The PWA worker requires HTTPS or localhost.
