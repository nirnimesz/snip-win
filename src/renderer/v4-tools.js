// ═══════════════════════════════════════════════════════
// SnipWin v4.0 — ADDITIONAL DEV TOOLS (append to index.js)
// ═══════════════════════════════════════════════════════

  // ── JWT Decoder ──
  const jwtInput = $('#jwtInput');
  if (jwtInput) {
    jwtInput.addEventListener('input', decodeJWT);
  }

  function decodeJWT() {
    const token = jwtInput.value.trim();
    if (!token) {
      $('#jwtHeader').textContent = 'Paste a JWT to decode';
      $('#jwtPayload').textContent = '—';
      $('#jwtAlg').textContent = '—'; $('#jwtType').textContent = '—';
      $('#jwtIat').textContent = '—'; $('#jwtExp').textContent = '—';
      $('#jwtIss').textContent = '—'; $('#jwtSub').textContent = '—';
      $('#jwtStatus').textContent = '—';
      return;
    }
    const parts = token.split('.');
    if (parts.length !== 3) { $('#jwtHeader').textContent = 'Invalid JWT (expected 3 parts)'; return; }
    try {
      const header = JSON.parse(atob(parts[0].replace(/-/g,'+').replace(/_/g,'/')));
      const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
      $('#jwtHeader').textContent = JSON.stringify(header, null, 2);
      $('#jwtPayload').textContent = JSON.stringify(payload, null, 2);
      $('#jwtAlg').textContent = header.alg || '—';
      $('#jwtType').textContent = header.typ || '—';
      $('#jwtIat').textContent = payload.iat ? new Date(payload.iat * 1000).toLocaleString() : '—';
      $('#jwtExp').textContent = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : '—';
      $('#jwtIss').textContent = payload.iss || '—';
      $('#jwtSub').textContent = payload.sub || '—';
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp) {
        $('#jwtStatus').textContent = payload.exp > now ? 'Valid (not expired)' : 'EXPIRED';
        $('#jwtStatus').style.color = payload.exp > now ? '#10b981' : '#ef4444';
      } else { $('#jwtStatus').textContent = 'No expiration'; $('#jwtStatus').style.color = '#f59e0b'; }
    } catch (e) { $('#jwtHeader').textContent = 'Decode error: ' + e.message; }
  }

  if ($('#btnCopyJwtPayload')) {
    $('#btnCopyJwtPayload').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#jwtPayload').textContent); showToast('Payload copied!'); } catch (e) {}
    });
  }

  // ── Hash Generator ──
  const hashInput = $('#hashInput');
  const hashAlgo = $('#hashAlgo');
  if (hashInput) hashInput.addEventListener('input', generateHash);
  if (hashAlgo) hashAlgo.addEventListener('change', generateHash);

  async function generateHash() {
    const text = hashInput.value;
    if (!text) { $('#hashOutput').value = ''; $('#hashAllOutputs').innerHTML = ''; return; }
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const algo = hashAlgo.value;
    const hashBuffer = await crypto.subtle.digest(algo, data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    $('#hashOutput').value = hashHex;
    const algos = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];
    const allHashes = await Promise.all(algos.map(async (a) => {
      const buf = await crypto.subtle.digest(a, data);
      return { name: a, hash: Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('') };
    }));
    $('#hashAllOutputs').innerHTML = allHashes.map(h =>
      '<div class="hash-item"><span class="hash-item-name">' + h.name + '</span><span class="hash-item-value">' + h.hash + '</span></div>'
    ).join('');
  }

  if ($('#btnCopyHash')) {
    $('#btnCopyHash').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#hashOutput').value); showToast('Hash copied!'); } catch (e) {}
    });
  }

  // ── UUID Generator ──
  if ($('#btnGenerateUuid')) {
    $('#btnGenerateUuid').addEventListener('click', generateUUIDs);
  }

  function generateUUIDs() {
    const count = parseInt($('#uuidCount').value) || 1;
    const upper = $('#uuidUpper').checked;
    const noDash = $('#uuidNoDash').checked;
    const uuids = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      let uuid = crypto.randomUUID();
      if (upper) uuid = uuid.toUpperCase();
      if (noDash) uuid = uuid.replace(/-/g, '');
      uuids.push(uuid);
    }
    $('#uuidOutput').innerHTML = uuids.map(u =>
      '<div class="uuid-item" data-uuid="' + u + '">' + u + '</div>'
    ).join('');
    $$('.uuid-item').forEach(item => {
      item.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(item.dataset.uuid); showToast('Copied!'); } catch (e) {}
      });
    });
  }

  if ($('#btnCopyAllUuid')) {
    $('#btnCopyAllUuid').addEventListener('click', async () => {
      const items = $$('.uuid-item');
      if (items.length === 0) return;
      const text = Array.from(items).map(i => i.textContent).join('\n');
      try { await navigator.clipboard.writeText(text); showToast('All UUIDs copied!'); } catch (e) {}
    });
  }

  // ── Timestamp Converter ──
  function updateTimestampNow() {
    const now = Date.now();
    const ts = Math.floor(now / 1000);
    if ($('#tsNow')) $('#tsNow').textContent = ts;
    if ($('#tsNowLocal')) $('#tsNowLocal').textContent = new Date().toLocaleString();
    if ($('#tsNowUtc')) $('#tsNowUtc').textContent = new Date().toUTCString();
  }
  setInterval(updateTimestampNow, 1000);
  updateTimestampNow();

  if ($('#btnConvertTs')) {
    $('#btnConvertTs').addEventListener('click', () => {
      const input = $('#tsInput').value.trim();
      if (!input) return;
      let date;
      const num = parseInt(input);
      if (!isNaN(num)) { date = num > 1e12 ? new Date(num) : new Date(num * 1000); }
      else { date = new Date(input); }
      if (isNaN(date.getTime())) { showToast('Invalid date/timestamp'); return; }
      $('#tsResult').classList.remove('hidden');
      $('#tsResultSec').textContent = Math.floor(date.getTime() / 1000);
      $('#tsResultMs').textContent = date.getTime();
      $('#tsResultIso').textContent = date.toISOString();
      $('#tsResultLocal').textContent = date.toLocaleString();
      const diff = Date.now() - date.getTime();
      const absDiff = Math.abs(diff);
      const suffix = diff > 0 ? 'ago' : 'from now';
      let relative;
      if (absDiff < 60000) relative = Math.floor(absDiff / 1000) + 's ' + suffix;
      else if (absDiff < 3600000) relative = Math.floor(absDiff / 60000) + 'm ' + suffix;
      else if (absDiff < 86400000) relative = Math.floor(absDiff / 3600000) + 'h ' + suffix;
      else relative = Math.floor(absDiff / 86400000) + 'd ' + suffix;
      $('#tsResultRelative').textContent = relative;
    });
  }

  if ($('#btnCopyTsNow')) {
    $('#btnCopyTsNow').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#tsNow').textContent); showToast('Timestamp copied!'); } catch (e) {}
    });
  }

  // ── Cron Parser ──
  if ($('#btnParseCron')) $('#btnParseCron').addEventListener('click', parseCron);
  if ($('#cronInput')) $('#cronInput').addEventListener('input', parseCron);

  function parseCron() {
    const expr = $('#cronInput').value.trim();
    if (!expr) return;
    const parts = expr.split(/\s+/);
    if (parts.length < 5) { $('#cronDescription').textContent = 'Invalid cron (need 5 fields: min hour day month weekday)'; return; }
    const labels = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
    const ids = ['cronMin', 'cronHour', 'cronDay', 'cronMonth', 'cronWeekday'];
    parts.forEach((p, i) => { if (ids[i]) $(ids[i]).textContent = p; });

    // Simple description
    let desc = '';
    if (parts[0].startsWith('*/')) desc = 'Every ' + parts[0].slice(2) + ' minutes';
    else if (parts[0] === '*') desc = 'Every minute';
    else desc = 'At minute ' + parts[0];
    if (parts[1] !== '*') desc += ', hour ' + parts[1];
    $('#cronDescription').textContent = desc;

    // Next 5 runs (approximate)
    const now = new Date();
    const nextRuns = [];
    for (let i = 1; i <= 5; i++) {
      const future = new Date(now.getTime() + i * 60000 * parseInt(parts[0].replace('*/', '') || 1));
      nextRuns.push('<div class="cron-next-run"><span>Run #' + i + '</span><span>' + future.toLocaleString() + '</span></div>');
    }
    $('#cronNextRuns').innerHTML = nextRuns.join('');
  }

  // ── Base64 Converter ──
  const base64Plain = $('#base64Plain');
  const base64Encoded = $('#base64Encoded');

  if ($('#btnBase64Encode')) {
    $('#btnBase64Encode').addEventListener('click', () => {
      try {
        base64Encoded.value = btoa(unescape(encodeURIComponent(base64Plain.value)));
        $('#base64Info').textContent = base64Encoded.value.length + ' characters';
      } catch (e) { $('#base64Info').textContent = 'Encode error: ' + e.message; }
    });
  }

  if ($('#btnBase64Decode')) {
    $('#btnBase64Decode').addEventListener('click', () => {
      try {
        base64Plain.value = decodeURIComponent(escape(atob(base64Encoded.value)));
        $('#base64Info').textContent = base64Plain.value.length + ' characters';
      } catch (e) { $('#base64Info').textContent = 'Decode error: ' + e.message; }
    });
  }

  if ($('#btnBase64Swap')) {
    $('#btnBase64Swap').addEventListener('click', () => {
      const tmp = base64Plain.value;
      base64Plain.value = base64Encoded.value;
      base64Encoded.value = tmp;
    });
  }

  if ($('#btnCopyBase64')) {
    $('#btnCopyBase64').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(base64Encoded.value); showToast('Base64 copied!'); } catch (e) {}
    });
  }

  // ── YAML <-> JSON ──
  // Simple YAML parser (handles basic key:value and lists)
  function simpleYamlToJson(yaml) {
    const lines = yaml.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const result = {};
    let currentKey = null;
    let currentList = null;

    lines.forEach(line => {
      const indent = line.search(/\S/);
      const trimmed = line.trim();

      if (trimmed.startsWith('- ')) {
        if (currentList !== null) {
          result[currentKey].push(trimmed.slice(2).trim());
        }
        return;
      }

      const colonIdx = trimmed.indexOf(':');
      if (colonIdx > 0) {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        if (val === '') {
          result[key] = [];
          currentKey = key;
          currentList = key;
        } else {
          result[key] = val.replace(/^["']|["']$/g, '');
          currentList = null;
        }
      }
    });

    return result;
  }

  if ($('#btnYamlToJson')) {
    $('#btnYamlToJson').addEventListener('click', () => {
      try {
        const yaml = $('#yamlInput').value;
        const json = simpleYamlToJson(yaml);
        $('#jsonOutput').value = JSON.stringify(json, null, 2);
        $('#yamlStatus').textContent = 'Converted successfully';
        $('#yamlStatus').style.color = '#10b981';
      } catch (e) {
        $('#yamlStatus').textContent = 'Error: ' + e.message;
        $('#yamlStatus').style.color = '#ef4444';
      }
    });
  }

  if ($('#btnJsonToYaml')) {
    $('#btnJsonToYaml').addEventListener('click', () => {
      try {
        const json = JSON.parse($('#jsonOutput').value || $('#yamlInput').value);
        let yaml = '';
        Object.entries(json).forEach(([k, v]) => {
          if (Array.isArray(v)) {
            yaml += k + ':\n';
            v.forEach(item => { yaml += '  - ' + item + '\n'; });
          } else {
            yaml += k + ': ' + v + '\n';
          }
        });
        $('#yamlInput').value = yaml;
        $('#yamlStatus').textContent = 'Converted successfully';
        $('#yamlStatus').style.color = '#10b981';
      } catch (e) {
        $('#yamlStatus').textContent = 'Error: ' + e.message;
        $('#yamlStatus').style.color = '#ef4444';
      }
    });
  }

  if ($('#btnCopyYamlJson')) {
    $('#btnCopyYamlJson').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#jsonOutput').value); showToast('Copied!'); } catch (e) {}
    });
  }

  // ── Markdown Preview ──
  const mdInput = $('#mdInput');
  if (mdInput) {
    mdInput.addEventListener('input', renderMarkdown);
  }

  function renderMarkdown() {
    let md = mdInput.value;
    if (!md.trim()) { $('#mdPreview').innerHTML = '<div class="md-empty">Start typing to see preview</div>'; return; }

    // Simple Markdown -> HTML
    let html = md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^\> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^\- (.+)$/gm, '<li>$1</li>')
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');

    // Wrap consecutive li in ul
    html = html.replace(/((?:<li>.*?<\/li><br>?)+)/g, '<ul>$1</ul>');
    html = '<p>' + html + '</p>';

    $('#mdPreview').innerHTML = html;
  }

  if ($('#btnCopyMdHtml')) {
    $('#btnCopyMdHtml').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#mdPreview').innerHTML); showToast('HTML copied!'); } catch (e) {}
    });
  }

  // ── Color Palette Extractor ──
  if ($('#btnLoadColorImage')) {
    $('#btnLoadColorImage').addEventListener('click', () => $('#colorImageFile').click());
  }

  if ($('#colorImageFile')) {
    $('#colorImageFile').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const container = $('#colorImageContainer');
      container.innerHTML = '<img src="' + url + '" id="colorSourceImg" crossorigin="anonymous">';

      const img = $('#colorSourceImg');
      img.onload = () => extractColors(img);
    });
  }

  function extractColors(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    const colorCounts = {};

    // Sample every 4th pixel
    for (let i = 0; i < pixels.length; i += 16) {
      const r = Math.round(pixels[i] / 32) * 32;
      const g = Math.round(pixels[i + 1] / 32) * 32;
      const b = Math.round(pixels[i + 2] / 32) * 32;
      const key = r + ',' + g + ',' + b;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    // Sort by frequency and take top 8
    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const palette = sorted.map(([rgb]) => {
      const [r, g, b] = rgb.split(',').map(Number);
      return { r, g, b, hex: rgbToHex(r, g, b) };
    });

    // Display palette
    $('#colorPalette').innerHTML = palette.map(c =>
      '<div class="color-swatch" data-hex="' + c.hex + '"><div class="color-swatch-box" style="background:' + c.hex + '"></div><div class="color-swatch-hex">' + c.hex + '</div></div>'
    ).join('');

    $$('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(swatch.dataset.hex); showToast('Color ' + swatch.dataset.hex + ' copied!'); } catch (e) {}
      });
    });

    $('#colorInfo').textContent = palette.length + ' colors extracted';
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  if ($('#btnCopyPalette')) {
    $('#btnCopyPalette').addEventListener('click', async () => {
      const swatches = $$('.color-swatch-hex');
      if (swatches.length === 0) return;
      const colors = Array.from(swatches).map(s => s.textContent).join(', ');
      try { await navigator.clipboard.writeText(colors); showToast('Palette copied!'); } catch (e) {}
    });
  }
