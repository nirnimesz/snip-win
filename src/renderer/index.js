// ── SnipWin v2.0 Renderer Process ──
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

  // ── Initialize Mermaid ──
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    });
  }

  // ── Tab Switching ──
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      reviewPanel.classList.toggle('hidden', tab !== 'review');
      galleryPanel.classList.toggle('hidden', tab !== 'gallery');
      if (tab === 'gallery') loadGallery();
    });
  });

  // ── Fabric.js Canvas ──
  function initFabricCanvas(imgElement) {
    const container = canvasContainer;
    const w = Math.max(container.clientWidth, 800);
    const h = Math.max(400, Math.min(500, window.innerHeight * 0.4));

    if (fabricCanvas) {
      fabricCanvas.dispose();
    }

    fabricCanvas = new fabric.Canvas('annotationCanvas', {
      width: w,
      height: h,
      backgroundColor: '#1e293b',
      selection: true
    });

    if (imgElement) {
      const img = new fabric.Image(imgElement, {
        left: 0,
        top: 0,
        scaleX: w / imgElement.naturalWidth,
        scaleY: h / imgElement.naturalHeight,
        selectable: false,
        evented: false
      });
      fabricCanvas.add(img);
      fabricCanvas.sendToBack(img);
      sourceImage = img;
    }

    // Set default brush
    fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.width = 3;
    fabricCanvas.freeDrawingBrush.color = settings.annotationColors?.arrow || '#ef4444';

    // Keyboard shortcuts for canvas
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
      case 'z':
        if (e.ctrlKey && fabricCanvas) {
          const active = fabricCanvas.getActiveObject();
          if (active) fabricCanvas.remove(active);
          e.preventDefault();
        }
        break;
      case 'escape':
        if (!settingsModal.classList.contains('hidden')) {
          closeSettings();
        } else {
          cancelReview();
        }
        break;
      case 'enter':
        if (e.ctrlKey) submitReview('approved');
        break;
    }
  }

  function setTool(tool) {
    currentTool = tool;
    $$('.tool-btn[data-tool]').forEach(b => {
      b.classList.toggle('active', b.dataset.tool === tool);
    });

    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = (tool === 'freehand');

    if (tool === 'freehand') {
      fabricCanvas.freeDrawingBrush.width = 3;
      fabricCanvas.freeDrawingBrush.color = settings.annotationColors?.arrow || '#ef4444';
    }

    // Handle click-based tools
    if (['rect', 'arrow', 'text', 'blur'].includes(tool)) {
      fabricCanvas.off('mouse:down');
      fabricCanvas.on('mouse:down', (opt) => {
        if (tool === 'select') return;
        const pointer = fabricCanvas.getPointer(opt.e);

        if (tool === 'rect') {
          const rect = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 100,
            height: 60,
            fill: 'transparent',
            stroke: settings.annotationColors?.rect || '#6366f1',
            strokeWidth: 2,
            strokeDashArray: [5, 5]
          });
          fabricCanvas.add(rect);
          fabricCanvas.setActiveObject(rect);
        } else if (tool === 'arrow') {
          const cx = pointer.x + 80, cy = pointer.y - 40;
          const line = new fabric.Line([pointer.x, pointer.y, cx, cy], {
            stroke: settings.annotationColors?.arrow || '#ef4444',
            strokeWidth: 2
          });
          // Arrowhead
          const angle = Math.atan2(cy - pointer.y, cx - pointer.x);
          const headLen = 12;
          const head1 = new fabric.Line([
            cx, cy,
            cx - headLen * Math.cos(angle - Math.PI / 6),
            cy - headLen * Math.sin(angle - Math.PI / 6)
          ], { stroke: settings.annotationColors?.arrow || '#ef4444', strokeWidth: 2 });
          const head2 = new fabric.Line([
            cx, cy,
            cx - headLen * Math.cos(angle + Math.PI / 6),
            cy - headLen * Math.sin(angle + Math.PI / 6)
          ], { stroke: settings.annotationColors?.arrow || '#ef4444', strokeWidth: 2 });
          const group = new fabric.Group([line, head1, head2]);
          fabricCanvas.add(group);
          fabricCanvas.setActiveObject(group);
        } else if (tool === 'text') {
          const text = new fabric.IText('Type here', {
            left: pointer.x,
            top: pointer.y,
            fill: settings.annotationColors?.text || '#f1f5f9',
            fontSize: 16,
            fontFamily: 'sans-serif'
          });
          fabricCanvas.add(text);
          fabricCanvas.setActiveObject(text);
          text.enterEditing();
          text.selectAll();
        } else if (tool === 'blur') {
          const blur = new fabric.Rect({
            left: pointer.x - 40,
            top: pointer.y - 20,
            width: 80,
            height: 40,
            fill: 'rgba(0,0,0,0.5)',
            stroke: 'transparent',
            rx: 4,
            ry: 4
          });
          fabricCanvas.add(blur);
          fabricCanvas.setActiveObject(blur);
        }

        fabricCanvas.renderAll();
        // Reset to select after placing
        setTool('select');
      });
    } else {
      fabricCanvas.off('mouse:down');
    }
  }

  // ── Review Flow ──
  window.snipAPI.onRenderRequest(async (data) => {
    currentRequest = data;
    reviewEmpty.classList.add('hidden');
    reviewActive.classList.remove('hidden');
    reviewMessage.textContent = data.message || `Review this ${data.format}`;
    reviewText.value = '';

    if (data.format === 'mermaid') {
      await renderMermaid(data.content);
    } else if (data.format === 'html') {
      renderHTML(data.content);
    }

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

  if (window.snipAPI.onSettingsOpen) {
    window.snipAPI.onSettingsOpen(() => openSettings());
  }

  async function renderMermaid(content) {
    reviewContent.innerHTML = '<div class="mermaid-container"><div class="mermaid">' + content + '</div></div>';
    try {
      if (typeof mermaid !== 'undefined') {
        await mermaid.run({ nodes: reviewContent.querySelectorAll('.mermaid') });
      }
    } catch (e) {
      reviewContent.innerHTML = '<div style="padding:24px;color:#ef4444"><p>Failed to render diagram:</p><pre style="font-size:0.75rem;white-space:pre-wrap">' + escapeHtml(e.message) + '</pre></div>';
    }
  }

  function renderHTML(content) {
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

  async function renderImage(filepath) {
    try {
      const response = await fetch('file:///' + filepath.replace(/\\/g, '/'));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        reviewContent.innerHTML = '';
        reviewContent.appendChild(img);
        initFabricCanvas(img);
      };
      img.onerror = () => {
        reviewContent.innerHTML = '<div style="padding:24px;color:#ef4444">Failed to load image</div>';
        initFabricCanvas();
      };
      img.src = url;
    } catch (e) {
      reviewContent.innerHTML = '<div style="padding:24px;color:#ef4444">Failed to load: ' + escapeHtml(e.message) + '</div>';
      initFabricCanvas();
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Review Actions ──
  btnApprove.addEventListener('click', () => submitReview('approved'));
  btnChanges.addEventListener('click', () => submitReview('changes_requested'));

  function submitReview(status) {
    let imageData = null;
    let edited = false;

    if (fabricCanvas) {
      const objects = fabricCanvas.getObjects();
      const hasAnnotations = sourceImage ? objects.length > 1 : objects.length > 0;

      if (hasAnnotations) {
        imageData = fabricCanvas.toDataURL({ format: 'png', quality: 0.92 });
        edited = true;
      }
    }

    window.snipAPI.submitReview({
      status,
      edited,
      imageData,
      path: currentRequest?.filepath || null,
      text: reviewText.value
    });

    resetReview();
  }

  function cancelReview() {
    window.snipAPI.cancelReview();
    resetReview();
  }

  function resetReview() {
    reviewActive.classList.add('hidden');
    reviewEmpty.classList.remove('hidden');
    currentRequest = null;
    if (fabricCanvas) {
      fabricCanvas.dispose();
      fabricCanvas = null;
    }
    sourceImage = null;
  }

  // ── Annotation Toolbar ──
  $$('.tool-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  btnUndo.addEventListener('click', () => {
    if (fabricCanvas) {
      const active = fabricCanvas.getActiveObject();
      if (active) {
        fabricCanvas.remove(active);
        fabricCanvas.renderAll();
      }
    }
  });

  btnClear.addEventListener('click', () => {
    if (fabricCanvas) {
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if (obj !== sourceImage) fabricCanvas.remove(obj);
      });
      fabricCanvas.renderAll();
    }
  });

  // ── Screen Capture ──
  btnCaptureScreen.addEventListener('click', async () => {
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

  btnCaptureWindow.addEventListener('click', async () => {
    const result = await window.snipAPI.captureScreen('window');
    if (result && !result.error) {
      currentRequest = { filepath: result.path, message: 'Captured window' };
      reviewEmpty.classList.add('hidden');
      reviewActive.classList.remove('hidden');
      reviewMessage.textContent = 'Captured window';
      reviewText.value = '';
      await renderImage(result.path);
    }
  });

  btnQuickCapture.addEventListener('click', async () => {
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

  // ── Gallery ──
  btnRefresh.addEventListener('click', loadGallery);
  gallerySearch.addEventListener('input', () => filterGallery());

  async function loadGallery() {
    galleryGrid.innerHTML = `
      <div class="gallery-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <p>Screenshots will appear here after reviews</p>
        <p class="hint">Use the CLI or AI agent to send content for review</p>
      </div>
    `;
    galleryCount.classList.add('hidden');
  }

  function filterGallery() {
    const q = gallerySearch.value.toLowerCase();
    $$('.gallery-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  }

  // ── Settings ──
  btnSettings.addEventListener('click', openSettings);
  btnCloseSettings.addEventListener('click', closeSettings);
  settingsBackdrop.addEventListener('click', closeSettings);
  btnCancelSettings.addEventListener('click', closeSettings);
  btnSaveSettings.addEventListener('click', saveSettings);

  qualityRange.addEventListener('input', () => {
    qualityValue.textContent = qualityRange.value + '%';
  });

  async function openSettings() {
    try {
      settings = await window.snipAPI.getSettings();
    } catch (e) {
      settings = {};
    }

    themeSelect.value = settings.theme || 'dark';
    colorRect.value = settings.annotationColors?.rect || '#6366f1';
    colorArrow.value = settings.annotationColors?.arrow || '#ef4444';
    colorText.value = settings.annotationColors?.text || '#f1f5f9';
    hotkeyInput.value = settings.hotkey || 'Ctrl+Shift+S';
    qualityRange.value = Math.round((settings.screenshotQuality || 0.92) * 100);
    qualityValue.textContent = qualityRange.value + '%';

    settingsModal.classList.remove('hidden');
  }

  function closeSettings() {
    settingsModal.classList.add('hidden');
  }

  async function saveSettings() {
    const newSettings = {
      theme: themeSelect.value,
      annotationColors: {
        rect: colorRect.value,
        arrow: colorArrow.value,
        text: colorText.value,
        blur: 'rgba(0,0,0,0.5)'
      },
      hotkey: hotkeyInput.value,
      screenshotQuality: parseInt(qualityRange.value) / 100
    };

    try {
      settings = await window.snipAPI.saveSettings(newSettings);
      applyTheme(settings.theme);
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }

    closeSettings();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'dark');
  }

  // ── Init ──
  (async function init() {
    try {
      settings = await window.snipAPI.getSettings();
    } catch (e) {
      settings = { theme: 'dark' };
    }
    applyTheme(settings.theme);

    loadGallery();

    console.log('[SnipWin Renderer v2.0] Ready');
  })();
})();
