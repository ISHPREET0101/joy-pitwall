# JOY PITWALL — Race Engineering Suite

An offline-first pitwall app for running a race weekend as **chief engineer / race engineer across multiple teams and multiple cars**.
Runs as a **Windows exe** (Electron) and is structured to move to **Android APK** without a rewrite — the whole app is one
local web bundle with all data stored on-device.

---

## Quick start (Windows exe)

```bash
npm install        # once
npm run dist       # build + package → release/JOY-Pitwall-Portable.exe
```

`release/JOY-Pitwall-Portable.exe` is a **plug-and-play single file** — copy it anywhere (PC, USB stick), double-click, done. No install, no server, no internet. All data is stored in a `JOY-Pitwall-Data` folder **next to the exe**, so:

- **Sharing:** close the app, zip the exe (+ the `JOY-Pitwall-Data` folder if you want your weekends included), send the zip — the recipient unzips and double-clicks.
- The prebuilt **`JOY-Pitwall-Portable.zip`** in a GitHub release already contains the exe plus a START-HERE guide.
- Note: the exe is unsigned, so Windows SmartScreen shows a "More info → Run anyway" prompt on first launch.

Other commands:

| Command         | What it does                                        |
| --------------- | --------------------------------------------------- |
| `npm run dev`   | Dev server with hot reload (browser, localhost:5173) |
| `npm run app`   | Build + open the app in Electron from `dist/`        |
| `npm run dist`  | Build + package the portable Windows exe             |
| `npm run check` | TypeScript typecheck                                 |

## The weekend workflow

1. **Start screen** — open an existing weekend, create a new one (name, round, venue, country, dates, track length,
   **track map upload**), import a backup, or load the demo weekend.
2. **Garage & Teams** — add any number of teams (with team colours); per team add cars (competition number, chassis,
   class) and **multiple drivers per car**, each with a **country flag**. Every car automatically gets its own tab.
3. **Common area** (shared by all cars):
   - **Timetable** — day-by-day sessions, inline editing, CSV import/export, and a **race-control panel** to set the
     live flag state (green / yellow / red / black / chequered…) per session. The header shows the live session,
     its status, and a countdown to the next one. Clock is always synced to local time.
   - **Track Map** — the uploaded circuit map, with fullscreen view.
   - **Conditions** — air/track temp, weather, wind, grip, surface + a timestamped conditions log.
   - **Rules & Regs** — sporting rules, technical regulations, key limits (max fuel, tyre sets, refuelling).
   - **Checklists** — pre-session checklist per day with a standard template (car / garage / engineer).
   - **Calculators** — fuel (L/lap ↔ kg/lap ↔ km/L, stint fuel, session estimates, max-fuel warning),
     tyre pressure (cold ↔ hot work-back + track-temp compensation, psi/bar), driver & ballast weight (kg/lb).
   - **Notes** — driver comments and your own notes with photo attachments.
4. **Per-car tabs** (one tab per car outside the common area):
   - **Dashboard** — laps/best/avg/σ/fuel totals, per-driver table, lap-time trace chart.
   - **Stint & Lap Log** — stints with driver, compound, fuel added, out/in clock times; laps with out-lap/in-lap
     flags, notes, per-lap delta to best; automatic stint summary (laps, best, avg, **L/lap**, **pit time**).
     Quick-add box: type `1:42.3` and hit Enter.
   - **Run Plan** — planned stints (laps, fuel, tyre, driver) vs what actually happened.
   - **Setup** — setup sheet (values per session), **lock/grey-out** settings, **importance weight 1–5**, and a
     suspension/part **changes log** with the lap-time result.
   - **Tyres** — cold/hot pressures, hot temps, **graining level**, and tyre photos per corner.
   - **Notes** — driver + engineer notes scoped to this car.
5. **Analysis**:
   - **Driver Compare** — best/avg/σ/best-5 per driver with **adjustable weighting sliders** (pace / consistency /
     volume) and a weighted score, plus best-lap chart and delta table.
   - **Reports** — printable weekend debrief (timetable + flags, per-car stint/fuel/setup/tyre summaries, notes
     digest) and **JSON backup export/import** for moving data between devices.

## Data & backup

Everything is stored locally (IndexedDB in the app profile). Use **Reports → Export backup (JSON)** to save a
weekend, and **Import backup** on the start screen to restore it on any other device — that's also how you will
move a weekend from the PC to the phone.

## Android APK migration (end of project)

The app was built web-first on purpose, so the APK needs **no code rewrite**:

1. Install the Capacitor CLI once: `npm i -D @capacitor/cli @capacitor/core @capacitor/android`
2. `npx cap init "JOY Pitwall" com.joy.pitwall --web-dir dist`
3. `npx cap add android` then `npx cap open android` (Android Studio) → **Build > Build APK**.
4. The same `dist/` bundle runs inside the Android WebView with IndexedDB — same data model, same backup files.

Notes for the APK step: file uploads (track map, tyre photos) already go through `<input type=file>` +
canvas downscaling, which works in the Android WebView. All routing is hash-based, so deep links survive a
static WebView host.
