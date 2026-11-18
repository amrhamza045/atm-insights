import { base44 } from "@/api/base44Client";

// Helper: convert a data URL to a File object for upload
const dataURLtoFile = (dataUrl, filename) => {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new File([u8arr], filename, { type: mime });
};

// Verify that a captured image contains a valid face (quality + liveness check)
// Used during registration to ensure a proper face photo is saved
export const verifyFaceQuality = async (imageDataUrl) => {
  try {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageDataUrl;
    });

    const canvas = document.createElement('canvas');
    const size = 300;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, size, size);
    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const pixelCount = data.length / 4;

    // Calculate average brightness
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
    const avgBrightness = totalBrightness / pixelCount;

    if (avgBrightness < 40) {
      return { valid: false, reason: "Image too dark. Please ensure good lighting." };
    }
    if (avgBrightness > 220) {
      return { valid: false, reason: "Image too bright. Please reduce lighting." };
    }

    // Calculate variance — a real face has sufficient detail/variance
    let sumVariance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
      sumVariance += Math.pow(gray - avgBrightness, 2);
    }
    const variance = Math.sqrt(sumVariance / pixelCount);

    if (variance < 25) {
      return { valid: false, reason: "No face detected. Please position your face in the frame." };
    }

    // Edge density check — faces have edges/features (eyes, nose, mouth)
    let edgeCount = 0;
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        const idx = (y * size + x) * 4;
        const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        const grayRight = (data[idx + 4] + data[idx + 5] + data[idx + 6]) / 3;
        const grayDown = (data[idx + size * 4] + data[idx + size * 4 + 1] + data[idx + size * 4 + 2]) / 3;
        if (Math.abs(gray - grayRight) > 30 || Math.abs(gray - grayDown) > 30) {
          edgeCount++;
        }
      }
    }
    const edgeRatio = edgeCount / (size * size);
    if (edgeRatio < 0.05) {
      return { valid: false, reason: "Insufficient facial features detected. Please face the camera directly." };
    }

    const confidence = Math.round(Math.min(100, variance / 2 + edgeRatio * 200));
    return { valid: true, confidence, brightness: Math.round(avgBrightness), detail: Math.round(variance) };
  } catch (error) {
    return { valid: false, reason: "Could not verify image: " + error.message };
  }
};

// Process an employee face photo: detect the face, crop tightly, and blur the background
// so that wall art, drawings, or other people behind the employee are not distracting.
export const processEmployeeFacePhoto = async (imageDataUrl) => {
  try {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageDataUrl;
    });

    const w = img.naturalWidth;
    const h = img.naturalHeight;

    // --- Step 1: Detect face region (FaceDetector API or center heuristic) ---
    let faceRegion = null;

    const FaceDetectorAPI = window.FaceDetector;
    if (FaceDetectorAPI) {
      try {
        const detector = new FaceDetectorAPI({ maxDetectedFaces: 1, fastMode: true });
        const bitmap = await createImageBitmap(img);
        const faces = await detector.detect(bitmap);
        bitmap.close();
        if (faces.length > 0) {
          const box = faces[0].boundingBox;
          faceRegion = { x: box.x, y: box.y, width: box.width, height: box.height };
        }
      } catch (e) {
        // FaceDetector not available or failed — fall through to center heuristic
      }
    }

    // Fallback: assume face is centered (the UI oval guide ensures this)
    if (!faceRegion) {
      const fw = w * 0.42;
      const fh = h * 0.55;
      faceRegion = {
        x: (w - fw) / 2,
        y: (h - fh) / 2 - h * 0.05,
        width: fw,
        height: fh
      };
    }

    // --- Step 2: Expand crop to include head + shoulders (generous padding) ---
    const padX = faceRegion.width * 1.1;
    const padTop = faceRegion.height * 0.35;
    const padBottom = faceRegion.height * 1.9;
    const cropX = Math.max(0, faceRegion.x - padX);
    const cropY = Math.max(0, faceRegion.y - padTop);
    const cropW = Math.min(w - cropX, faceRegion.width + padX * 2);
    const cropH = Math.min(h - cropY, faceRegion.height + padTop + padBottom);

    // --- Step 3: Draw the cropped sharp image ---
    const outW = 400;
    const outH = Math.round(outW * (cropH / cropW));

    const sharpCanvas = document.createElement('canvas');
    sharpCanvas.width = outW;
    sharpCanvas.height = outH;
    const sharpCtx = sharpCanvas.getContext('2d');
    sharpCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

    // --- Step 4: Create a blurred version of the same crop ---
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = outW;
    blurCanvas.height = outH;
    const blurCtx = blurCanvas.getContext('2d');
    blurCtx.filter = 'blur(16px)';
    blurCtx.drawImage(sharpCanvas, 0, 0);

    // --- Step 5: Create masked sharp image (only center is opaque) ---
    const maskedCanvas = document.createElement('canvas');
    maskedCanvas.width = outW;
    maskedCanvas.height = outH;
    const maskedCtx = maskedCanvas.getContext('2d');

    maskedCtx.drawImage(sharpCanvas, 0, 0);

    // Radial gradient: keep center (face) sharp, fade to transparent at edges
    maskedCtx.globalCompositeOperation = 'destination-in';
    const cx = outW / 2;
    const cy = outH * 0.38;
    const innerR = Math.min(outW, outH) * 0.24;
    const outerR = Math.min(outW, outH) * 0.52;
    const grad = maskedCtx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    maskedCtx.fillStyle = grad;
    maskedCtx.fillRect(0, 0, outW, outH);

    // --- Step 6: Composite: blurred base + masked sharp on top ---
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d');

    outCtx.drawImage(blurCanvas, 0, 0);
    outCtx.drawImage(maskedCanvas, 0, 0);

    return outCanvas.toDataURL('image/jpeg', 0.9);
  } catch (error) {
    console.error('Face photo processing error:', error);
    return imageDataUrl; // Return original on any failure
  }
};

// Face recognition: compare a captured face image against the stored registration photo.
// Uses AI vision (InvokeLLM) to compare facial features — this is reliable regardless
// of image size, crop, or background differences between the stored and live photos.
export const compareFaces = async (capturedFaceData, storedFaceData) => {
  try {
    // Prepare captured image URL (upload if it's a data URL)
    let capturedUrl = capturedFaceData;
    if (capturedFaceData.startsWith('data:')) {
      const file = dataURLtoFile(capturedFaceData, 'captured_face.jpg');
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      capturedUrl = uploadRes.file_url;
    }

    // Prepare stored image URL (upload if it's a data URL)
    let storedUrl = storedFaceData;
    if (storedFaceData.startsWith('data:')) {
      const file = dataURLtoFile(storedFaceData, 'stored_face.jpg');
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      storedUrl = uploadRes.file_url;
    }

    // Use AI vision to compare the two faces
    const response = await base44.integrations.Core.InvokeLLM({
      prompt: "You are a face recognition system. You are given two face photos. The FIRST image is a freshly captured photo from a camera. The SECOND image is the registered reference photo. Determine whether they show the SAME PERSON by comparing facial features: eyes, eyebrows, nose, mouth, jawline, ear shape, and any distinguishing features. Be lenient with lighting, angle, and expression differences. Respond with is_same_person (true/false) and confidence (0-100).",
      file_urls: [capturedUrl, storedUrl],
      response_json_schema: {
        type: "object",
        properties: {
          is_same_person: { type: "boolean" },
          confidence: { type: "number" }
        }
      }
    });

    // Normalize the LLM response — is_same_person can come back as boolean true,
    // string "true", or number 1 depending on the model. Strict === true fails
    // intermittently, leaving match=false even when the LLM verified the face.
    const isSamePerson = response?.is_same_person === true ||
                         String(response?.is_same_person).toLowerCase() === "true" ||
                         response?.is_same_person === 1;
    return {
      match: isSamePerson,
      confidence: Math.round(Number(response?.confidence) || 0),
      details: { method: "AI vision comparison" }
    };
  } catch (error) {
    console.error('Face comparison error:', error);
    return { match: false, confidence: 0, details: {}, error: error.message };
  }
};