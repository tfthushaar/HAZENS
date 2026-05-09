# Hazen Catalogue

Static product catalogue for Hazen Lighting.

## Free Deployment With GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Select branch **main** and folder **/ (root)**.
5. Click **Save**.
6. Wait for the Pages panel to show **Your site is live at**:

   `https://tfthushaar.github.io/HAZENS/`

The site is static and uses `index.html` as the entry page, so no paid hosting or build server is required.

If that URL shows "There isn't a GitHub Pages site here", the Pages source was not saved yet. Return to **Settings** > **Pages** and make sure the selected source is **Deploy from a branch**, **main**, and **/ (root)**.

## Local Preview

Because the landing page embeds a module-based 3D scene, preview it through a local HTTP server instead of opening the file directly:

```powershell
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/`. The product catalogue is available at `products.html`.

## Enquiry Form To Spreadsheet

The Enquire form is already built into the home page and catalogue page. Because GitHub Pages is static, the form needs a spreadsheet endpoint before it can append rows.

Free Google Sheets setup:

1. Create a Google Sheet named `Hazen Enquiries`.
2. Go to **Extensions** > **Apps Script**.
3. Paste the code from `enquiry-sheet-apps-script.gs`.
4. Click **Deploy** > **New deployment**.
5. Select **Web app**.
6. Set **Execute as** to **Me** and **Who has access** to **Anyone**.
7. Copy the Web App URL.
8. Paste that URL into `enquiry-config.js`:

```js
window.HAZEN_ENQUIRY_ENDPOINT = 'PASTE_WEB_APP_URL_HERE';
window.HAZEN_ENQUIRY_MODE = 'no-cors';
```

The sheet can be downloaded as an Excel workbook whenever needed using **File** > **Download** > **Microsoft Excel (.xlsx)**.
