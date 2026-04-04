// ── SnipWin Renderer Process ──
(function() {
  'use strict';

  // State
  let currentRequest = null;
  let currentTool = 'select';
  let fabricCanvas = null;
  let isFabricLoaded = false;

  // ── Initialize Mermaid ──
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
  }

  // ── DOM Elements ──
  const reviewPanel = document.getElementById('reviewPanel');
  const reviewMessage = document.getElementById('reviewMessage');
  const reviewContent = document.getElementById('reviewContent');
  const canvasContainer = document.getElementById('canvasContainer');
  const annotationToolbar = document.getElementById('annotationToolbar');
  const reviewText = document.getElementById('reviewText');
  const btnApprove = document.getElementById('btnApprove');
  const btnChanges = document.getElementById('btnChanges');
  const btnCapture = document.getElementById('btnCapture');
  const btnBrowse = document.getElementById('btnBrowse');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnUndo = document.getElementById('btnUndo');
  const btnClear = document.getElementById('btnClear');
  const galleryGrid = document.getElementById('galleryGrid');

  // ── Listen for render requests ──
  window.snipAPI.onRenderRequest(async (data) => {
    currentRequest = data;
    showReviewPanel(data.message || `Review this ${data.format}`);

    if (data.format === 'mermaid') {
      await renderMermaid(data.content);
    } else if (data.format === 'html') {
      renderHTML(data.content);
    }

    showAnnotationTools();
  });

  // ── Listen for open requests ──
  window.snipAPI.onOpenRequest(async (data) => {
    currentRequest = data;
    showReviewPanel(data.message || 'Review this image');
    await renderImage(data.filepath);
    showAnnotationTools();
  });

  // ── Listen for capture screen ──
  window.snipAPI.onCaptureScreen(() => {
    // Placeholder for screen capture
    console.log('Capture screen requested');
  });

  // ── Render Mermaid Diagram ──
  async function renderMermaid(content) {
    reviewContent.innerHTML = '<div class="mermaid-container"><div class="mermaid">' + content + '</div></div>';

    try {
      if (typeof mermaid !== 'undefined') {
        await mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
      }
    } catch (e) {
      reviewContent.innerHTML = '<div style="padding:24px;color:#ef4444"><p>Failed to render diagram:</p><pre style="font-size:0.75rem;white-space:pre-wrap">' + e.message + '</pre></div>';
    }
  }

  // ── Render HTML ──
  function renderHTML(content) {
    // Sanitize: remove scripts
    const sanitized = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/on\w+='[^']*'/gi, '');

    const iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-same-origin';
    iframe.srcdoc = sanitized;
    reviewContent.innerHTML = '';
    reviewContent.appendChild(iframe);
  }

  // ── Render Image ──
  async function renderImage(filepath) {
    try {
      // Read file via Electron's fs (through preload)
      const response = await fetch('file:///' + filepath.replace(/\\/g, '/'));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const img = document.createElement('img');
      img.src = url;
      img.onload = () => {
        reviewContent.innerHTML = '';
        reviewContent.appendChild(img);
        initAnnotationCanvas(img);
      };
    } catch (e) {
      reviewContent.innerHTML = '<div style="padding:24px;color:#ef4444">Failed to load image: ' + e.message + '</div>';
    }
  }

  // ── Show Review Panel ──
  function showReviewPanel(message) {
    reviewPanel.classList.remove('hidden');
    reviewMessage.textContent = message;
    reviewText.value = '';
    canvasContainer.classList.add('hidden');
    annotationToolbar.classList.add('hidden');
  }

  // ── Show Annotation Tools ──
  function showAnnotationTools() {
    annotationToolbar.classList.remove('hidden');
    canvasContainer.classList.remove('hidden');
    initAnnotationCanvas();
  }

  // ── Annotation Canvas (simple 2D) ──
  function initAnnotationCanvas(sourceImg) {
    const canvas = document.getElementById('annotationCanvas');
    const ctx = canvas.getContext('2d');

    // Get content dimensions
    const contentRect = reviewContent.getBoundingClientRect();
    canvas.width = Math.max(contentRect.width, 800);
    canvas.height = Math.max(contentRect.height, 400);

    // Draw source if available
    if (sourceImg) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / sourceImg.naturalWidth, canvas.height / sourceImg.naturalHeight, 1);
      const w = sourceImg.naturalWidth * scale;
      const h = sourceImg.naturalHeight * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(sourceImg, x, y, w, h);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Annotation canvas ready', canvas.width / 2, canvas.height / 2);
    }

    // Simple drawing state
    let isDrawing = false;
    let startX, startY;

    canvas.onmousedown = (e) => {
      isDrawing = true;
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
    };

    canvas.onmousemove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (currentTool === 'rect') {
        // Redraw base + preview
        redrawBase(ctx, sourceImg, canvas);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, x - startX, y - startY);
      } else if (currentTool === 'arrow') {
        redrawBase(ctx, sourceImg, canvas);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(y - startY, x - startX);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10 * Math.cos(angle - Math.PI / 6), y - 10 * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10 * Math.cos(angle + Math.PI / 6), y - 10 * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
    };

    canvas.onmouseup = () => { isDrawing = false; };
    canvas.onmouseleave = () => { isDrawing = false; };
  }

  function redrawBase(ctx, sourceImg, canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sourceImg) {
      const scale = Math.min(canvas.width / sourceImg.naturalWidth, canvas.height / sourceImg.naturalHeight, 1);
      const w = sourceImg.naturalWidth * scale;
      const h = sourceImg.naturalHeight * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;
      ctx.drawImage(sourceImg, x, y, w, h);
    }
  }

  // ── Tool Selection ──
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
    });
  });

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;

    switch (e.key.toLowerCase()) {
      case 'v': selectTool('select'); break;
      case 'r': selectTool('rect'); break;
      case 'a': selectTool('arrow'); break;
      case 't': selectTool('text'); break;
      case 'b': selectTool('blur'); break;
      case 'escape': cancelReview(); break;
    }

    if (e.key === 'Enter' && e.ctrlKey) {
      submitReview('approved');
    }
  });

  function selectTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });
  }

  // ── Review Actions ──
  btnApprove.addEventListener('click', () => submitReview('approved'));
  btnChanges.addEventListener('click', () => submitReview('changes_requested'));

  function submitReview(status) {
    const canvas = document.getElementById('annotationCanvas');
    let imageData = null;
    let edited = false;

    // Get canvas data if annotations exist
    if (canvas && !canvasContainer.classList.contains('hidden')) {
      imageData = canvas.toDataURL('image/png');
      edited = true;
    }

    window.snipAPI.submitReview({
      status,
      edited,
      imageData,
      path: currentRequest?.filepath || null,
      text: reviewText.value
    });

    // Reset UI
    reviewPanel.classList.add('hidden');
    currentRequest = null;
  }

  function cancelReview() {
    window.snipAPI.cancelReview();
    reviewPanel.classList.add('hidden');
    currentRequest = null;
  }

  // ── Gallery ──
  btnRefresh.addEventListener('click', loadGallery);
  btnBrowse.addEventListener('click', () => {
    // Open screenshots folder
    const { shell } = require('electron');
    shell.openPath(require('os').homedir() + '/Pictures/snip-win/screenshots');
  });

  async function loadGallery() {
    // Placeholder — would connect to pipe server
    galleryGrid.innerHTML = `
      <div class="gallery-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>Screenshots will appear here after reviews</p>
      </div>
    `;
  }

  // ── Init ──
  loadGallery();
  console.log('[SnipWin Renderer] Ready');
})();
