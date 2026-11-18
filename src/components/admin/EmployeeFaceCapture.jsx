import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, Check, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { verifyFaceQuality, processEmployeeFacePhoto } from "@/components/utils/faceRecognition";
import { base44 } from "@/api/base44Client";

export default function EmployeeFaceCapture({ onCapture, existingFaceData }) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(existingFaceData || null);
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    setCapturedImage(existingFaceData || null);
    setVerificationResult(null);
  }, [existingFaceData]);

  // Start camera stream once the video element is rendered (isCameraActive === true)
  useEffect(() => {
    if (!isCameraActive) return;

    let cancelled = false;

    const startStream = async () => {
      try {
        setCameraStarting(true);
        setCameraError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 480 }, height: { ideal: 640 } }
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStarting(false);
      } catch (error) {
        if (cancelled) return;
        setCameraStarting(false);
        setCameraError(error.message || "Could not access camera");
        toast.error("Could not access camera: " + (error.message || "Unknown error"));
        setIsCameraActive(false);
      }
    };

    startStream();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraActive]);

  const handleStartCamera = () => {
    setCameraError(null);
    setIsCameraActive(true);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      toast.error("Camera not ready yet, please wait a moment.");
      return;
    }

    const ctx = canvasRef.current.getContext("2d");
    canvasRef.current.width = video.videoWidth;
    canvasRef.current.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const rawDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.85);

    // Process the photo: detect face, crop tightly, and blur the background
    // so wall art / drawings behind the employee are not distracting.
    setVerifying(true);
    setVerificationResult(null);
    const processedDataUrl = await processEmployeeFacePhoto(rawDataUrl);
    const quality = await verifyFaceQuality(processedDataUrl);
    setVerifying(false);

    if (!quality.valid) {
      setVerificationResult({ valid: false, reason: quality.reason });
      toast.error(quality.reason);
      return; // Keep camera active for retry
    }

    setVerificationResult({ valid: true, confidence: quality.confidence });
    setCapturedImage(processedDataUrl);
    stopCamera();

    // Upload the image and pass the URL to the parent
    setUploading(true);
    try {
      // Convert data URL to File
      const blob = await (await fetch(processedDataUrl)).blob();
      const file = new File([blob], `employee_face_${Date.now()}.jpg`, { type: "image/jpeg" });
      const result = await base44.integrations.Core.UploadFile({ file });
      onCapture(result.file_url);
      toast.success(`Face verified and captured (${quality.confidence}% quality)`);
    } catch (uploadErr) {
      console.error("Face photo upload error:", uploadErr);
      // Fallback: pass the data URL directly
      onCapture(processedDataUrl);
      toast.warning("Face captured but could not upload photo — using local data");
    } finally {
      setUploading(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setVerificationResult(null);
    handleStartCamera();
  };

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Employee Face Photo (Registration)
          </label>
          {capturedImage && verificationResult?.valid && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Check className="w-3 h-3" /> Verified
            </span>
          )}
        </div>

        <p className="text-xs text-slate-500">
          This photo will be saved as the employee's reference face. It will be used to verify identity during attendance — no new photos are stored daily.
        </p>

        {verifying && (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
            <p className="text-sm text-blue-700">Verifying face...</p>
          </div>
        )}

        {uploading && (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <Loader2 className="w-4 h-4 text-blue-600 mr-2 animate-spin" />
            <p className="text-sm text-blue-700">Saving face photo...</p>
          </div>
        )}

        {verificationResult && !verificationResult.valid && !verifying && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{verificationResult.reason}</p>
          </div>
        )}

        {!capturedImage ? (
          <>
            {!isCameraActive ? (
              <Button onClick={handleStartCamera} variant="outline" className="w-full gap-2">
                <Camera className="w-4 h-4" />
                Take Face Photo
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="relative w-full aspect-[3/4] max-h-96 mx-auto overflow-hidden rounded-lg bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {cameraStarting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  {!cameraStarting && (
                    <div className="absolute inset-0 pointer-events-none">
                      <svg viewBox="0 0 300 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                        <g fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeDasharray="8 6">
                          <ellipse cx="150" cy="130" rx="55" ry="70" />
                          <path d="M20 400 C20 300 60 255 110 245 L150 262 L190 245 C240 255 280 300 280 400" />
                        </g>
                      </svg>
                      <p className="absolute bottom-2 inset-x-0 text-center text-xs text-white/90">
                        Fit face, shoulders and upper torso (uniform) inside the guide
                      </p>
                    </div>
                  )}
                </div>
                {cameraError && (
                  <p className="text-xs text-red-600">{cameraError}</p>
                )}
                <Button onClick={capturePhoto} className="flex-1 w-full gap-2" disabled={verifying || cameraStarting || uploading}>
                  {verifying ? "Verifying..." : "Capture & Verify"}
                </Button>
                <Button onClick={stopCamera} variant="outline" className="w-full">
                  Cancel
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <img src={capturedImage} alt="Captured face" className="w-full rounded-lg max-h-96 object-contain bg-slate-100" />
            {verificationResult?.valid && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-700">Face verified successfully</p>
                  <p className="text-xs text-green-600">Quality score: {verificationResult.confidence}%</p>
                </div>
              </div>
            )}
            <Button onClick={retake} variant="outline" className="w-full gap-2" disabled={uploading}>
              <X className="w-4 h-4" />
              Retake Photo
            </Button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Card>
  );
}