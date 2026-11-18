/**
 * Enhances a cropped QR code image for maximum scan reliability and print quality.
 *
 * QR codes are inherently black-and-white, so we:
 *  1. Upscale (default 3x) for higher resolution printing.
 *  2. Apply Otsu-style adaptive threshold to produce pure black & white pixels
 *     (removes grey noise, shadows, and compression artifacts).
 *  3. Optionally sharpen edges to make the black modules bolder.
 *  4. Add a white "quiet zone" border (required by QR spec for reliable scanning).
 *
 * @param {HTMLImageElement|HTMLCanvasElement} source - the source image or canvas
 * @param {number} sx - source x
 * @param {number} sy - source y
 * @param {number} sw - source width
 * @param {number} sh - source height
 * @returns {Promise<HTMLCanvasElement>} enhanced canvas
 */
export async function enhanceQrCanvas(source, sx, sy, sw, sh) {
  const UPSCALE = 3;
  const QUIET_ZONE_PX = 8 * UPSCALE; // white border

  const work = document.createElement("canvas");
  work.width = sw * UPSCALE;
  work.height = sh * UPSCALE;
  const wctx = work.getContext("2d");
  wctx.imageSmoothingEnabled = true;
  wctx.imageSmoothingQuality = "high";
  wctx.drawImage(source, sx, sy, sw, sh, 0, 0, work.width, work.height);

  const imageData = wctx.getImageData(0, 0, work.width, work.height);
  const data = imageData.data;

  // --- Otsu's method: find optimal threshold ---
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    histogram[gray]++;
  }
  const total = data.length / 4;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * histogram[t];
  let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const betweenVar = wB * wF * (mB - mF) * (mB - mF);
    if (betweenVar > maxVar) { maxVar = betweenVar; threshold = t; }
  }

  // --- Binarize to pure B&W + bold (darken edges by eroding white slightly) ---
  // Use threshold slightly below midpoint to favor black (bold) pixels
  const binarizeThreshold = Math.max(0, threshold - 10);
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    const val = gray <= binarizeThreshold ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }
  wctx.putImageData(imageData, 0, 0);

  // --- Dilation pass: grow black pixels for bolder modules ---
  const dilated = wctx.getImageData(0, 0, work.width, work.height);
  const src = imageData.data;
  const dst = dilated.data;
  const w = work.width, h = work.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      let blackCount = 0;
      // Check 4-neighbors; if any neighbor is black, make this pixel black (dilate)
      if (src[idx] === 0) { dst[idx] = 0; dst[idx + 1] = 0; dst[idx + 2] = 0; dst[idx + 3] = 255; continue; }
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (src[(ny * w + nx) * 4] === 0) blackCount++;
        }
      }
      // If 2+ black neighbors, make black (bold the edges)
      if (blackCount >= 2) { dst[idx] = 0; dst[idx + 1] = 0; dst[idx + 2] = 0; dst[idx + 3] = 255; }
      else { dst[idx] = 255; dst[idx + 1] = 255; dst[idx + 2] = 255; dst[idx + 3] = 255; }
    }
  }
  wctx.putImageData(dilated, 0, 0);

  // --- Add white quiet zone border ---
  const final = document.createElement("canvas");
  final.width = work.width + QUIET_ZONE_PX * 2;
  final.height = work.height + QUIET_ZONE_PX * 2;
  const fctx = final.getContext("2d");
  fctx.fillStyle = "#ffffff";
  fctx.fillRect(0, 0, final.width, final.height);
  fctx.drawImage(work, QUIET_ZONE_PX, QUIET_ZONE_PX);

  return final;
}

/**
 * Convenience: enhance from an existing raw crop canvas (no sub-region needed).
 * @param {HTMLCanvasElement} rawCanvas
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function enhanceQrFromCanvas(rawCanvas) {
  return enhanceQrCanvas(rawCanvas, 0, 0, rawCanvas.width, rawCanvas.height);
}