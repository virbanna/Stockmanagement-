# ARTIME Stock (PWA)

Phone app for your stock sheet. Works offline, saves entries on the phone and syncs them to Google Sheets.

## 1. Update the Apps Script (once)
1. Open your Google Sheet -> Extensions -> Apps Script.
2. Delete the old code, paste everything from `apps-script/Code.gs`, Save.
3. Deploy -> Manage deployments -> pencil icon -> Version: **New version** -> Deploy.
   (Execute as: Me, Who has access: Anyone. The link stays the same.)
4. Optional check: select `testRun` and press Run. The log should show "48 items".

The password is gone. Anyone with the /exec link can read and add entries, so do not share the link.
The script also adds a "Reference No." column (H) to Stock In and Stock Out by itself.

## 2. Put the app on GitHub Pages
1. Create a GitHub repository and upload everything in this folder
   (index.html, styles.css, app.js, config.js, sw.js, manifest.webmanifest, the icons folder).
   The apps-script folder is optional.
2. Repo -> Settings -> Pages -> Source: "Deploy from a branch", Branch: main, folder: / (root) -> Save.
3. Open https://YOUR-NAME.github.io/YOUR-REPO/ on your phone.

## 3. Install on the phone
- Android Chrome: menu -> Install app.
- iPhone Safari: Share -> Add to Home Screen.

## Changing things
- App name or sheet link: edit `config.js` (or More -> Google Sheet connection on the phone).
- After you change any app file, open `sw.js` and bump `artime-stock-v1` to `v2`
  so phones download the new version.
