// ═══════════════════════════════════════════════════════════════════════════
//  ImportTrack — Google Apps Script Backend
//  Deploy as: Web App → Execute as ME → Anyone can access
//  Sheet: https://docs.google.com/spreadsheets/d/112yIRKnMuS9T1kSccSVqG42EyRfZm6bsC3M1DQ4lgZ4
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_ID    = '112yIRKnMuS9T1kSccSVqG42EyRfZm6bsC3M1DQ4lgZ4';
const SHIP_SHEET  = 'Shipments';   // your main tracking sheet tab name
const CUST_SHEET  = 'Customers';   // new tab you'll create for login credentials

// ── Column positions in your Shipments sheet (1-indexed) ──────────────────
// A=1  B=2  C=3  D=4  E=5  F=6  G=7  H=8  I=9  J=10  K=11  L=12
// then M=13(AN_EMAILS) N=14(PORTAL_ACCESS) O=15(PAYMENT) P=16(WAREHOUSE) Q=17(CUSTOMER_CODE)
const COL = {
  TYPE          : 1,   // A – CONSOL / LCL
  AGENT         : 2,   // B – Agent name
  ETD           : 3,   // C – ETD date
  ETA           : 4,   // D – ETA date
  MBL           : 5,   // E – MBL # (bold in your sheet)
  NOTE          : 6,   // F – Note / status note
  VESSEL        : 7,   // G – VV (Vessel Voyage)
  MNF_CHECK     : 8,   // H – MNF ✓
  CHECK_MNF     : 9,   // I – check mnf
  PQ            : 10,  // J – PQ
  FINAL_HBL     : 11,  // K – FINAL HBL
  AN_SENT       : 12,  // L – AN sent (yes/no or date)
  AN_EMAILS     : 13,  // M – which customer emails AN was sent to
  PORTAL_ACCESS : 14,  // N – portal access YES/NO
  PAYMENT       : 15,  // O – payment status: PAID / PARTIAL / UNPAID
  WAREHOUSE     : 16,  // P – warehouse: PENDING / ARRIVED / UNSTUFFED / READY
  CUSTOMER_CODE : 17,  // Q – customer code (links to Customers sheet)
};

// ── CORS helper ───────────────────────────────────────────────────────────
function cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader('Access-Control-Allow-Origin', '*');
}

function doGet(e) {
  const p      = e.parameter;
  const action = p.action || '';

  try {
    if (action === 'login')     return cors(ContentService.createTextOutput(JSON.stringify(handleLogin(p))));
    if (action === 'shipments') return cors(ContentService.createTextOutput(JSON.stringify(handleShipments(p))));
    if (action === 'chat')      return cors(ContentService.createTextOutput(JSON.stringify(handleChat(p))));
    return cors(ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'ImportTrack API running' })));
  } catch (err) {
    return cors(ContentService.createTextOutput(JSON.stringify({ success: false, message: err.message })));
  }
}

// ── LOGIN ─────────────────────────────────────────────────────────────────
// Customers sheet columns: A=CustomerCode  B=Email  C=PIN  D=Name  E=Phone
function handleLogin(p) {
  const email = (p.email || '').trim().toLowerCase();
  const pin   = (p.pin   || '').trim();
  if (!email || !pin) return { success: false, message: 'Email and PIN required.' };

  const ss   = SpreadsheetApp.openById(SHEET_ID);
  const sh   = ss.getSheetByName(CUST_SHEET);
  if (!sh) return { success: false, message: 'Customer sheet not set up yet.' };

  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    const rowEmail = String(rows[i][1]).trim().toLowerCase();
    const rowPin   = String(rows[i][2]).trim();
    const portalOk = String(rows[i][5]).trim().toUpperCase(); // column F = portal access
    if (rowEmail === email && rowPin === pin) {
      if (portalOk === 'NO') return { success: false, message: 'Your account does not have portal access. Please contact your coordinator.' };
      return {
        success: true,
        customer: {
          code  : rows[i][0],
          email : rows[i][1],
          name  : rows[i][3],
          phone : rows[i][4],
        }
      };
    }
  }
  return { success: false, message: 'Invalid email or PIN.' };
}

// ── SHIPMENTS ─────────────────────────────────────────────────────────────
function handleShipments(p) {
  const customerCode = (p.code || '').trim();
  if (!customerCode) return { success: false, message: 'Customer code required.' };

  const ss   = SpreadsheetApp.openById(SHEET_ID);
  const sh   = ss.getSheetByName(SHIP_SHEET);
  if (!sh) return { success: false, message: 'Shipments sheet not found.' };

  const rows    = sh.getDataRange().getValues();
  const results = [];

  // rows[0] and rows[1] are header rows in your sheet, data starts row 4 (index 3)
  for (let i = 3; i < rows.length; i++) {
    const r    = rows[i];
    const code = String(r[COL.CUSTOMER_CODE - 1]).trim();
    if (!code) continue; // skip empty rows
    if (code !== customerCode) continue;

    results.push({
      type         : r[COL.TYPE          - 1],
      agent        : r[COL.AGENT         - 1],
      etd          : formatDate(r[COL.ETD          - 1]),
      eta          : formatDate(r[COL.ETA          - 1]),
      mbl          : r[COL.MBL           - 1],
      note         : r[COL.NOTE          - 1],
      vessel       : r[COL.VESSEL        - 1],
      mnf          : r[COL.MNF_CHECK     - 1],
      checkMnf     : r[COL.CHECK_MNF     - 1],
      pq           : r[COL.PQ            - 1],
      finalHbl     : r[COL.FINAL_HBL     - 1],
      anSent       : r[COL.AN_SENT       - 1],
      anEmails     : r[COL.AN_EMAILS     - 1],
      portalAccess : r[COL.PORTAL_ACCESS - 1],
      payment      : r[COL.PAYMENT       - 1],
      warehouse    : r[COL.WAREHOUSE     - 1],
    });
  }

  return { success: true, shipments: results };
}

// ── CHATBOT (Claude API proxy — keeps API key server-side) ─────────────────
const CLAUDE_API_KEY = 'YOUR_ANTHROPIC_API_KEY_HERE'; // paste here OR use PropertiesService

function handleChat(p) {
  const customerCode = (p.code    || '').trim();
  const question     = (p.message || '').trim();
  if (!question) return { success: false, message: 'Empty message.' };

  // Fetch shipment context for this customer
  const shipmentData = handleShipments({ code: customerCode });
  const context = shipmentData.success && shipmentData.shipments.length > 0
    ? JSON.stringify(shipmentData.shipments, null, 2)
    : 'No shipments found for this customer.';

  const systemPrompt = `You are an AI assistant for an import logistics company (Import Consolidation department).
You help customers track their shipments. Answer in the same language the customer uses (Vietnamese or English).
Be concise, friendly, and professional.

Current shipment data for this customer:
${context}

Field guide:
- ETD = Estimated Time of Departure (from origin port)
- ETA = Estimated Time of Arrival (at destination)
- MBL = Master Bill of Lading number
- AN = Arrival Notice (sent to customer emails when shipment arrives)
- MNF = Manifest
- PQ = Phytosanitary/Quarantine clearance
- HBL = House Bill of Lading
- Warehouse status: PENDING=not yet arrived | ARRIVED=at warehouse | UNSTUFFED=container opened & sorted | READY=ready for pickup
- Payment: PAID | PARTIAL | UNPAID`;

  const payload = JSON.stringify({
    model      : 'claude-haiku-4-5-20251001',
    max_tokens : 500,
    system     : systemPrompt,
    messages   : [{ role: 'user', content: question }]
  });

  const apiKey = CLAUDE_API_KEY !== 'YOUR_ANTHROPIC_API_KEY_HERE'
    ? CLAUDE_API_KEY
    : PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');

  if (!apiKey) return { success: false, message: 'Chatbot not configured. Ask your coordinator.' };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method      : 'post',
    contentType : 'application/json',
    headers     : {
      'x-api-key'         : apiKey,
      'anthropic-version' : '2023-06-01',
    },
    payload     : payload,
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  if (result.content && result.content[0]) {
    return { success: true, reply: result.content[0].text };
  }
  return { success: false, message: 'AI response error. Please try again.' };
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }
  return String(val);
}
