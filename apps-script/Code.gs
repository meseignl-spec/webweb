// ═══════════════════════════════════════════════════════════════════════════
//  WeDo Forwarding — Shipment Tracking API
//  Deploy: Extensions → Apps Script → Deploy → New deployment
//          Type: Web App | Execute as: Me | Access: Anyone
//  Sheet: https://docs.google.com/spreadsheets/d/1PXWF8t-8OIiBleTfgG7PrVyPJ5uqMsPk-5nTMvejKSo
// ═══════════════════════════════════════════════════════════════════════════

const SHEET_ID   = '1PXWF8t-8OIiBleTfgG7PrVyPJ5uqMsPk-5nTMvejKSo';
const TAB_MAIN   = 'Status';  // main tracking tab
const TAB_BL     = 'HBL';    // BL/REF mapping tab

// ── Column positions in Sheet1 — Shipment table (1-indexed) ───────────────
// Row 1-2 = merged headers, Row 3 = sub-headers, data from Row 4
const C = {
  TYPE      : 1,   // A – CONSOL / LCL
  AGENT     : 2,   // B – Agent
  ETD       : 3,   // C – ETD
  ETA       : 4,   // D – ETA
  MBL       : 5,   // E – MBL #
  NOTE      : 6,   // F – NOTE
  VESSEL    : 7,   // G – VV
  MNF       : 8,   // H – MNF ✓
  CHECK_MNF : 9,   // I – check mnf
  PQ        : 10,  // J – PQ
  FINAL_HBL : 11,  // K – FINAL HBL
  AN        : 12,  // L – AN sent (SENT or blank)
  INV_PAID  : 13,  // M – INV CARRIER / PAID
  EDO       : 14,  // N – INV CARRIER / EDO
  KHO       : 15,  // O – KHO / Tình hình KT
  DN_AGENT  : 16,  // P – DN AGENT / Nhập DN ✓
  KH_PAID   : 17,  // Q – KH TT / PAID
  TON_KHO   : 18,  // R – TỒN KHO / Tồn kho
  GHI_CHU   : 19,  // S – TỒN KHO / Ghi chú
};

// REF/BL table starts after a gap — detect by looking for "REF" header
// Columns: A=REF, B=BL

// ── CORS ──────────────────────────────────────────────────────────────────
function cors(output) {
  return output.setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const p      = e.parameter;
  const action = p.action || '';
  try {
    if (action === 'search') return cors(ContentService.createTextOutput(JSON.stringify(handleSearch(p))));
    if (action === 'chat')   return cors(ContentService.createTextOutput(JSON.stringify(handleChat(p))));
    return cors(ContentService.createTextOutput(JSON.stringify({ ok: true, msg: 'WeDo Forwarding API running' })));
  } catch (err) {
    return cors(ContentService.createTextOutput(JSON.stringify({ success: false, message: err.message })));
  }
}

function handleSearch(p) {
  const blQuery = String(p.bl || '').trim().toUpperCase();
  if (!blQuery) return { success: false, message: 'BL number required.' };

  const ss      = SpreadsheetApp.openById(SHEET_ID);
  const sheets  = ss.getSheets();

  // Tự động tìm tất cả tab có chứa "status" và "hbl" (không phân biệt hoa thường)
  const statusSheets = sheets.filter(s => s.getName().toLowerCase().includes('status'));
  const hblSheets    = sheets.filter(s => s.getName().toLowerCase().includes('hbl'));

  if (!statusSheets.length) return { success: false, message: 'No Status sheet found.' };
  if (!hblSheets.length)    return { success: false, message: 'No HBL sheet found.' };

  // ── Gộp shipment data từ tất cả tab Status ──
  const shipments = {};
  for (const sh of statusSheets) {
    const allData = sh.getDataRange().getValues();
    let dataStarted = false;
    for (let i = 0; i < allData.length; i++) {
      const row   = allData[i];
      const cellA = String(row[0]).trim().toUpperCase();
      if (cellA === 'CONSOL' || cellA === 'LCL') dataStarted = true;
      if (!dataStarted) continue;
      const mbl = String(row[C.MBL - 1]).trim();
      if (!mbl || mbl.toUpperCase() === 'MBL #') continue;
      shipments[mbl.toUpperCase()] = {
        type    : row[C.TYPE      - 1],
        agent   : row[C.AGENT     - 1],
        etd     : formatDate(row[C.ETD - 1]),
        eta     : formatDate(row[C.ETA - 1]),
        mbl     : mbl,
        vessel  : row[C.VESSEL    - 1],
        an      : row[C.AN        - 1],
        note    : row[C.NOTE      - 1],
        kho     : row[C.KHO       - 1],
        khPaid  : row[C.KH_PAID   - 1],
        ghiChu  : row[C.GHI_CHU   - 1],
      };
    }
  }

  // ── Gộp BL list từ tất cả tab HBL ──
  const blList = [];
  for (const sh of hblSheets) {
    const blData = sh.getDataRange().getValues();
    let lastRef  = '';
    for (let i = 0; i < blData.length; i++) {
      const row  = blData[i];
      const colA = String(row[0]).trim();
      const colB = String(row[1]).trim();
      if (colA.toUpperCase() === 'REF') continue;
      if (!colB) continue;
      if (colA) lastRef = colA.toUpperCase();
      blList.push({
        ref      : lastRef,
        bl       : colB,
        container: String(row[2] || '').trim(),
        payment  : String(row[3] || '').trim(),
        warehouse: String(row[4] || '').trim(),
        edo      : String(row[5] || '').trim(),
      });
    }
  }

  // ── Lookup ──
  let matches = blList.filter(b => b.bl.toUpperCase() === blQuery);
  if (!matches.length) matches = blList.filter(b => b.bl.toUpperCase().includes(blQuery) || b.ref.includes(blQuery));
  if (!matches.length) {
    Object.keys(shipments).filter(r => r.includes(blQuery)).forEach(ref => {
      matches.push({ ref, bl: ref, payment: '', warehouse: '', edo: '' });
    });
  }

  const results = matches.map(b => ({ ...shipments[b.ref], ...b })).filter(r => r.etd);
  return { success: true, results };
}

// ── CHATBOT ───────────────────────────────────────────────────────────────
const CLAUDE_API_KEY = 'YOUR_ANTHROPIC_API_KEY_HERE';

function handleChat(p) {
  const bl      = String(p.bl      || '').trim();
  const message = String(p.message || '').trim();
  if (!message) return { success: false, message: 'Empty message.' };

  const searchResult = bl ? handleSearch({ bl }) : { success: true, results: [] };
  const context = searchResult.success && searchResult.results.length
    ? JSON.stringify(searchResult.results, null, 2)
    : 'Chưa có BL number được chọn.';

  const systemPrompt = `Bạn là trợ lý AI của WeDo Forwarding, bộ phận import consolidation.
Trả lời bằng ngôn ngữ khách hàng dùng (tiếng Việt hoặc tiếng Anh). Ngắn gọn, chuyên nghiệp.

Dữ liệu lô hàng hiện tại:
${context}

Giải thích các trường:
- ETD = Ngày tàu rời cảng xuất
- ETA = Ngày tàu dự kiến đến cảng đích
- AN = Arrival Notice (thông báo hàng đến)
- KHO/kho = Tình trạng tại kho (ARRIVED=hàng về kho, UNSTUFFED=đã rút hàng, READY=sẵn sàng lấy)
- KH TT/PAID = Tình trạng thanh toán của khách hàng
- INV PAID = Hoá đơn hãng tàu đã thanh toán chưa
- EDO = Electronic Delivery Order
- Tồn kho = Tình trạng tồn kho hiện tại`;

  const apiKey = CLAUDE_API_KEY !== 'YOUR_ANTHROPIC_API_KEY_HERE'
    ? CLAUDE_API_KEY
    : PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) return { success: false, message: 'Chatbot chưa được cấu hình.' };

  const response = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method     : 'post',
    contentType: 'application/json',
    headers    : { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload    : JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, system: systemPrompt, messages: [{ role: 'user', content: message }] }),
    muteHttpExceptions: true,
  });

  const result = JSON.parse(response.getContentText());
  return result.content?.[0]
    ? { success: true, reply: result.content[0].text }
    : { success: false, message: 'AI error. Vui lòng thử lại.' };
}

function formatDate(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  return String(val);
}
