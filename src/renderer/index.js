// ── SnipWin v3.0 Renderer Process — Developer Visual Toolkit ──
(function() {
  'use strict';

  // ── State ──
  let currentRequest = null;
  let currentTool = 'select';
  let fabricCanvas = null;
  let sourceImage = null;
  let settings = {};

  // ── DOM Helpers ──
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ── DOM Elements ──
  const reviewPanel = $('#reviewPanel');
  const reviewEmpty = $('#reviewEmpty');
  const reviewActive = $('#reviewActive');
  const reviewMessage = $('#reviewMessage');
  const reviewContent = $('#reviewContent');
  const canvasContainer = $('#canvasContainer');
  const annotationToolbar = $('#annotationToolbar');
  const reviewText = $('#reviewText');
  const btnApprove = $('#btnApprove');
  const btnChanges = $('#btnChanges');
  const btnUndo = $('#btnUndo');
  const btnClear = $('#btnClear');
  const btnCaptureScreen = $('#btnCaptureScreen');
  const btnCaptureWindow = $('#btnCaptureWindow');
  const btnQuickCapture = $('#btnQuickCapture');
  const btnQuickCode = $('#btnQuickCode');
  const btnSettings = $('#btnSettings');
  const btnRefresh = $('#btnRefresh');
  const galleryPanel = $('#galleryPanel');
  const galleryGrid = $('#galleryGrid');
  const gallerySearch = $('#gallerySearch');
  const galleryCount = $('#galleryCount');
  const settingsModal = $('#settingsModal');
  const settingsBackdrop = $('#settingsBackdrop');
  const btnCloseSettings = $('#btnCloseSettings');
  const btnSaveSettings = $('#btnSaveSettings');
  const btnCancelSettings = $('#btnCancelSettings');
  const themeSelect = $('#themeSelect');
  const colorRect = $('#colorRect');
  const colorArrow = $('#colorArrow');
  const colorText = $('#colorText');
  const hotkeyInput = $('#hotkeyInput');
  const qualityRange = $('#qualityRange');
  const qualityValue = $('#qualityValue');
  const toolsPanel = $('#toolsPanel');

  // ── Initialize Mermaid ──
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  }

  // ── Initialize Highlight.js ──
  if (typeof hljs !== 'undefined') {
    hljs.registerLanguage('javascript', window.hljs_javascript);
    hljs.registerLanguage('typescript', window.hljs_typescript);
    hljs.registerLanguage('python', window.hljs_python);
    hljs.registerLanguage('html', window.hljs_xml);
    hljs.registerLanguage('css', window.hljs_css);
    hljs.registerLanguage('json', window.hljs_json);
    hljs.registerLanguage('sql', window.hljs_sql);
    hljs.registerLanguage('rust', window.hljs_rust);
    hljs.registerLanguage('go', window.hljs_go);
    hljs.registerLanguage('java', window.hljs_java);
    hljs.registerLanguage('cpp', window.hljs_cpp);
    hljs.registerLanguage('csharp', window.hljs_csharp);
    hljs.registerLanguage('bash', window.hljs_bash);
    hljs.registerLanguage('yaml', window.hljs_yaml);
    hljs.registerLanguage('markdown', window.hljs_markdown);
  }

  // ═══════════════════════════════════════════════════════
  // TAB NAVIGATION
  // ═══════════════════════════════════════════════════════
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      reviewPanel.classList.toggle('hidden', tab !== 'review');
      toolsPanel.classList.toggle('hidden', tab !== 'tools');
      galleryPanel.classList.toggle('hidden', tab !== 'gallery');
      if (tab === 'gallery') loadGallery();
    });
  });

  // ═══════════════════════════════════════════════════════
  // REVIEW FLOW (Mermaid, HTML, Image)
  // ═══════════════════════════════════════════════════════
  window.snipAPI.onRenderRequest(async (data) => {
    currentRequest = data;
    reviewEmpty.classList.add('hidden');
    reviewActive.classList.remove('hidden');
    reviewMessage.textContent = data.message || `Review this ${data.format}`;
    reviewText.value = '';

    if (data.format === 'mermaid') await renderMermaid(data.content);
    else if (data.format === 'html') renderHTML(data.content);

    initFabricCanvas();
  });

  window.snipAPI.onOpenRequest(async (data) => {
    currentRequest = data;
    reviewEmpty.classList.add('hidden');
    reviewActive.classList.remove('hidden');
    reviewMessage.textContent = data.message || 'Review this image';
    reviewText.value = '';
    await renderImage(data.filepath);
  });

  window.snipAPI.onCaptureScreen(async () => {
    const result = await window.snipAPI.captureScreen('screen');
    if (result && !result.error) {
      currentRequest = { filepath: result.path, message: 'Captured screen' };
      reviewEmpty.classList.add('hidden');
      reviewActive.classList.remove('hidden');
      reviewMessage.textContent = 'Captured screen';
      reviewText.value = '';
      await renderImage(result.path);
    }
  });

  if (window.snipAPI.onSettingsOpen) window.snipAPI.onSettingsOpen(() => openSettings());

  async function renderMermaid(content) {
    reviewContent.innerHTML = '<div class="mermaid-container"><div class="mermaid">' + content + '</div></div>';
    try {
      if (typeof mermaid !== 'undefined') await mermaid.run({ nodes: reviewContent.querySelectorAll('.mermaid') });
    } catch (e) {
      reviewContent.innerHTML = `<div style="padding:24px;color:#ef4444"><p>Failed to render:</p><pre style="font-size:0.75rem;white-space:pre-wrap">${escapeHtml(e.message)}</pre></div>`;
    }
  }

  function renderHTML(content) {
    const sanitized = content.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/gi, '').replace(/on\w+='[^']*'/gi, '');
    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-same-origin';
    iframe.srcdoc = sanitized;
    reviewContent.innerHTML = '';
    reviewContent.appendChild(iframe);
  }

  async function renderImage(filepath) {
    try {
      const response = await fetch('file:///' + filepath.replace(/\\/g, '/'));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { reviewContent.innerHTML = ''; reviewContent.appendChild(img); initFabricCanvas(img); };
      img.onerror = () => { reviewContent.innerHTML = '<div style="padding:24px;color:#ef4444">Failed to load image</div>'; initFabricCanvas(); };
      img.src = url;
    } catch (e) {
      reviewContent.innerHTML = `<div style="padding:24px;color:#ef4444">Failed to load: ${escapeHtml(e.message)}</div>`;
      initFabricCanvas();
    }
  }

  function escapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // ═══════════════════════════════════════════════════════
  // FABRIC.JS ANNOTATION CANVAS
  // ═══════════════════════════════════════════════════════
  function initFabricCanvas(imgElement) {
    const container = canvasContainer;
    const w = Math.max(container.clientWidth, 800);
    const h = Math.max(400, Math.min(500, window.innerHeight * 0.4));
    if (fabricCanvas) fabricCanvas.dispose();
    fabricCanvas = new fabric.Canvas('annotationCanvas', { width: w, height: h, backgroundColor: '#1e293b', selection: true });

    if (imgElement) {
      const img = new fabric.Image(imgElement, { left: 0, top: 0, scaleX: w / imgElement.naturalWidth, scaleY: h / imgElement.naturalHeight, selectable: false, evented: false });
      fabricCanvas.add(img);
      fabricCanvas.sendToBack(img);
      sourceImage = img;
    }

    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.color = settings.annotationColors?.arrow || '#ef4444';
    document.addEventListener('keydown', handleCanvasKeydown);
  }

  function handleCanvasKeydown(e) {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    switch (e.key.toLowerCase()) {
      case 'v': setTool('select'); break;
      case 'r': setTool('rect'); break;
      case 'a': setTool('arrow'); break;
      case 't': setTool('text'); break;
      case 'b': setTool('blur'); break;
      case 'f': setTool('freehand'); break;
      case 'z': if (e.ctrlKey && fabricCanvas) { const a = fabricCanvas.getActiveObject(); if (a) fabricCanvas.remove(a); e.preventDefault(); } break;
      case 'escape': if (!settingsModal.classList.contains('hidden')) closeSettings(); else cancelReview(); break;
      case 'enter': if (e.ctrlKey) submitReview('approved'); break;
    }
  }

  function setTool(tool) {
    currentTool = tool;
    $$('.tool-btn[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    if (!fabricCanvas) return;
    fabricCanvas.isDrawingMode = (tool === 'freehand');
    if (tool === 'freehand') {
      fabricCanvas.freeDrawingBrush.width = 3;
      fabricCanvas.freeDrawingBrush.color = settings.annotationColors?.arrow || '#ef4444';
    }
    if (['rect','arrow','text','blur'].includes(tool)) {
      fabricCanvas.off('mouse:down');
      fabricCanvas.on('mouse:down', (opt) => {
        const p = fabricCanvas.getPointer(opt.e);
        if (tool === 'rect') {
          fabricCanvas.add(new fabric.Rect({ left: p.x, top: p.y, width: 100, height: 60, fill: 'transparent', stroke: settings.annotationColors?.rect || '#6366f1', strokeWidth: 2, strokeDashArray: [5,5] }));
        } else if (tool === 'arrow') {
          const cx = p.x+80, cy = p.y-40, angle = Math.atan2(cy-p.y, cx-p.x), hl = 12;
          const g = new fabric.Group([
            new fabric.Line([p.x, p.y, cx, cy], { stroke: settings.annotationColors?.arrow || '#ef4444', strokeWidth: 2 }),
            new fabric.Line([cx, cy, cx-hl*Math.cos(angle-Math.PI/6), cy-hl*Math.sin(angle-Math.PI/6)], { stroke: settings.annotationColors?.arrow || '#ef4444', strokeWidth: 2 }),
            new fabric.Line([cx, cy, cx-hl*Math.cos(angle+Math.PI/6), cy-hl*Math.sin(angle+Math.PI/6)], { stroke: settings.annotationColors?.arrow || '#ef4444', strokeWidth: 2 })
          ]);
          fabricCanvas.add(g);
        } else if (tool === 'text') {
          const t = new fabric.IText('Type here', { left: p.x, top: p.y, fill: settings.annotationColors?.text || '#f1f5f9', fontSize: 16 });
          fabricCanvas.add(t); fabricCanvas.setActiveObject(t); t.enterEditing(); t.selectAll();
        } else if (tool === 'blur') {
          fabricCanvas.add(new fabric.Rect({ left: p.x-40, top: p.y-20, width: 80, height: 40, fill: 'rgba(0,0,0,0.5)', stroke: 'transparent', rx: 4, ry: 4 }));
        }
        fabricCanvas.renderAll();
        setTool('select');
      });
    } else { fabricCanvas.off('mouse:down'); }
  }

  // ═══════════════════════════════════════════════════════
  // REVIEW ACTIONS
  // ═══════════════════════════════════════════════════════
  btnApprove.addEventListener('click', () => submitReview('approved'));
  btnChanges.addEventListener('click', () => submitReview('changes_requested'));

  function submitReview(status) {
    let imageData = null, edited = false;
    if (fabricCanvas) {
      const hasAnnotations = sourceImage ? fabricCanvas.getObjects().length > 1 : fabricCanvas.getObjects().length > 0;
      if (hasAnnotations) { imageData = fabricCanvas.toDataURL({ format: 'png', quality: 0.92 }); edited = true; }
    }
    window.snipAPI.submitReview({ status, edited, imageData, path: currentRequest?.filepath || null, text: reviewText.value });
    resetReview();
  }

  function cancelReview() { window.snipAPI.cancelReview(); resetReview(); }
  function resetReview() {
    reviewActive.classList.add('hidden'); reviewEmpty.classList.remove('hidden');
    currentRequest = null;
    if (fabricCanvas) { fabricCanvas.dispose(); fabricCanvas = null; }
    sourceImage = null;
  }

  $$('.tool-btn[data-tool]').forEach(btn => btn.addEventListener('click', () => setTool(btn.dataset.tool)));
  btnUndo.addEventListener('click', () => { if (fabricCanvas) { const a = fabricCanvas.getActiveObject(); if (a) fabricCanvas.remove(a); fabricCanvas.renderAll(); } });
  btnClear.addEventListener('click', () => { if (fabricCanvas) { fabricCanvas.getObjects().forEach(o => { if (o !== sourceImage) fabricCanvas.remove(o); }); fabricCanvas.renderAll(); } });

  // ═══════════════════════════════════════════════════════
  // EXPORT
  // ═══════════════════════════════════════════════════════
  $$('.export-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const format = btn.dataset.export;
      if (format === 'png') {
        const dataUrl = reviewContent.querySelector('canvas')?.toDataURL('image/png') || reviewContent.querySelector('img')?.src;
        if (dataUrl) downloadDataURL(dataUrl, 'snipwin-export.png');
      } else if (format === 'clipboard') {
        const canvas = reviewContent.querySelector('canvas');
        if (canvas) {
          canvas.toBlob(async (blob) => {
            try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); showToast('Copied to clipboard!'); }
            catch (e) { showToast('Clipboard write failed'); }
          });
        }
      } else if (format === 'base64') {
        const canvas = reviewContent.querySelector('canvas');
        if (canvas) {
          const b64 = canvas.toDataURL('image/png');
          try { await navigator.clipboard.writeText(b64); showToast('Base64 copied!'); }
          catch (e) { showToast('Copy failed'); }
        }
      }
    });
  });

  function downloadDataURL(dataUrl, filename) {
    const a = document.createElement('a');
    a.href = dataUrl; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, { position:'fixed', bottom:'20px', left:'50%', transform:'translateX(-50%)', background:'var(--accent)', color:'white', padding:'8px 16px', borderRadius:'8px', fontSize:'0.8125rem', fontWeight:'600', zIndex:'9999', animation:'fadeIn 0.3s ease-out' });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
  }

  // ═══════════════════════════════════════════════════════
  // SCREEN CAPTURE
  // ═══════════════════════════════════════════════════════
  btnCaptureScreen.addEventListener('click', async () => {
    const result = await window.snipAPI.captureScreen('screen');
    if (result && !result.error) { currentRequest = { filepath: result.path, message: 'Captured screen' }; reviewEmpty.classList.add('hidden'); reviewActive.classList.remove('hidden'); reviewMessage.textContent = 'Captured screen'; reviewText.value = ''; await renderImage(result.path); }
  });
  btnCaptureWindow.addEventListener('click', async () => {
    const result = await window.snipAPI.captureScreen('window');
    if (result && !result.error) { currentRequest = { filepath: result.path, message: 'Captured window' }; reviewEmpty.classList.add('hidden'); reviewActive.classList.remove('hidden'); reviewMessage.textContent = 'Captured window'; reviewText.value = ''; await renderImage(result.path); }
  });
  btnQuickCapture.addEventListener('click', async () => {
    const result = await window.snipAPI.captureScreen('screen');
    if (result && !result.error) { currentRequest = { filepath: result.path, message: 'Captured screen' }; reviewEmpty.classList.add('hidden'); reviewActive.classList.remove('hidden'); reviewMessage.textContent = 'Captured screen'; reviewText.value = ''; await renderImage(result.path); }
  });

  // ═══════════════════════════════════════════════════════
  // GALLERY
  // ═══════════════════════════════════════════════════════
  btnRefresh.addEventListener('click', loadGallery);
  gallerySearch.addEventListener('input', () => filterGallery());
  async function loadGallery() {
    galleryGrid.innerHTML = `<div class="gallery-empty"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><p>Screenshots will appear here after reviews</p><p class="hint">Use CLI or AI agent to send content</p></div>`;
    galleryCount.classList.add('hidden');
  }
  function filterGallery() {
    const q = gallerySearch.value.toLowerCase();
    $$('.gallery-item').forEach(item => { item.style.display = item.textContent.toLowerCase().includes(q) ? '' : 'none'; });
  }

  // ═══════════════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════════════
  btnSettings.addEventListener('click', openSettings);
  btnCloseSettings.addEventListener('click', closeSettings);
  settingsBackdrop.addEventListener('click', closeSettings);
  btnCancelSettings.addEventListener('click', closeSettings);
  btnSaveSettings.addEventListener('click', saveSettings);
  qualityRange.addEventListener('input', () => { qualityValue.textContent = qualityRange.value + '%'; });

  async function openSettings() {
    try { settings = await window.snipAPI.getSettings(); } catch (e) { settings = {}; }
    themeSelect.value = settings.theme || 'dark';
    colorRect.value = settings.annotationColors?.rect || '#6366f1';
    colorArrow.value = settings.annotationColors?.arrow || '#ef4444';
    colorText.value = settings.annotationColors?.text || '#f1f5f9';
    hotkeyInput.value = settings.hotkey || 'Ctrl+Shift+S';
    qualityRange.value = Math.round((settings.screenshotQuality || 0.92) * 100);
    qualityValue.textContent = qualityRange.value + '%';
    settingsModal.classList.remove('hidden');
  }

  function closeSettings() { settingsModal.classList.add('hidden'); }

  async function saveSettings() {
    const newSettings = { theme: themeSelect.value, annotationColors: { rect: colorRect.value, arrow: colorArrow.value, text: colorText.value, blur: 'rgba(0,0,0,0.5)' }, hotkey: hotkeyInput.value, screenshotQuality: parseInt(qualityRange.value) / 100 };
    try { settings = await window.snipAPI.saveSettings(newSettings); applyTheme(settings.theme); } catch (e) {}
    closeSettings();
  }

  function applyTheme(theme) { document.documentElement.setAttribute('data-theme', theme || 'dark'); }

  // ═══════════════════════════════════════════════════════
  // V3.0 — DEV TOOLS
  // ═══════════════════════════════════════════════════════

  // ── Tool Tab Switching ──
  $$('.tool-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tool-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      $$('.tool-content').forEach(c => { c.classList.remove('active'); c.classList.add('hidden'); });
      const target = $(`#tool${tab.dataset.toolTab.charAt(0).toUpperCase() + tab.dataset.toolTab.slice(1).replace('-','')}`) || $(`#tool${tab.dataset.toolTab.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^./, s => s.toUpperCase())}`);
      // Simpler mapping
      const map = { 'code-snippet': 'toolCodeSnippet', 'json-viewer': 'toolJsonViewer', 'regex-tester': 'toolRegexTester', 'css-preview': 'toolCssPreview', 'visual-diff': 'toolVisualDiff', 'tree-diagram': 'toolTreeDiagram' };
      const el = $(`#${map[tab.dataset.toolTab]}`);
      if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
    });
  });

  // ── Quick Code Screenshot ──
  btnQuickCode.addEventListener('click', () => {
    $$('.tab-btn')[1].click(); // Switch to tools tab
    $$('.tool-tab')[0].click(); // Switch to code snippet
    $('#codeInput').focus();
  });

  // ═══════════════════════════════════════════════════════
  // CODE SNIPPET TOOL (Carbon-style)
  // ═══════════════════════════════════════════════════════
  const codeInput = $('#codeInput');
  const codePreview = $('#codePreview');
  const codeTheme = $('#codeTheme');
  const codeLang = $('#codeLang');
  const codeLineNumbers = $('#codeLineNumbers');
  const codeWindowFrame = $('#codeWindowFrame');

  function updateCodePreview() {
    const code = codeInput.value;
    if (!code.trim()) { codePreview.innerHTML = ''; return; }

    const lang = codeLang.value === 'auto' ? 'auto' : codeLang.value;
    let highlighted = code;

    if (typeof hljs !== 'undefined') {
      try {
        const result = lang === 'auto' ? hljs.highlightAuto(code) : hljs.highlight(code, { language: lang });
        highlighted = result.value;
      } catch (e) { highlighted = escapeHtml(code); }
    } else {
      highlighted = escapeHtml(code);
    }

    const lines = code.split('\n');
    const lineNums = codeLineNumbers.checked ? `<div class="code-line-numbers">${lines.map((_, i) => i + 1).join('\n')}</div>` : '';
    const frame = codeWindowFrame.checked ? `
      <div class="code-window-frame">
        <div class="code-titlebar">
          <div class="code-dots"><div class="code-dot red"></div><div class="code-dot yellow"></div><div class="code-dot green"></div></div>
          <div class="code-titlebar-text">snippet.${lang === 'auto' ? 'txt' : lang}</div>
        </div>
        <div class="code-body" style="padding-left:${codeLineNumbers.checked ? '56px' : '24px'}">
          ${lineNums}
          <pre><code class="hljs">${highlighted}</code></pre>
        </div>
      </div>
    ` : `<div class="code-body" style="padding-left:${codeLineNumbers.checked ? '56px' : '24px'}">${lineNums}<pre><code class="hljs">${highlighted}</code></pre></div>`;

    codePreview.innerHTML = frame;
  }

  codeInput.addEventListener('input', updateCodePreview);
  codeTheme.addEventListener('change', () => {
    const themeMap = { 'github-dark': 'github-dark', 'one-dark': 'atom-one-dark', 'dracula': 'dracula', 'monokai': 'monokai', 'nord': 'nord', 'material': 'material-palenight', 'tokyo-night': 'tokyo-night', 'catppuccin': 'catppuccin-mocha' };
    const hljsTheme = themeMap[codeTheme.value] || 'github-dark';
    $('#hljsTheme').href = `https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/${hljsTheme}.min.css`;
    updateCodePreview();
  });
  codeLang.addEventListener('change', updateCodePreview);
  codeLineNumbers.addEventListener('change', updateCodePreview);
  codeWindowFrame.addEventListener('change', updateCodePreview);

  // Copy code as PNG
  $('#btnCopyCodePNG').addEventListener('click', async () => {
    if (!codeInput.value.trim()) return;
    const canvas = await renderCodeToCanvas();
    if (canvas) {
      canvas.toBlob(async (blob) => {
        try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]); showToast('Code image copied to clipboard!'); }
        catch (e) { showToast('Copy failed'); }
      });
    }
  });

  $('#btnDownloadCodePNG').addEventListener('click', async () => {
    if (!codeInput.value.trim()) return;
    const canvas = await renderCodeToCanvas();
    if (canvas) { downloadDataURL(canvas.toDataURL('image/png'), 'code-snippet.png'); }
  });

  async function renderCodeToCanvas() {
    const preview = codePreview.querySelector('.code-window-frame') || codePreview;
    if (!preview) return null;

    // Use html2canvas-like approach: render to offscreen canvas
    const svgData = new XMLSerializer().serializeToString(createSVGFromElement(preview));
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width * 2; c.height = img.height * 2;
        const ctx = c.getContext('2d');
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        resolve(c);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  }

  function createSVGFromElement(el) {
    const clone = el.cloneNode(true);
    const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
    const head = document.createElement('div');
    styles.forEach(s => head.appendChild(s.cloneNode(true)));
    const wrapper = document.createElement('div');
    wrapper.appendChild(head);
    wrapper.appendChild(clone);
    wrapper.style.width = el.offsetWidth + 'px';
    wrapper.style.background = '#1e1e2e';
    wrapper.style.padding = '24px';
    wrapper.style.fontFamily = '-apple-system, sans-serif';
    document.body.appendChild(wrapper);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', el.offsetWidth + 48);
    svg.setAttribute('height', el.offsetHeight + 48);
    const fo = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
    fo.setAttribute('width', '100%');
    fo.setAttribute('height', '100%');
    fo.innerHTML = new XMLSerializer().serializeToString(wrapper);
    svg.appendChild(fo);
    document.body.removeChild(wrapper);
    return svg;
  }

  // ═══════════════════════════════════════════════════════
  // JSON TREE VIEWER
  // ═══════════════════════════════════════════════════════
  const jsonInput = $('#jsonInput');
  const jsonTree = $('#jsonTree');

  jsonInput.addEventListener('input', () => {
    try {
      const data = JSON.parse(jsonInput.value);
      jsonTree.innerHTML = '';
      jsonTree.appendChild(buildJsonTree(data, 'root', 0, true));
    } catch (e) {
      jsonTree.innerHTML = `<div style="color:#ef4444;padding:12px;font-size:0.75rem">Invalid JSON: ${escapeHtml(e.message)}</div>`;
    }
  });

  function buildJsonTree(data, key, depth, isLast) {
    const node = document.createElement('div');
    node.className = 'json-node';
    node.style.marginLeft = depth > 0 ? '20px' : '0';

    const type = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data;
    const indent = '  '.repeat(depth);

    if (type === 'object' || type === 'array') {
      const entries = type === 'array' ? data : Object.entries(data);
      const count = type === 'array' ? data.length : Object.keys(data).length;
      const bracket = type === 'array' ? ['[', ']'] : ['{', '}'];
      const toggle = document.createElement('span');
      toggle.className = 'json-toggle';
      toggle.textContent = '▼';
      toggle.addEventListener('click', () => {
        node.classList.toggle('json-collapsed');
        toggle.textContent = node.classList.contains('json-collapsed') ? '▶' : '▼';
      });

      const header = document.createElement('div');
      header.innerHTML = `<span class="json-key">${escapeHtml(String(key))}</span><span class="json-bracket">${bracket[0]}</span><span class="json-type-badge">${count} ${type === 'array' ? 'items' : 'keys'}</span>`;
      header.prepend(toggle);
      node.appendChild(header);

      const children = document.createElement('div');
      children.className = 'json-children';
      if (type === 'array') {
        data.forEach((item, i) => children.appendChild(buildJsonTree(item, i, depth + 1, i === data.length - 1)));
      } else {
        const keys = Object.keys(data);
        keys.forEach((k, i) => children.appendChild(buildJsonTree(data[k], k, depth + 1, i === keys.length - 1)));
      }
      node.appendChild(children);

      const footer = document.createElement('div');
      footer.innerHTML = `<span class="json-bracket">${bracket[1]}</span>`;
      node.appendChild(footer);
    } else {
      const valueClass = type === 'string' ? 'json-string' : type === 'number' ? 'json-number' : type === 'boolean' ? 'json-boolean' : 'json-null';
      const displayValue = type === 'string' ? `"${escapeHtml(data)}"` : String(data);
      node.innerHTML = `<span class="json-key">${escapeHtml(String(key))}</span>: <span class="${valueClass}">${displayValue}</span>`;
    }

    return node;
  }

  $('#btnFormatJSON').addEventListener('click', () => {
    try { jsonInput.value = JSON.stringify(JSON.parse(jsonInput.value), null, 2); } catch (e) {}
  });

  $('#btnMinifyJSON').addEventListener('click', () => {
    try { jsonInput.value = JSON.stringify(JSON.parse(jsonInput.value)); } catch (e) {}
  });

  // ═══════════════════════════════════════════════════════
  // REGEX TESTER
  // ═══════════════════════════════════════════════════════
  const regexPattern = $('#regexPattern');
  const regexTestString = $('#regexTestString');
  const regexResult = $('#regexResult');
  const regexGroups = $('#regexGroups');
  const regexMatchCount = $('#regexMatchCount');
  const regexFlags = $('#regexFlags');

  function updateRegex() {
    const pattern = regexPattern.value;
    const testStr = regexTestString.value;
    if (!pattern || !testStr) {
      regexResult.innerHTML = '<div class="regex-empty"><p>Enter a regex pattern and test string</p></div>';
      regexMatchCount.textContent = '0 matches';
      regexGroups.innerHTML = '';
      return;
    }

    let flags = '';
    if ($('#regexCase').checked) flags += 'i';
    if ($('#regexGlobal').checked) flags += 'g';
    if ($('#regexMulti').checked) flags += 'm';
    regexFlags.textContent = flags;

    try {
      const regex = new RegExp(pattern, flags);
      const matches = [...testStr.matchAll(new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'))];

      // Highlight matches
      let resultHtml = escapeHtml(testStr);
      if (matches.length > 0) {
        // Build highlighted version
        let html = '';
        let lastIdx = 0;
        matches.forEach((m, i) => {
          html += escapeHtml(testStr.slice(lastIdx, m.index));
          html += `<span class="regex-match">${escapeHtml(m[0])}</span>`;
          lastIdx = m.index + m[0].length;
        });
        html += escapeHtml(testStr.slice(lastIdx));
        resultHtml = html;
      }

      regexResult.innerHTML = resultHtml;
      regexMatchCount.textContent = `${matches.length} match${matches.length !== 1 ? 'es' : ''}`;

      // Show capture groups
      if (matches.length > 0 && matches[0].length > 1) {
        regexGroups.innerHTML = matches.slice(0, 10).map((m, i) =>
          `<div class="regex-group-item"><span class="regex-group-name">#${i}</span><span class="regex-group-value">${escapeHtml(m[0])}</span></div>` +
          m.slice(1).map((g, j) => `<div class="regex-group-item"><span class="regex-group-name">$${j+1}</span><span class="regex-group-value">${g !== undefined ? escapeHtml(g) : '<em>undefined</em>'}</span></div>`).join('')
        ).join('');
      } else {
        regexGroups.innerHTML = '';
      }
    } catch (e) {
      regexResult.innerHTML = `<div style="color:#ef4444;padding:8px">Invalid regex: ${escapeHtml(e.message)}</div>`;
      regexMatchCount.textContent = 'Invalid pattern';
    }
  }

  regexPattern.addEventListener('input', updateRegex);
  regexTestString.addEventListener('input', updateRegex);
  $('#regexCase').addEventListener('change', updateRegex);
  $('#regexGlobal').addEventListener('change', updateRegex);
  $('#regexMulti').addEventListener('change', updateRegex);

  $('#btnCopyRegex').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(regexPattern.value); showToast('Regex pattern copied!'); } catch (e) {}
  });

  // ═══════════════════════════════════════════════════════
  // CSS VISUAL BUILDER
  // ═══════════════════════════════════════════════════════
  const cssToolType = $('#cssToolType');
  const cssPreviewBox = $('#cssPreviewBox');
  const cssOutput = $('#cssOutput');

  function updateCSSPreview() {
    const type = cssToolType.value;
    // Show/hide control groups
    $$('.css-ctrl-group').forEach(g => g.classList.add('hidden'));
    const ctrlMap = { gradient: 'ctrlGradient', shadow: 'ctrlShadow', border: 'ctrlBorder', filter: 'ctrlFilter' };
    const ctrl = $(`#${ctrlMap[type]}`);
    if (ctrl) ctrl.classList.remove('hidden');

    let css = '';
    if (type === 'gradient') {
      const gradType = $('#gradType').value;
      const angle = $('#gradAngle').value;
      $('#gradAngleVal').textContent = angle;
      const c1 = $('#gradColor1').value, c2 = $('#gradColor2').value, c3 = $('#gradColor3').value;
      $('#gradColor1Text').value = c1; $('#gradColor2Text').value = c2; $('#gradColor3Text').value = c3;

      if (gradType === 'linear') {
        css = `background: linear-gradient(${angle}deg, ${c1}, ${c2}, ${c3});`;
        cssPreviewBox.style.background = `linear-gradient(${angle}deg, ${c1}, ${c2}, ${c3})`;
      } else if (gradType === 'radial') {
        css = `background: radial-gradient(circle, ${c1}, ${c2}, ${c3});`;
        cssPreviewBox.style.background = `radial-gradient(circle, ${c1}, ${c2}, ${c3})`;
      } else {
        css = `background: conic-gradient(from ${angle}deg, ${c1}, ${c2}, ${c3});`;
        cssPreviewBox.style.background = `conic-gradient(from ${angle}deg, ${c1}, ${c2}, ${c3})`;
      }
    } else if (type === 'shadow') {
      const x = $('#shadowX').value, y = $('#shadowY').value, blur = $('#shadowBlur').value, spread = $('#shadowSpread').value;
      $('#shadowXVal').textContent = x; $('#shadowYVal').textContent = y; $('#shadowBlurVal').textContent = blur; $('#shadowSpreadVal').textContent = spread;
      const color = $('#shadowColor').value;
      $('#shadowColorText').value = color;
      css = `box-shadow: ${x}px ${y}px ${blur}px ${spread}px ${color};`;
      cssPreviewBox.style.boxShadow = `${x}px ${y}px ${blur}px ${spread}px ${color}`;
    } else if (type === 'border') {
      const r = $('#borderRadius').value;
      $('#borderRadiusVal').textContent = r;
      if ($('#borderCircle').checked) {
        css = `border-radius: 50%; width: 200px; height: 200px;`;
        cssPreviewBox.style.borderRadius = '50%';
        cssPreviewBox.style.width = '200px'; cssPreviewBox.style.height = '200px';
      } else if ($('#borderPill').checked) {
        css = `border-radius: 9999px;`;
        cssPreviewBox.style.borderRadius = '9999px';
        cssPreviewBox.style.width = '200px'; cssPreviewBox.style.height = '60px';
      } else {
        css = `border-radius: ${r}px;`;
        cssPreviewBox.style.borderRadius = `${r}px`;
        cssPreviewBox.style.width = '200px'; cssPreviewBox.style.height = '200px';
      }
    } else if (type === 'filter') {
      const blur = $('#filterBlur').value, bright = $('#filterBright').value, contrast = $('#filterContrast').value, saturate = $('#filterSaturate').value, hue = $('#filterHue').value;
      $('#filterBlurVal').textContent = blur; $('#filterBrightVal').textContent = bright; $('#filterContrastVal').textContent = contrast; $('#filterSaturateVal').textContent = saturate; $('#filterHueVal').textContent = hue;
      css = `filter: blur(${blur}px) brightness(${bright}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg);`;
      cssPreviewBox.style.filter = `blur(${blur}px) brightness(${bright}%) contrast(${contrast}%) saturate(${saturate}%) hue-rotate(${hue}deg)`;
    }

    cssOutput.textContent = css;
  }

  cssToolType.addEventListener('change', updateCSSPreview);
  $$('.css-ctrl-group input').forEach(input => input.addEventListener('input', updateCSSPreview));
  $$('.css-ctrl-group select').forEach(select => select.addEventListener('change', updateCSSPreview));
  $$('.css-ctrl-group .color-input').forEach(input => input.addEventListener('input', updateCSSPreview));

  $('#btnCopyCSS').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(cssOutput.textContent); showToast('CSS copied!'); } catch (e) {}
  });

  // ═══════════════════════════════════════════════════════
  // VISUAL DIFF
  // ═══════════════════════════════════════════════════════
  const diffBefore = $('#diffBefore');
  const diffAfter = $('#diffAfter');
  const diffSlider = $('#diffSlider');
  const diffHandle = $('#diffHandle');
  const diffInfo = $('#diffInfo');
  let diffBeforeImg = null, diffAfterImg = null;
  let isDraggingDiff = false;

  $('#btnLoadDiffBefore').addEventListener('click', () => $('#diffFileBefore').click());
  $('#btnLoadDiffAfter').addEventListener('click', () => $('#diffFileAfter').click());

  $('#diffFileBefore').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    diffBeforeImg = url;
    diffBefore.innerHTML = `<img src="${url}" alt="Before">`;
    updateDiffInfo();
  });

  $('#diffFileAfter').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    diffAfterImg = url;
    diffAfter.innerHTML = `<img src="${url}" alt="After">`;
    updateDiffInfo();
  });

  function updateDiffInfo() {
    if (diffBeforeImg && diffAfterImg) diffInfo.textContent = 'Drag the slider to compare';
    else if (diffBeforeImg) diffInfo.textContent = 'Load "After" image';
    else if (diffAfterImg) diffInfo.textContent = 'Load "Before" image';
    else diffInfo.textContent = 'Load two images to compare';
  }

  // Drag slider
  diffHandle.addEventListener('mousedown', () => { isDraggingDiff = true; });
  document.addEventListener('mousemove', (e) => {
    if (!isDraggingDiff) return;
    const rect = $('#diffContainer').getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    x = Math.max(0, Math.min(100, x));
    diffSlider.style.left = x + '%';
    diffAfter.style.clipPath = `inset(0 ${100 - x}% 0 0)`;
  });
  document.addEventListener('mouseup', () => { isDraggingDiff = false; });

  // ═══════════════════════════════════════════════════════
  // TREE DIAGRAM
  // ═══════════════════════════════════════════════════════
  const treeInput = $('#treeInput');
  const treeOutput = $('#treeOutput');

  $('#btnRenderTree').addEventListener('click', () => {
    const text = treeInput.value;
    if (!text.trim()) return;
    treeOutput.innerHTML = '';
    treeOutput.appendChild(buildTree(text));
  });

  function buildTree(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const container = document.createElement('div');
    container.className = 'tree-node';

    lines.forEach(line => {
      const indent = line.search(/\S/);
      const name = line.trim();
      const isFolder = name.endsWith('/') || !name.includes('.');

      const span = document.createElement('span');
      span.className = isFolder ? 'tree-folder' : 'tree-file';
      span.textContent = name;

      const connector = document.createElement('span');
      connector.className = 'tree-connector';
      connector.textContent = '\n';

      container.appendChild(span);
      container.appendChild(connector);
    });

    return container;
  }

  $('#btnCopyTreePNG').addEventListener('click', async () => {
    showToast('Tree export — use screen capture for now');
  });

  $('#btnDownloadTreePNG').addEventListener('click', async () => {
    showToast('Tree export — use screen capture for now');
  });

  // ═══════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════
  (async function init() {
    try { settings = await window.snipAPI.getSettings(); } catch (e) { settings = { theme: 'dark' }; }
    applyTheme(settings.theme);
    loadGallery();
    updateCSSPreview();
    console.log('[SnipWin v3.0 Renderer] Ready');
  })();
})();
