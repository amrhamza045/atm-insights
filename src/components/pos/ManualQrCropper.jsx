import React, { useState, useRef, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ZoomIn, ZoomOut, Crop, Loader2, Move, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { enhanceQrFromCanvas } from "@/components/utils/qrImageEnhancer";

/**
 * ManualQrCropper
 *
 * Lets the user drag (pan) and zoom the uploaded receipt image so the QR code
 * is centered inside a fixed square viewport. On confirm, the square region is
 * cropped at full resolution, uploaded, and (optionally) decoded via
 * BarcodeDetector.
 *
 * Props:
 *  - imageUrl: receipt photo URL
 *  - open: boolean
 *  - onClose: () => void
 *  - onCropComplete: ({ file_url, qr_content }) => void
 */
export default function ManualQrCropper({ imageUrl, open, onClose, onCropComplete }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [cropping, setCropping] = useState(false);
  const [hiddenReady, setHiddenReady] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const displayImgRef = useRef(null);
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenImgRef = useRef(null);

  // Reset transform + preload a CORS-enabled copy of the image for canvas drawing
  useEffect(() => {
    if (!open || !imageUrl) return;
    setScale(4);
    setOffset({ x: 0, y: 0 });
    setHiddenReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      hiddenImgRef.current = img;
      setHiddenReady(true);
    };
    img.onerror = () => toast.error("Failed to load image for cropping");
    img.src = imageUrl;
  }, [open, imageUrl]);

  const clampScale = (s) => Math.max(0.5, Math.min(6, s));

  const onPointerDown = (e) => {
    if (cropping) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };

  const onPointerUp = (e) => {
    setIsDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => clampScale(s + delta));
  };

  const resetView = () => {
    setScale(4);
    setOffset({ x: 0, y: 0 });
  };

  const handleCrop = useCallback(async () => {
    if (!hiddenImgRef.current || !viewportRef.current || !displayImgRef.current) {
      toast.error("Image not ready yet");
      return;
    }
    setCropping(true);
    try {
      const viewport = viewportRef.current.getBoundingClientRect();
      const imgRect = displayImgRef.current.getBoundingClientRect();
      const hidden = hiddenImgRef.current;
      const natW = hidden.naturalWidth;
      const natH = hidden.naturalHeight;

      // Uniform screen->natural ratio (the rendered width includes the CSS scale)
      const ratio = natW / imgRect.width;

      let natX = (viewport.left - imgRect.left) * ratio;
      let natY = (viewport.top - imgRect.top) * ratio;
      let natSize = viewport.width * ratio;

      // Clamp to image bounds, keep square
      natX = Math.max(0, Math.min(natX, natW - natSize));
      natY = Math.max(0, Math.min(natY, natH - natSize));
      natSize = Math.min(natSize, natW - natX, natH - natY);
      if (natSize < 10) {
        toast.error("Crop area too small — zoom in");
        setCropping(false);
        return;
      }

      const rawCanvas = canvasRef.current;
      rawCanvas.width = Math.round(natSize);
      rawCanvas.height = Math.round(natSize);
      const ctx = rawCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(hidden, natX, natY, natSize, natSize, 0, 0, rawCanvas.width, rawCanvas.height);

      // Try to decode QR content from the raw cropped canvas BEFORE enhancement
      // (original pixels may still have useful grey data for the detector)
      let qrContent = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const barcodes = await detector.detect(rawCanvas);
          if (barcodes && barcodes.length > 0) {
            qrContent = barcodes[0].rawValue || null;
          }
        } catch (_) { /* decoding is best-effort */ }
      }

      // Enhance: binarize to pure B&W, upscale 3x, dilate for bolder modules, add quiet zone
      const enhanced = await enhanceQrFromCanvas(rawCanvas);

      const blob = await new Promise((res) => enhanced.toBlob(res, "image/png"));
      if (!blob) throw new Error("Failed to create image");
      const file = new File([blob], "qr_code.png", { type: "image/png" });
      const uploadResult = await base44.integrations.Core.UploadFile({ file });

      onCropComplete?.({ file_url: uploadResult.file_url, qr_content: qrContent });
      if (qrContent) {
        toast.success("QR code image saved and decoded");
      } else {
        toast.success("QR code image saved");
      }
      onClose?.();
    } catch (err) {
      console.error("Manual crop error:", err);
      toast.error("Failed to crop QR image: " + (err.message || ""));
    } finally {
      setCropping(false);
    }
  }, [onCropComplete, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="sm:max-w-[480px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5 text-blue-600" />
            Position QR Code
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-slate-500 -mt-1">
          Drag the receipt to center the QR code inside the square. Use zoom to fit.
        </p>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Viewport — fixed square, overflow hidden */}
        <div
          ref={viewportRef}
          className="relative w-full aspect-square overflow-hidden rounded-lg border-2 border-blue-500 bg-slate-900 mx-auto select-none touch-none"
          style={{ cursor: isDragging ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
        >
          {imageUrl && (
            <img
              ref={displayImgRef}
              src={imageUrl}
              alt="Receipt"
              draggable={false}
              className="absolute max-w-none max-h-none"
              style={{
                left: "50%",
                top: "50%",
                width: "100%",
                height: "auto",
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                transformOrigin: "center center",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Center crosshair guide */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="absolute w-px h-8 bg-white/40" />
            <div className="absolute h-px w-8 bg-white/40" />
          </div>
          {/* Corner brackets to emphasize the square crop area */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/80" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/80" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/80" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/80" />
          </div>

          {!hiddenReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setScale((s) => clampScale(s - 0.2))} disabled={cropping}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-slate-500 w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => setScale((s) => clampScale(s + 0.2))} disabled={cropping}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="ghost" size="sm" onClick={resetView} disabled={cropping} className="gap-1">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Move className="w-3.5 h-3.5" />
          <span>Drag to move • Scroll or use +/- to zoom</span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose?.()} disabled={cropping}>
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={cropping || !hiddenReady} className="gap-2 bg-blue-600 hover:bg-blue-700">
            {cropping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Crop & Save
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}