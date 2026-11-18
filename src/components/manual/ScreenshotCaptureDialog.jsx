import { useState } from "react";
import { base44 } from "@/api/base44Client";
import html2canvas from "html2canvas";
import { MODULE_ROUTE_MAP } from "./moduleRouteMap";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, CheckCircle2, Loader2, SkipForward, AlertCircle, ExternalLink, Upload } from "lucide-react";

const CAPTURE_WIDTH = 1280;
const CAPTURE_HEIGHT = 800;
const MAX_DATA_WAIT_MS = 25000;
const MAX_SHOTS_PER_ROUTE = 3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Wait until the page has finished loading its data: no visible loading
// spinners and some real content rendered in the body.
async function waitForContent(iframeDoc) {
  const start = Date.now();
  while (Date.now() - start < MAX_DATA_WAIT_MS) {
    const spinners = iframeDoc.querySelectorAll(".animate-spin, .animate-pulse");
    const textLength = (iframeDoc.body?.innerText || "").trim().length;
    if (spinners.length === 0 && textLength > 80) {
      // Content settled — give async images/charts a moment to paint
      await sleep(1500);
      return;
    }
    await sleep(600);
  }
}

// Pages animate in via framer-motion (opacity 0 → 1). In a hidden iframe,
// animation frames are throttled and never run, leaving everything at
// opacity 0 — which produces blank screenshots. Force all inline
// opacity/transform values to their final visible state before capture.
function forceVisible(doc) {
  doc.querySelectorAll("[style]").forEach((el) => {
    const s = el.style;
    if (s.opacity !== "" && parseFloat(s.opacity) < 1) s.opacity = "1";
    if (s.transform && s.transform !== "none") s.transform = "none";
  });
}

// Wait until the page text is actually in Arabic (the auto-translator runs
// asynchronously — capturing too early produces mixed EN/AR screenshots).
async function waitForArabic(iframeDoc) {
  const start = Date.now();
  while (Date.now() - start < 20000) {
    const text = iframeDoc.body?.innerText || "";
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
    if (arabicChars > 40 && arabicChars >= latinChars * 0.5) return;
    await sleep(1000);
  }
}

// Wait for all images currently in the document to finish loading
async function waitForImages(iframeDoc) {
  const imgs = Array.from(iframeDoc.querySelectorAll("img")).filter((img) => !img.complete);
  if (imgs.length === 0) return;
  await Promise.race([
    Promise.all(imgs.map((img) => new Promise((r) => { img.onload = r; img.onerror = r; }))),
    sleep(8000),
  ]);
}

// Capture the currently visible viewport region and upload it. Returns the file URL.
async function snapAndUpload(iframeDoc, offsetY, height) {
  forceVisible(iframeDoc);
  const canvas = await html2canvas(iframeDoc.body, {
    scale: 1,
    useCORS: true,
    backgroundColor: "#ffffff",
    y: offsetY,
    width: CAPTURE_WIDTH,
    height,
    windowWidth: CAPTURE_WIDTH,
    windowHeight: CAPTURE_HEIGHT,
    logging: false,
    onclone: (clonedDoc) => forceVisible(clonedDoc),
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("Failed to create image blob");
  const file = new File([blob], `screenshot_${Date.now()}.jpg`, { type: "image/jpeg" });
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}

// Remembers where the user dragged the preview between captures
let previewPos = null;

// Set by the ⏹ Stop button on the preview window — aborts the whole capture run
let stopAllRequested = false;

// Creates the visible, draggable live-preview window containing the capture iframe.
// Browsers throttle/freeze rendering inside hidden or off-screen iframes,
// which prevents pages from painting and data-driven UI from appearing.
function createPreviewFrame(path) {
  let scale = 0.75;
  const w = CAPTURE_WIDTH * scale;
  const h = CAPTURE_HEIGHT * scale;

  const wrapper = document.createElement("div");
  // pointer-events:auto is required — while the capture dialog is open, Radix
  // sets pointer-events:none on <body>, which would otherwise block dragging.
  wrapper.style.cssText = "position:fixed;z-index:2147483647;border-radius:10px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.35);border:2px solid #3b82f6;background:#ffffff;pointer-events:auto;";
  if (previewPos) {
    wrapper.style.left = previewPos.x + "px";
    wrapper.style.top = previewPos.y + "px";
  } else {
    wrapper.style.right = "12px";
    wrapper.style.bottom = "12px";
  }

  const DEFAULT_TITLE = "📸 Live preview — drag to move";
  const handle = document.createElement("div");
  handle.style.cssText = "height:34px;background:#3b82f6;color:#ffffff;font:600 12px sans-serif;display:flex;align-items:center;padding:0 10px;cursor:move;user-select:none;pointer-events:auto;touch-action:none;";

  const title = document.createElement("span");
  title.textContent = DEFAULT_TITLE;
  title.style.cssText = "flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;";

  const mkBtn = (label) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "margin-left:8px;background:#ffffff;color:#1d4ed8;border:0;border-radius:5px;padding:4px 10px;font:600 11px sans-serif;cursor:pointer;pointer-events:auto;flex-shrink:0;";
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    return b;
  };
  const pauseBtn = mkBtn("⏸ Pause");
  const capBtn = mkBtn("📷 Capture");
  const skipBtn = mkBtn("⏭ Skip");
  const minBtn = mkBtn("—");
  const maxBtn = mkBtn("□");
  minBtn.title = "Minimize";
  maxBtn.title = "Maximize / restore";
  skipBtn.title = "Skip the rest of this page and move on";
  minBtn.style.padding = "4px 8px";
  maxBtn.style.padding = "4px 8px";

  handle.appendChild(title);
  handle.appendChild(pauseBtn);
  handle.appendChild(capBtn);
  handle.appendChild(skipBtn);
  handle.appendChild(minBtn);
  handle.appendChild(maxBtn);

  const frameBox = document.createElement("div");
  frameBox.style.cssText = `width:${w}px;height:${h}px;overflow:hidden;pointer-events:none;`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = `width:${CAPTURE_WIDTH}px;height:${CAPTURE_HEIGHT}px;border:0;transform:scale(${scale});transform-origin:top left;background:#ffffff;`;
  iframe.src = path;

  // Second toolbar with extra controls
  const toolbar = document.createElement("div");
  toolbar.style.cssText = "height:32px;background:#1e293b;display:flex;align-items:center;padding:0 8px;gap:2px;pointer-events:auto;overflow-x:auto;";
  const mkTBtn = (label, titleText) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.title = titleText;
    b.style.cssText = "background:transparent;color:#e2e8f0;border:0;border-radius:4px;padding:3px 8px;font:600 11px sans-serif;cursor:pointer;pointer-events:auto;flex-shrink:0;white-space:nowrap;";
    b.onmouseenter = () => (b.style.background = "#334155");
    b.onmouseleave = () => (b.style.background = "transparent");
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    return b;
  };
  const reloadBtn = mkTBtn("⟳", "Reload page");
  const backBtn = mkTBtn("◀", "Go back");
  const topBtn = mkTBtn("⤒", "Scroll to top");
  const upBtn = mkTBtn("⬆", "Scroll up");
  const downBtn = mkTBtn("⬇", "Scroll down");
  const interactBtn = mkTBtn("🖱 Interact", "Toggle interacting with the page (click, type, open tabs) without pausing");
  const fullBtn = mkTBtn("📜 Full page", "Capture the entire page top to bottom as one tall screenshot");
  const undoBtn = mkTBtn("↩ Undo", "Remove the last manual screenshot");
  const stopBtn = mkTBtn("⏹ Stop all", "Stop the entire capture run");
  stopBtn.style.color = "#fca5a5";
  [reloadBtn, backBtn, topBtn, upBtn, downBtn, interactBtn, fullBtn, undoBtn, stopBtn].forEach((b) => toolbar.appendChild(b));

  frameBox.appendChild(iframe);
  wrapper.appendChild(handle);
  wrapper.appendChild(toolbar);
  wrapper.appendChild(frameBox);

  // Manual control state: pausing halts the auto-capture flow and makes the
  // page inside interactive (scroll, click tabs/panels), and the Capture
  // button snaps whatever is currently visible.
  const ctl = { paused: false, manualUrls: [], skipRequested: false, interactive: false };

  const updateInteractivity = () => {
    frameBox.style.pointerEvents = ctl.paused || ctl.interactive ? "auto" : "none";
    interactBtn.style.color = ctl.interactive ? "#4ade80" : "#e2e8f0";
  };

  // — Minimize: collapse to just the title bar
  let minimized = false;
  minBtn.addEventListener("click", () => {
    minimized = !minimized;
    frameBox.style.display = minimized ? "none" : "block";
    toolbar.style.display = minimized ? "none" : "flex";
    minBtn.textContent = minimized ? "▢" : "—";
  });

  // Toolbar handlers
  reloadBtn.addEventListener("click", () => { try { iframe.contentWindow.location.reload(); } catch { /* ignore */ } });
  backBtn.addEventListener("click", () => { try { iframe.contentWindow.history.back(); } catch { /* ignore */ } });
  topBtn.addEventListener("click", () => iframe.contentWindow?.scrollTo(0, 0));
  upBtn.addEventListener("click", () => iframe.contentWindow?.scrollBy({ top: -CAPTURE_HEIGHT * 0.8, behavior: "smooth" }));
  downBtn.addEventListener("click", () => iframe.contentWindow?.scrollBy({ top: CAPTURE_HEIGHT * 0.8, behavior: "smooth" }));

  interactBtn.addEventListener("click", () => {
    ctl.interactive = !ctl.interactive;
    updateInteractivity();
  });

  fullBtn.addEventListener("click", async () => {
    const doc = iframe.contentDocument;
    if (!doc?.body || fullBtn.disabled) return;
    fullBtn.disabled = true;
    fullBtn.textContent = "⏳ Capturing...";
    try {
      const totalH = Math.max(doc.body.scrollHeight || 0, doc.documentElement?.scrollHeight || 0);
      const url = await snapAndUpload(doc, 0, Math.min(totalH, CAPTURE_HEIGHT * 5));
      ctl.manualUrls.push(url);
      capBtn.textContent = `📷 Capture (${ctl.manualUrls.length})`;
    } catch { /* ignore */ }
    fullBtn.textContent = "📜 Full page";
    fullBtn.disabled = false;
  });

  undoBtn.addEventListener("click", () => {
    if (ctl.manualUrls.length === 0) return;
    ctl.manualUrls.pop();
    capBtn.textContent = ctl.manualUrls.length > 0 ? `📷 Capture (${ctl.manualUrls.length})` : "📷 Capture";
  });

  stopBtn.addEventListener("click", () => {
    stopAllRequested = true;
    ctl.skipRequested = true;
    ctl.paused = false;
    title.textContent = "⏹ Stopping capture...";
  });

  // □ Maximize: toggle between compact (75%) and the largest size that fits the screen
  let maximized = false;
  const applyScale = () => {
    iframe.style.transform = `scale(${scale})`;
    frameBox.style.width = CAPTURE_WIDTH * scale + "px";
    frameBox.style.height = CAPTURE_HEIGHT * scale + "px";
  };
  maxBtn.addEventListener("click", () => {
    maximized = !maximized;
    if (maximized) {
      scale = Math.min((window.innerWidth - 24) / CAPTURE_WIDTH, (window.innerHeight - 60) / CAPTURE_HEIGHT);
      wrapper.style.left = "12px";
      wrapper.style.top = "12px";
      wrapper.style.right = "auto";
      wrapper.style.bottom = "auto";
    } else {
      scale = 0.75;
      if (previewPos) {
        wrapper.style.left = previewPos.x + "px";
        wrapper.style.top = previewPos.y + "px";
      } else {
        wrapper.style.left = "auto";
        wrapper.style.top = "auto";
        wrapper.style.right = "12px";
        wrapper.style.bottom = "12px";
      }
    }
    if (minimized) { minimized = false; frameBox.style.display = "block"; minBtn.textContent = "—"; }
    applyScale();
    maxBtn.textContent = maximized ? "❐" : "□";
  });

  // ⏭ Skip: stop capturing the rest of this page and move to the next one
  skipBtn.addEventListener("click", () => {
    ctl.skipRequested = true;
    ctl.paused = false;
    title.textContent = "⏭ Skipping to next page...";
  });

  pauseBtn.addEventListener("click", () => {
    ctl.paused = !ctl.paused;
    updateInteractivity();
    pauseBtn.textContent = ctl.paused ? "▶ Resume" : "⏸ Pause";
    title.textContent = ctl.paused
      ? "⏸ Paused — scroll & click inside, then Capture"
      : DEFAULT_TITLE;
  });

  capBtn.addEventListener("click", async () => {
    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc?.body || capBtn.disabled) return;
    capBtn.disabled = true;
    capBtn.textContent = "⏳ ...";
    try {
      const url = await snapAndUpload(doc, win.scrollY || 0, CAPTURE_HEIGHT);
      ctl.manualUrls.push(url);
      capBtn.textContent = `📷 Capture (${ctl.manualUrls.length})`;
    } catch {
      capBtn.textContent = "📷 Capture";
    }
    capBtn.disabled = false;
  });

  // Pointer events (with capture) work for both mouse and touch, and keep
  // receiving moves even when the cursor passes over iframes or the dialog.
  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handle.setPointerCapture(e.pointerId);
    const rect = wrapper.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    wrapper.style.right = "auto";
    wrapper.style.bottom = "auto";
    const move = (ev) => {
      const x = ev.clientX - dx;
      const y = ev.clientY - dy;
      wrapper.style.left = x + "px";
      wrapper.style.top = y + "px";
      previewPos = { x, y };
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  });

  document.body.appendChild(wrapper);
  return { wrapper, iframe, ctl };
}

async function captureRoute(entry, language) {
  const route = typeof entry === "string" ? entry : entry.path;
  const clickSelector = typeof entry === "object" ? entry.click : null;
  const [path, hash] = route.split("#");

  const { wrapper, iframe, ctl } = createPreviewFrame(path);

  const cleanup = () => { if (wrapper.parentNode) document.body.removeChild(wrapper); };

  // Halts the automated flow while the user has pressed Pause (Skip releases it)
  const waitWhilePaused = async () => { while (ctl.paused && !ctl.skipRequested) await sleep(300); };

  // Wait for iframe page to load
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { cleanup(); reject(new Error("Page load timed out")); }, 30000);
    iframe.onload = () => { clearTimeout(timeout); resolve(); };
  });

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  const iframeWin = iframe.contentWindow;
  if (!iframeDoc || !iframeDoc.body) { cleanup(); throw new Error("Cannot access iframe document"); }

  // Disable CSS transitions/animations inside the iframe so elements render
  // in their final state immediately (hidden iframes never run animations).
  const styleTag = iframeDoc.createElement("style");
  styleTag.textContent = "*, *::before, *::after { transition: none !important; animation: none !important; }";
  iframeDoc.head?.appendChild(styleTag);

  // Wait until data has actually loaded (spinners gone + real content rendered)
  await waitForContent(iframeDoc);

  // Switch to the correct Admin tab via hash and wait for it to render its data
  if (hash) {
    iframeWin.location.hash = hash;
    await sleep(1000);
    await waitForContent(iframeDoc);
  }

  // For Arabic captures, wait until the auto-translator has actually
  // converted the page text to Arabic (it runs asynchronously).
  if (language === "ar") await waitForArabic(iframeDoc);

  // If this entry requires opening a dialog (e.g. the voice order button),
  // click it and wait for the dialog content to render.
  if (clickSelector) {
    let target = null;
    const clickStart = Date.now();
    while (!target && Date.now() - clickStart < 8000) {
      target = iframeDoc.querySelector(clickSelector);
      if (!target) await sleep(500);
    }
    if (!target) { cleanup(); throw new Error("Button to click not found: " + clickSelector); }
    target.click();
    await sleep(1000);
    await waitForContent(iframeDoc);
    if (language === "ar") await waitForArabic(iframeDoc);
  }

  // Force framer-motion animated elements to their visible end state
  forceVisible(iframeDoc);

  // Scroll to top for a consistent capture
  iframeWin.scrollTo(0, 0);

  // Wait for all images to finish loading, then an extra 5s settle time
  // so photos, charts, and lazy content are fully painted before capture.
  await waitForImages(iframeDoc);
  await sleep(5000);

  // Menu pages are image-heavy — give item photos an extra 10s to load
  if (path.toLowerCase().startsWith("/menu")) {
    await sleep(10000);
    await waitForImages(iframeDoc);
  }

  // Capture multiple screenshots while scrolling down, so page content
  // below the fold is included (up to MAX_SHOTS_PER_ROUTE per route).
  const totalHeight = Math.max(
    iframeDoc.body.scrollHeight || 0,
    iframeDoc.documentElement?.scrollHeight || 0
  );
  const urls = [];
  for (let s = 0; s < MAX_SHOTS_PER_ROUTE; s++) {
    await waitWhilePaused();
    if (ctl.skipRequested) break;
    const offsetY = s * CAPTURE_HEIGHT;
    // Stop if there's no meaningful content left below this offset
    if (s > 0 && totalHeight - offsetY < 300) break;

    iframeWin.scrollTo(0, offsetY);
    await sleep(1200);
    await waitWhilePaused();

    const file_url = await snapAndUpload(
      iframeDoc,
      offsetY,
      Math.min(CAPTURE_HEIGHT, Math.max(400, totalHeight - offsetY))
    );
    urls.push(file_url);
  }

  // Give the user a final chance: if paused at the end, wait until resumed
  await waitWhilePaused();

  // Include any screenshots the user captured manually via the Capture button
  urls.push(...ctl.manualUrls);

  cleanup();
  return urls;
}

function getRoutes(moduleName) {
  const entry = MODULE_ROUTE_MAP[moduleName];
  if (!entry) return [];
  return Array.isArray(entry) ? entry : [entry];
}

const routeLabel = (r) => (typeof r === "string" ? r : r.label || r.path);

export default function ScreenshotCaptureDialog({ sections, onClose, onComplete, language = "en" }) {
  const [capturing, setCapturing] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(-1);
  const [results, setResults] = useState({});
  const [doneCount, setDoneCount] = useState(0);

  const totalWithRoute = sections.filter((s) => getRoutes(s.module_name).length > 0).length;

  const handleUpload = async (section, file) => {
    setResults((prev) => ({ ...prev, [section.id]: { status: "uploading" } }));
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const existing = section.screenshot_urls || [];
      await base44.entities.VeraKit360ManualSection.update(section.id, {
        screenshot_urls: [...existing, file_url],
      });
      setResults((prev) => ({ ...prev, [section.id]: { status: "done", count: (existing.length + 1) } }));
      onComplete();
    } catch (error) {
      setResults((prev) => ({ ...prev, [section.id]: { status: "error", error: error.message } }));
    }
  };

  const handleCaptureAll = async () => {
    setCapturing(true);
    setDoneCount(0);
    stopAllRequested = false;
    // Force the app inside the capture iframes to render in the manual's language,
    // so Arabic manual sections get Arabic screenshots and English ones get English.
    const originalLang = localStorage.getItem("language");
    localStorage.setItem("language", language);
    try {
    for (let i = 0; i < sections.length; i++) {
      if (stopAllRequested) break;
      const section = sections[i];
      const routes = getRoutes(section.module_name);
      setCurrentIdx(i);
      if (routes.length === 0) {
        setResults((prev) => ({ ...prev, [section.id]: { status: "skipped" } }));
        continue;
      }
      try {
        const captured = [];
        const routeErrors = [];
        for (const route of routes) {
          if (stopAllRequested) break;
          try {
            const urls = await captureRoute(route, language);
            captured.push(...urls);
          } catch (e) {
            routeErrors.push(`${routeLabel(route)}: ${e.message}`);
          }
        }
        if (captured.length === 0) throw new Error(routeErrors.join(" | ") || "All route captures failed");

        await base44.entities.VeraKit360ManualSection.update(section.id, {
          screenshot_urls: captured,
        });
        setResults((prev) => ({ ...prev, [section.id]: { status: "done", count: captured.length } }));
        setDoneCount((c) => c + 1);
      } catch (error) {
        setResults((prev) => ({ ...prev, [section.id]: { status: "error", error: error.message } }));
      }
    }
    } finally {
      // Restore the user's original app language
      if (originalLang) localStorage.setItem("language", originalLang);
      else localStorage.removeItem("language");
    }
    setCapturing(false);
    setCurrentIdx(-1);
    onComplete();
  };

  return (
    <Dialog open onOpenChange={(open) => !capturing && !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" />
            Capture App Screenshots ({language === "ar" ? "العربية — Arabic version" : "English version"})
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm text-slate-500 mb-3">
          Upload a real screenshot for each section (recommended), or use auto-capture.
          <strong className="text-slate-700"> Tip:</strong> During auto-capture, press <strong>⏸ Pause</strong> on the preview window to scroll, click tabs and open panels yourself, then press <strong>📷 Capture</strong> to snap exactly what you see — hit Resume to continue. You can also upload files with the <Upload className="w-3 h-3 inline text-slate-500" /> button next to each section.
        </div>

        <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
          {sections.map((section, idx) => {
            const routes = getRoutes(section.module_name);
            const result = results[section.id];
            const isCurrent = idx === currentIdx;
            const hasExisting = section.screenshot_urls?.length > 0;
            return (
              <div
                key={section.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                  isCurrent ? "border-blue-400 bg-blue-50" : "border-slate-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">{section.module_name}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap">
                    {routes.length > 0 ? (
                      routes.map((r, ri) => (
                        <span key={ri} className="flex items-center gap-0.5">
                          {ri > 0 && <span className="text-slate-300">+</span>}
                          <ExternalLink className="w-3 h-3" /> {routeLabel(r)}
                        </span>
                      ))
                    ) : (
                      "No route mapped"
                    )}
                    {hasExisting && !result && <span className="text-green-500 ml-2">• {section.screenshot_urls.length} screenshot(s)</span>}
                  </div>
                  {result?.status === "error" && (
                    <div className="text-xs text-red-500 mt-0.5 break-words">{result.error}</div>
                  )}
                </div>
                <div className="flex-shrink-0 ml-2 flex items-center gap-1">
                  <label className={`cursor-pointer p-1.5 rounded hover:bg-slate-100 ${result?.status === "uploading" ? "pointer-events-none opacity-50" : ""}`} title="Upload screenshot">
                    {result?.status === "uploading" ? (
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    ) : (
                      <Upload className="w-4 h-4 text-slate-500" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(section, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {result?.status === "done" && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      {result.count > 1 && <span className="text-xs font-medium">{result.count}</span>}
                    </div>
                  )}
                  {result?.status === "error" && (
                    <div title={result.error} className="flex items-center gap-1 text-red-500">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                  {result?.status === "skipped" && <SkipForward className="w-5 h-5 text-slate-300" />}
                  {isCurrent && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
                  {!result && !isCurrent && hasExisting && (
                    <CheckCircle2 className="w-4 h-4 text-slate-300" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={capturing}>
            {capturing ? "Capturing..." : "Close"}
          </Button>
          <Button onClick={handleCaptureAll} disabled={capturing} className="gap-2 bg-blue-600 hover:bg-blue-700">
            {capturing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Capturing {doneCount + 1}/{totalWithRoute}...</>
            ) : (
              <><Camera className="w-4 h-4" /> {doneCount > 0 ? "Re-capture All" : "Start Capture"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}