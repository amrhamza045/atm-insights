import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Mic, Square, Play, Pause, Trash2, Send, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/components/LanguageProvider";

const LABELS = {
  en: {
    title: "Order by Voice 🎙️",
    micError: "Cannot access the microphone. Please allow access.",
    recordFirst: "Please record your order first",
    nameAndPhone: "Please enter your name and phone number",
    submitSuccess: "Your voice order was sent! The cashier will review it shortly.",
    submitFail: "Failed to send the order. Please try again.",
    recording: "Recording...",
    stopRecording: "Stop Recording",
    tapMic: "Tap the microphone and start recording your order",
    yourRecording: "Your order recording",
    reRecord: "Re-record",
    name: "Name *",
    namePlaceholder: "Your full name",
    phone: "Phone Number *",
    orderType: "Order Type",
    delivery: "Delivery",
    takeaway: "Takeaway",
    dineIn: "Dine In",
    notesLabel: "Additional Notes (optional)",
    notesPlaceholder: "Any special requests",
    cancel: "Cancel",
    sending: "Sending...",
    send: "Send Order",
  },
  ar: {
    title: "اطلب بصوتك 🎙️",
    micError: "لا يمكن الوصول للميكروفون. يرجى السماح بالوصول.",
    recordFirst: "يرجى تسجيل طلبك أولاً",
    nameAndPhone: "يرجى إدخال الاسم ورقم الهاتف",
    submitSuccess: "تم إرسال طلبك الصوتي! سيقوم الكاشير بمراجعته قريباً.",
    submitFail: "فشل إرسال الطلب. حاول مرة أخرى.",
    recording: "جارٍ التسجيل...",
    stopRecording: "إيقاف التسجيل",
    tapMic: "اضغط على الميكروفون وابدأ بتسجيل طلبك",
    yourRecording: "تسجيل طلبك",
    reRecord: "إعادة التسجيل",
    name: "الاسم *",
    namePlaceholder: "اسمك الكامل",
    phone: "رقم الهاتف *",
    orderType: "نوع الطلب",
    delivery: "توصيل",
    takeaway: "استلام من المطعم",
    dineIn: "تناول في المطعم",
    notesLabel: "ملاحظات إضافية (اختياري)",
    notesPlaceholder: "أي طلبات خاصة",
    cancel: "إلغاء",
    sending: "جارٍ الإرسال...",
    send: "إرسال الطلب",
  },
};

export default function VoiceOrderModal({ isOpen, onClose }) {
  const { language } = useLanguage();
  const L = LABELS[language === "ar" ? "ar" : "en"];
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderType, setOrderType] = useState("delivery");
  const [notes, setNotes] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const streamRef = useRef(null);

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    enabled: isOpen,
  });

  const { data: client } = useQuery({
    queryKey: ["client", currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return null;
      const clients = await base44.entities.Client.filter({ email: currentUser.email });
      return clients[0] || null;
    },
    enabled: !!currentUser?.email,
  });

  // Pre-fill name and phone from client data
  useEffect(() => {
    if (client) {
      setCustomerName(client.name || "");
      setCustomerPhone(client.phone || "");
    }
  }, [client]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setIsPlaying(false);
      setNotes("");
    }
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (error) {
      toast.error(L.micError);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsRecording(false);
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      toast.error(L.recordFirst);
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error(L.nameAndPhone);
      return;
    }

    setUploading(true);
    try {
      // Upload audio file
      const audioFile = new File([audioBlob], `voice_order_${Date.now()}.webm`, {
        type: "audio/webm",
      });
      const uploadResult = await base44.integrations.Core.UploadFile({ file: audioFile });

      // Create VoiceOrder entity
      const voiceOrder = await base44.entities.VoiceOrder.create({
        audio_url: uploadResult.file_url,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        order_type: orderType,
        status: "processing",
        branch_id: client?.branch_id || null,
        branch_name: client?.branch_name || null,
        notes: notes.trim(),
      });

      // Trigger backend processing
      base44.functions
        .invoke("processVoiceNote", {
          voice_order_id: voiceOrder.id,
          audio_url: uploadResult.file_url,
        })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
        })
        .catch(() => {});

      toast.success(L.submitSuccess);
      onClose();
    } catch (error) {
      toast.error(L.submitFail);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mic className="w-5 h-5 text-amber-500" />
            {L.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Recording Section */}
          <div className="flex flex-col items-center gap-4 py-4">
            {!audioUrl ? (
              <>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-lg ${
                    isRecording
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-amber-500 hover:bg-amber-600"
                  } text-white`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8" fill="white" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
                <div className="text-center">
                  {isRecording ? (
                    <>
                      <p className="text-red-600 font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        {L.recording} {formatTime(recordingTime)}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={stopRecording}
                        className="mt-2 text-red-600 border-red-300 hover:bg-red-50"
                      >
                        {L.stopRecording}
                      </Button>
                    </>
                  ) : (
                    <p className="text-slate-600 text-sm">
                      {L.tapMic}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Playback Section */}
                <div className="w-full bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                  <button
                    onClick={togglePlayback}
                    className="w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center flex-shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1">
                    <audio
                      ref={audioRef}
                      src={audioUrl}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                    <p className="text-sm font-medium text-slate-700">{L.yourRecording}</p>
                    <div className="w-full h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: "100%" }} />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={deleteRecording}
                    className="text-red-500 hover:bg-red-50 flex-shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    deleteRecording();
                    startRecording();
                  }}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  {L.reRecord}
                </Button>
              </>
            )}
          </div>

          {/* Customer Info Fields */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">{L.name}</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={L.namePlaceholder}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{L.phone}</Label>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                className="mt-1"
                dir="ltr"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">{L.orderType}</Label>
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery">{L.delivery}</SelectItem>
                  <SelectItem value="takeaway">{L.takeaway}</SelectItem>
                  <SelectItem value="dine_in">{L.dineIn}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium">{L.notesLabel}</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={L.notesPlaceholder}
                className="mt-1"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {L.cancel}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!audioBlob || uploading || !customerName.trim() || !customerPhone.trim()}
              className="flex-1 bg-amber-500 hover:bg-amber-600 gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {L.sending}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {L.send}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}