import { base44 } from "@/api/base44Client";
import { enhanceQrCanvas } from "@/components/utils/qrImageEnhancer";

/**
 * Calculates the Intersection-over-Union (IoU) overlap between two rectangles.
 */
function calculateIoU(rect1, rect2) {
  const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
  const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
  const intersection = xOverlap * yOverlap;
  const area1 = rect1.width * rect1.height;
  const area2 = rect2.width * rect2.height;
  const union = area1 + area2 - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Crops a QR code from a Talabat receipt image.
 *
 * On Talabat receipts, the QR code is always located between the client's
 * mobile number and the client's delivery address. The AI provides a bounding
 * box for the QR based on this contextual understanding.
 *
 * Strategy:
 * 1. Use the AI-provided bounding box as the primary region (the AI understands
 *    receipt layout and won't confuse background QR codes with the receipt QR).
 * 2. Try the browser's BarcodeDetector to refine the crop precisely, but ONLY
 *    accept detections that overlap with the AI region — this prevents picking
 *    up QR codes from the background (walls, screens, other papers, etc.).
 * 3. Fall back to the AI bounding box directly if BarcodeDetector finds nothing
 *    matching or is unavailable.
 *
 * The crop is always forced to be square (QR codes are square).
 *
 * @param {string} imageUrl - URL of the uploaded receipt photo
 * @param {object} boundingBox - AI-provided QR location { x_pct, y_pct, width_pct, height_pct }
 * @param {HTMLCanvasElement} canvas - Hidden canvas element for drawing
 * @returns {Promise<{file_url: string, qr_content: string|null}|null>}
 */
export async function cropQrCodeFromReceipt(imageUrl, boundingBox, canvas) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      try {
        if (!canvas) {
          reject(new Error("Canvas not available"));
          return;
        }
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;

        // Convert AI bounding box percentages to pixel coordinates
        let aiRegion = null;
        if (boundingBox && boundingBox.width_pct > 0) {
          const xFrac = Math.max(0, Math.min(100, boundingBox.x_pct)) / 100;
          const yFrac = Math.max(0, Math.min(100, boundingBox.y_pct)) / 100;
          const wFrac = Math.max(0, Math.min(100, boundingBox.width_pct)) / 100;
          const hFrac = Math.max(0, Math.min(100, boundingBox.height_pct)) / 100;
          aiRegion = {
            x: xFrac * imgWidth,
            y: yFrac * imgHeight,
            width: wFrac * imgWidth,
            height: hFrac * imgHeight
          };
        }

        // Strategy 1: Try BarcodeDetector, but only accept detections overlapping the AI region
        if (typeof window !== "undefined" && "BarcodeDetector" in window && aiRegion) {
          try {
            const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
            const barcodes = await detector.detect(img);
            if (barcodes && barcodes.length > 0) {
              // Find the barcode with the highest overlap with the AI region
              let bestBarcode = null;
              let bestIoU = 0;
              for (const barcode of barcodes) {
                const iou = calculateIoU(barcode.boundingBox, aiRegion);
                if (iou > bestIoU) {
                  bestIoU = iou;
                  bestBarcode = barcode;
                }
              }
              // Only use the BarcodeDetector result if it significantly overlaps
              // the AI region (>= 0.15 IoU). This filters out QR codes detected
              // outside the receipt (background, walls, screens, etc.)
              if (bestBarcode && bestIoU >= 0.15) {
                const rect = bestBarcode.boundingBox;
                const centerX = rect.x + rect.width / 2;
                const centerY = rect.y + rect.height / 2;
                const detected = Math.max(rect.width, rect.height);
                const pad = detected * 0.15;
                let cropSize = Math.min(imgWidth, imgHeight, Math.ceil(detected + pad * 2));
                let cropX = Math.max(0, Math.floor(centerX - cropSize / 2));
                let cropY = Math.max(0, Math.floor(centerY - cropSize / 2));
                cropSize = Math.min(imgWidth - cropX, imgHeight - cropY, cropSize);
                cropX = Math.max(0, Math.min(cropX, imgWidth - cropSize));
                cropY = Math.max(0, Math.min(cropY, imgHeight - cropSize));

                // Draw raw crop, then enhance (binarize + upscale + bold + quiet zone)
                const enhanced = await enhanceQrCanvas(img, cropX, cropY, cropSize, cropSize);

                const blob = await new Promise((res) => enhanced.toBlob(res, "image/png"));
                if (!blob) { reject(new Error("Failed to create QR image blob")); return; }
                const file = new File([blob], "qr_code.png", { type: "image/png" });
                const uploadResult = await base44.integrations.Core.UploadFile({ file });
                resolve({
                  file_url: uploadResult.file_url,
                  qr_content: bestBarcode.rawValue || null
                });
                return;
              }
            }
          } catch (e) {
            console.log("BarcodeDetector failed, falling back to AI bbox:", e.message);
          }
        }

        // Strategy 2: Fall back to AI-provided bounding box
        if (!aiRegion) {
          resolve(null);
          return;
        }

        const centerX = aiRegion.x + aiRegion.width / 2;
        const centerY = aiRegion.y + aiRegion.height / 2;
        const detectedSize = Math.max(aiRegion.width, aiRegion.height);
        const pad = detectedSize * 0.20;
        let cropSize = Math.min(imgWidth, imgHeight, Math.ceil(detectedSize + pad * 2));
        let cropX = Math.max(0, Math.floor(centerX - cropSize / 2));
        let cropY = Math.max(0, Math.floor(centerY - cropSize / 2));
        cropSize = Math.min(imgWidth - cropX, imgHeight - cropY, cropSize);
        cropX = Math.max(0, Math.min(cropX, imgWidth - cropSize));
        cropY = Math.max(0, Math.min(cropY, imgHeight - cropSize));

        const enhanced = await enhanceQrCanvas(img, cropX, cropY, cropSize, cropSize);

        const blob = await new Promise((res) => enhanced.toBlob(res, "image/png"));
        if (!blob) { resolve(null); return; }
        const file = new File([blob], "qr_code.png", { type: "image/png" });
        const uploadResult = await base44.integrations.Core.UploadFile({ file });
        resolve({ file_url: uploadResult.file_url, qr_content: null });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Failed to load receipt image for QR cropping"));
    img.src = imageUrl;
  });
}