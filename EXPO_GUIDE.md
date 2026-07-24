# Running Ledger with Expo Go

This project wraps the Ledger web app in a thin native shell (a full-screen WebView) so you can preview it instantly in **Expo Go**, and later get a real installable APK from Expo's free cloud build — no Android Studio required on your machine.

## Part 1 — Live preview in Expo Go (few minutes)

1. Install prerequisites on your computer:
   - [Node.js](https://nodejs.org) (v18+)
   - The **Expo Go** app on your Android phone, from the Play Store.

2. Unzip this project, then in a terminal:
   ```
   cd expo-ledger-app
   npm install
   npx expo start
   ```

3. A QR code appears in your terminal. Open **Expo Go** on your phone and scan it (your phone and computer need to be on the same Wi-Fi network — if that's a problem, run `npx expo start --tunnel` instead, which routes through Expo's servers so networks don't need to match).

4. The app loads inside Expo Go. Try adding an expense, scanning a receipt, using voice entry — it's the full app.

**Note on this preview mode:** Expo Go is a generic sandbox app, so a few native-feeling things behave like they would in a mobile browser rather than a fully native app — e.g. the "Export CSV/JSON" buttons trigger a browser-style download rather than saving straight to your phone's Downloads folder. That resolves itself once you build the real standalone APK in Part 2.

## Part 2 — Get a real installable APK (no Android Studio needed)

This uses **EAS Build**, Expo's free cloud build service — it compiles the APK on Expo's servers, so you don't need to install any Android build tools locally.

1. Create a free account at [expo.dev](https://expo.dev) if you don't have one.

2. Install the EAS CLI and log in:
   ```
   npm install -g eas-cli
   eas login
   ```

3. Link this project to your account (first time only):
   ```
   eas init
   ```

4. Build the APK in the cloud:
   ```
   eas build --platform android --profile preview
   ```
   This uploads the project and builds remotely — takes roughly 10-20 minutes. When it finishes, the terminal (and your expo.dev dashboard) gives you a direct download link to the `.apk`. Download it to your phone and tap it to install (you'll need to allow "install unknown apps" the first time, which Android will prompt for automatically).

5. To share it or eventually publish to the Play Store, `eas build --platform android --profile production` builds an `.aab` (Play Store bundle) instead — see `eas.json`, already configured for both.

## What's inside

- `App.js` — a single-screen React Native app that renders the Ledger app in a full-screen `WebView`.
- `webviewContent.js` — **auto-generated**: the entire Ledger app (HTML + your CSS + your JS) inlined into one big HTML string, so the WebView doesn't need to resolve any local file paths.
- `assets/webapp/` — the original, editable source files (`index.html`, `style.css`, `app.js`).
- `build-webview-bundle.js` — the script that regenerates `webviewContent.js` from `assets/webapp/`.
- `app.json` — app identity (`com.ledger.expensetracker`) and Android permissions for camera (receipt scanning) and microphone (voice entry).
- `eas.json` — build profiles for EAS Build.

## Making changes

Edit the files inside `assets/webapp/` (same HTML/CSS/JS from the web version), then regenerate the bundle:
```
node build-webview-bundle.js
```
Then re-run `npx expo start` to preview, or `eas build` again to get an updated APK.

## Why not just hand-build an APK myself?

I generated and verified everything up through this point in a sandboxed environment that only has network access to a small allow-list of domains (npm, GitHub, PyPI) — it can't reach Google's Android SDK/Gradle servers or Expo's build servers, so the very last "compile" step has to run either on your machine (which already has full internet) or in EAS Build's cloud (same reason). Everything else — the project setup, dependencies, permissions, and the app itself — is done and tested for syntax correctness.
