import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, RotateCcw, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { processEmployeeFacePhoto } from "@/components/utils/faceRecognition";

export default function FaceScanner({ onFaceCaptured, mode = "capture" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [faceCaptured, setFaceCaptured] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);

  useEffect(() => {
    if (!isCameraActive) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        toast.error("Cannot access camera. Please check permissions.");
        setIsCameraActive(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraActive]);

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const video = videoRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg");

    // Stop camera
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsCameraActive(false);

    // If in verify mode and stored face exists, compare faces
    // Use the RAW image for comparison — background processing would alter
    // pixel data and cause false mismatches.
    if (mode === "verify") {
      // The server compares this photo with the registered face when you sign in/out.
      onFaceCaptured(imageData, null);
    } else {
      // Capture mode (registration): process photo to blur background
      const processedImage = await processEmployeeFacePhoto(imageData);
      onFaceCaptured(processedImage, null);
      toast.success("Face captured successfully");
    }
    
    setFaceCaptured(true);
  };

  const handleReset = () => {
    setFaceCaptured(false);
    setIsCameraActive(false);
    setComparisonResult(null);
  };

  if (faceCaptured) {
    return (
      <div className="space-y-3">
        {isComparing && (
          <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="animate-spin mr-2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm text-blue-700">Comparing face...</p>
          </div>
        )}

        {comparisonResult && (
          <div className={`flex items-start gap-3 p-4 rounded-lg ${
            comparisonResult.match ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {comparisonResult.match ? (
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-semibold ${comparisonResult.match ? 'text-green-700' : 'text-red-700'}`}>
                {comparisonResult.match ? 'Face Verified' : 'Face Mismatch'}
              </p>
              <p className={`text-xs ${comparisonResult.match ? 'text-green-600' : 'text-red-600'}`}>
                Confidence: {comparisonResult.confidence}%
              </p>
            </div>
          </div>
        )}

        {!isComparing && (
          <div className={`rounded-lg p-4 text-center ${
            comparisonResult?.match ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
          }`}>
            <p className={`text-sm font-semibold ${
              comparisonResult?.match ? 'text-green-700' : 'text-blue-700'
            }`}>
              {comparisonResult?.match ? '✓ Face verified' : '✓ Face captured'}
            </p>
          </div>
        )}

        <Button 
          variant="outline" 
          onClick={handleReset} 
          className="w-full gap-2"
          disabled={isComparing}
        >
          <RotateCcw className="w-4 h-4" />
          {mode === "verify" ? "Retry" : "Retake"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isCameraActive ? (
        <>
          <div className="relative bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <Button onClick={captureImage} className="w-full gap-2 bg-green-600 hover:bg-green-700">
            <Camera className="w-4 h-4" />
            Capture Face
          </Button>
        </>
      ) : (
        <Button 
          onClick={() => setIsCameraActive(true)} 
          className="w-full gap-2"
        >
          <Camera className="w-4 h-4" />
          Start Camera
        </Button>
      )}
    </div>
  );
}