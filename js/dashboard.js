// ── Auth guard ────────────────────────────────────────────────────────────
const customer = JSON.parse(sessionStorage.getItem('customer') || 'null');
if (!customer) { window.location.href = 'index.html'; }

document.getElementById('navCustomerName').textContent = customer.name || customer.email;

function logout() {
  sessionStorage.clear();
  window.location.href = 'index.html';
}

// ── Load shipments ────────────────────────────────────────────────────────
let allShipments = [];

async function loadShipments() {
  showState('loading');
  try {
    const url = `${window.APPS_SCRIPT_URL}?action=shipments&code=${encodeURIComponent(customer.code)}`;
    const res  = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    allShipments = data.shipments || [];
    renderShipments(allShipments);
    renderSummary(allShipments);
  } catch (err) {
    showState('empty');
    document.querySelector('#emptyState p').textContent = 'Failed to load: ' + err.message;
  }
}

function showState(state) {
  document.getElementById('loadingState').classList.toggle('hidden', state !== 'loading');
  document.getElementById('emptyState').classList.toggle('hidden',   state !== 'empty');
  document.getElementById('tableWrapper').classList.toggle('hidden', state !== 'table');
}

function renderSummary(ships) {
  const row = document.getElementById('summaryRow');
  if (!ships.length) { row.style.display = 'none'; return; }
  row.style.display = '';
  const inTransit = ships.filter(s => !isArrived(s)).length;
  const arrived   = ships.filter(s => isArrived(s)).length;
  const unpaid    = ships.filter(s => unpaidStatus(s.payment)).length;
  document.getElementById('statTotal').textContent   = ships.length;
  document.getElementById('statTransit').textContent = inTransit;
  document.getElementById('statArrived').textContent = arrived;
  document.getElementById('statPayment').textContent = unpaid ? `${unpaid} pending` : '✓ All clear';
  document.getElementById('statPayment').style.color = unpaid ? '#ef4444' : '#22c55e';
  document.getElementById('headerSub').textContent   = `${ships.length} shipment${ships.length !== 1 ? 's' : ''} linked to your account`;
}

function isArrived(s) {
  const w = String(s.warehouse || '').toUpperCase();
  return w === 'ARRIVED' || w === 'UNSTUFFED' || w === 'READY';
}
function unpaidStatus(p) {
  const v = String(p || '').toUpperCase();
  return v === 'UNPAID' || v === 'PARTIAL';
}

function renderShipments(ships) {
  if (!ships.length) { showState('empty'); return; }
  showState('table');
  const tbody = document.getElementById('shipmentsBody');
  tbody.innerHTML = ships.map((s, i) => `
    <tr class="ship-row" onclick="openDetail(${i})">
      <td><strong>${esc(s.mbl)}</strong><br><span class="sub">${esc(s.finalHbl)}</span></td>
      <td><span class="badge badge-type">${esc(s.type)}</span><br><span class="sub">${esc(s.agent)}</span></td>
      <td class="small">${esc(s.vessel)}</td>
      <td class="date-cell">${esc(s.etd)}</td>
      <td class="date-cell">${esc(s.eta)}</td>
      <td>${anBadge(s.anSent)}</td>
      <td>${paymentBadge(s.payment)}</td>
      <td>${warehouseBadge(s.warehouse)}</td>
      <td><button class="btn-detail">View →</button></td>
    </tr>
  `).join('');
}

function anBadge(v) {
  const val = String(v || '').toUpperCase();
  if (!val || val === 'NO' || val === 'FALSE') return '<span class="badge badge-warn">Not sent</span>';
  return `<span class="badge badge-ok">Sent</span>`;
}

function paymentBadge(v) {
  const val = String(v || '').toUpperCase();
  if (val === 'PAID')    return '<span class="badge badge-ok">Paid</span>';
  if (val === 'PARTIAL') return '<span class="badge badge-warn">Partial</span>';
  if (val === 'UNPAID')  return '<span class="badge badge-err">Unpaid</span>';
  return `<span class="badge badge-neutral">${esc(v) || '—'}</span>`;
}

function warehouseBadge(v) {
  const val = String(v || '').toUpperCase();
  const map = {
    PENDING   : ['badge-neutral', 'Pending'],
    ARRIVED   : ['badge-blue',   'Arrived'],
    UNSTUFFED : ['badge-warn',   'Unstuffed'],
    READY     : ['badge-ok',     'Ready for pickup'],
  };
  const [cls, label] = map[val] || ['badge-neutral', v || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Detail modal ──────────────────────────────────────────────────────────
function openDetail(i) {
  const s = allShipments[i];
  const anEmailList = s.anEmails
    ? String(s.anEmails).split(/[,;]/).map(e => `<li>${esc(e.trim())}</li>`).join('')
    : '<li>—</li>';

  document.getElementById('modalContent').innerHTML = `
    <h2 class="modal-title">Shipment Detail</h2>
    <div class="detail-grid">
      <div class="detail-section">
        <h3>Booking Info</h3>
        <dl>
          <dt>MBL #</dt>      <dd>${esc(s.mbl)}</dd>
          <dt>Final HBL</dt>  <dd>${esc(s.finalHbl) || '—'}</dd>
          <dt>Type</dt>       <dd>${esc(s.type)}</dd>
          <dt>Agent</dt>      <dd>${esc(s.agent)}</dd>
          <dt>Vessel/Voyage</dt><dd>${esc(s.vessel) || '—'}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Schedule</h3>
        <dl>
          <dt>ETD</dt>  <dd class="big-date">${esc(s.etd) || '—'}</dd>
          <dt>ETA</dt>  <dd class="big-date">${esc(s.eta) || '—'}</dd>
        </dl>
        <div class="timeline">
          ${timelineStep('Departed',  isArrived(s) || s.etd)}
          ${timelineStep('In Transit', isArrived(s))}
          ${timelineStep('Arrived at Warehouse', ['ARRIVED','UNSTUFFED','READY'].includes(String(s.warehouse||'').toUpperCase()))}
          ${timelineStep('Unstuffed', ['UNSTUFFED','READY'].includes(String(s.warehouse||'').toUpperCase()))}
          ${timelineStep('Ready for Pickup', String(s.warehouse||'').toUpperCase() === 'READY')}
        </div>
      </div>
      <div class="detail-section">
        <h3>Customs & Docs</h3>
        <dl>
          <dt>MNF ✓</dt>      <dd>${esc(s.mnf) || '—'}</dd>
          <dt>Check MNF</dt>  <dd>${esc(s.checkMnf) || '—'}</dd>
          <dt>PQ</dt>         <dd>${esc(s.pq) || '—'}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Arrival Notice</h3>
        <dl>
          <dt>AN Status</dt>  <dd>${anBadge(s.anSent)}</dd>
          <dt>Sent to</dt>    <dd><ul class="email-list">${anEmailList}</ul></dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Payment</h3>
        <dl>
          <dt>Status</dt>  <dd>${paymentBadge(s.payment)}</dd>
        </dl>
      </div>
      <div class="detail-section">
        <h3>Warehouse</h3>
        <dl>
          <dt>Status</dt>   <dd>${warehouseBadge(s.warehouse)}</dd>
        </dl>
      </div>
    </div>
    ${s.note ? `<div class="detail-note"><strong>Note:</strong> ${esc(s.note)}</div>` : ''}
  `;
  document.getElementById('detailModal').classList.remove('hidden');
}

function timelineStep(label, done) {
  return `<div class="t-step ${done ? 'done' : ''}">
    <div class="t-dot"></div><div class="t-label">${label}</div>
  </div>`;
}

function closeDetailModal() {
  document.getElementById('detailModal').classList.add('hidden');
}
function closeModal(e) {
  if (e.target === document.getElementById('detailModal')) closeDetailModal();
}

// ── Chatbot ───────────────────────────────────────────────────────────────
let chatOpen = false;

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatPanel').classList.toggle('hidden', !chatOpen);
  document.getElementById('chatBadge').classList.add('hidden');
  if (chatOpen) document.getElementById('chatInput').focus();
}

document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChat();
});

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendMsg(msg, 'user');

  const typing = appendMsg('…', 'bot');
  document.getElementById('chatSend').disabled = true;

  try {
    // Route through Apps Script (keeps API key server-side)
    const url = `${window.APPS_SCRIPT_URL}?action=chat&code=${encodeURIComponent(customer.code)}&message=${encodeURIComponent(msg)}`;
    const res  = await fetch(url);
    const data = await res.json();
    typing.textContent = data.success ? data.reply : ('Error: ' + data.message);
  } catch (err) {
    typing.textContent = 'Connection error. Please try again.';
  } finally {
    document.getElementById('chatSend').disabled = false;
  }
}

function appendMsg(text, role) {
  const msgs = document.getElementById('chatMessages');
  const div  = document.createElement('div');
  div.className = `msg ${role}`;
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;
  div.appendChild(bubble);
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return bubble;
}

// ── Init ──────────────────────────────────────────────────────────────────
loadShipments();
