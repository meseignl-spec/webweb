# Setup Guide — ImportTrack

## STEP 1 — Add columns to your Google Sheet

Open your sheet:
https://docs.google.com/spreadsheets/d/112yIRKnMuS9T1kSccSVqG42EyRfZm6bsC3M1DQ4lgZ4

Your current columns end at L (AN sent). Add these to the RIGHT:

| Col | Header        | What to put                                      |
|-----|---------------|--------------------------------------------------|
| M   | AN_EMAILS     | e.g. abc@gmail.com, xyz@company.com              |
| N   | PORTAL_ACCESS | YES or NO (can this customer see their data?)    |
| O   | PAYMENT       | PAID / PARTIAL / UNPAID                          |
| P   | WAREHOUSE     | PENDING / ARRIVED / UNSTUFFED / READY            |
| Q   | CUSTOMER_CODE | A code matching the Customers sheet (e.g. USG01) |

---

## STEP 2 — Create a "Customers" sheet tab

In the same Google Sheet, add a NEW TAB called exactly: **Customers**

Set up these columns (row 1 = headers, data from row 2):

| A            | B             | C   | D         | E     | F              |
|--------------|---------------|-----|-----------|-------|----------------|
| CustomerCode | Email         | PIN | Name      | Phone | PortalAccess   |
| USG01        | usg@email.com | 1234| USG Co.   | ...   | YES            |
| FPS01        | fps@email.com | 5678| FPS Corp  | ...   | YES            |

- **CustomerCode** must match what you put in column Q of Shipments sheet
- **PIN** = the password your customer uses to log in (you set this, share with them)
- **PortalAccess** = YES lets them log in, NO blocks them

---

## STEP 3 — Deploy Google Apps Script

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete all existing code in the editor
3. Copy the entire content of `Code.gs` (from this folder) and paste it
4. Add your Anthropic API key on this line:
   ```
   const CLAUDE_API_KEY = 'sk-ant-...your key here...';
   ```
5. Click **Deploy → New deployment**
6. Settings:
   - Type: **Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy** → copy the Web App URL (looks like https://script.google.com/macros/s/ABC.../exec)

---

## STEP 4 — Paste URL into website config

Open `js/config.js` and replace:
```js
window.APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_WEB_APP_URL_HERE';
```
with your actual URL from Step 3.

---

## STEP 5 — Deploy the website

Push to GitHub and enable GitHub Pages (Settings → Pages → branch: main, folder: root).
Your customers visit: `https://yourusername.github.io/webweb/`

---

## How it works day-to-day

1. Staff updates ETD/ETA/AN sent/Payment/Warehouse in the Google Sheet as usual
2. Customer logs in to the website → sees their data automatically (live from sheet)
3. Customer asks AI chatbot → it reads the sheet data and answers in Vietnamese or English
4. To give/revoke access: just change PortalAccess column to YES/NO in Customers tab
5. To add a new customer: add a row to Customers tab + put their CustomerCode in column Q of each shipment row

## Warehouse Status Values (put exactly in column P)
- `PENDING` — shipment not yet at warehouse
- `ARRIVED` — container arrived at warehouse
- `UNSTUFFED` — container has been opened and goods sorted
- `READY` — ready for customer pickup
