import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Mic, Play, Pause, Check, Flag, X, Loader2, AlertTriangle, Phone, User, ShoppingBag, Truck, UtensilsCrossed, Wand2 } from "lucide-react";
import { toast } from "sonner";

const CONFIDENCE_CONFIG = {
  high: { color: "bg-green-100 text-green-700 border-green-300", label: "ثقة عالية", icon: Check },
  medium: { color: "bg-amber-100 text-amber-700 border-amber-300", label: "ثقة متوسطة", icon: AlertTriangle },
  low: { color: "bg-red-100 text-red-700 border-red-300", label: "ثقة منخفضة", icon: AlertTriangle },
  none: { color: "bg-slate-100 text-slate-600 border-slate-300", label: "قيد المعالجة", icon: Loader2 },
};

const ORDER_TYPE_ICONS = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
  delivery: Truck,
};

export default function VoiceReviewPanel({ selectedBranchId }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [processing, setProcessing] = useState(false);

  const queryClient = useQueryClient();

  const { data: voiceOrders = [], isLoading } = useQuery({
    queryKey: ["voiceOrders", selectedBranchId],
    queryFn: async () => {
      const all = await base44.entities.VoiceOrder.list("-created_date", 100);
      return all.filter(
        (o) =>
          ["pending", "processing", "flagged"].includes(o.status) &&
          (!selectedBranchId || !o.branch_id || o.branch_id === selectedBranchId)
      );
    },
    refetchInterval: 15000,
  });

  const handleApprove = async (order) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "approved",
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.success("تم اعتماد الطلب الصوتي. يمكنك الآن إنشاء طلب من التفاصيل.");
      setSelectedOrder(null);
    } catch (error) {
      toast.error("فشل اعتماد الطلب");
    } finally {
      setProcessing(false);
    }
  };

  const handleFlag = async (order) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "flagged",
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.info("تم وضع علامة على الطلب للمتابعة اليدوية");
    } catch (error) {
      toast.error("فشل تحديث الطلب");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (order, reason) => {
    setProcessing(true);
    try {
      const currentUser = await base44.auth.me();
      await base44.entities.VoiceOrder.update(order.id, {
        status: "rejected",
        rejection_reason: reason,
        processed_by: currentUser?.email || "",
        processed_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["voiceOrders"] });
      toast.success("تم رفض الطلب");
      setShowRejectDialog(false);
      setRejectionReason("");
      setSelectedOrder(null);
    } catch (error) {
      toast.error("فشل رفض الطلب");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (voiceOrders.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 border-2 border-purple-200 shadow-lg">
        <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="w-5 h-5 text-purple-600" />
            طلبات صوتية للمراجعة
            <Badge className="bg-purple-600 text-white">{voiceOrders.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {voiceOrders.map((order) => {
              const conf = CONFIDENCE_CONFIG[order.confidence] || CONFIDENCE_CONFIG.none;
              const OrderIcon = ORDER_TYPE_ICONS[order.order_type] || ShoppingBag;
              const ConfIcon = conf.icon;
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="text-left p-3 rounded-xl border-2 border-slate-200 hover:border-purple-400 hover:shadow-md transition-all bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <OrderIcon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-900">{order.customer_name || "—"}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1" dir="ltr">
                          <Phone className="w-3 h-3" />
                          {order.customer_phone || "—"}
                        </p>
                      </div>
                    </div>
                    <Badge className={`${conf.color} border`}>
                      <ConfIcon className={`w-3 h-3 mr-1 ${order.confidence === "none" ? "animate-spin" : ""}`} />
                      {conf.label}
                    </Badge>
                  </div>
                  {order.summary && (
                    <p className="text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded">
                      {order.summary}
                    </p>
                  )}
                  {order.status === "processing" && (
                    <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      جارٍ المعالجة...
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      {selectedOrder && (
        <VoiceReviewDialog
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onApprove={() => handleApprove(selectedOrder)}
          onFlag={() => handleFlag(selectedOrder)}
          onReject={(reason) => handleReject(selectedOrder, reason)}
          processing={processing}
          showRejectDialog={showRejectDialog}
          setShowRejectDialog={setShowRejectDialog}
          rejectionReason={rejectionReason}
          setRejectionReason={setRejectionReason}
        />
      )}
    </>
  );
}

export function VoiceReviewDialog({
  order,
  onClose,
  onApprove,
  onFlag,
  onReject,
  processing,
  showRejectDialog,
  setShowRejectDialog,
  rejectionReason,
  setRejectionReason,
}) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasListenedFully, setHasListenedFully] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const conf = CONFIDENCE_CONFIG[order.confidence] || CONFIDENCE_CONFIG.none;
  const OrderIcon = ORDER_TYPE_ICONS[order.order_type] || ShoppingBag;

  useEffect(() => {
    setHasListenedFully(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [order.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleSeek = (e) => {
    // Prevent skipping forward — enforce listening to the full audio
    if (!audioRef.current) return;
    const newTime = e.target.value;
    // Only allow seeking backwards, not forward
    if (newTime < currentTime) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={!!order} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-purple-600" />
            مراجعة الطلب الصوتي
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <User className="w-3 h-3" />
                الاسم
              </p>
              <p className="font-semibold text-slate-900">{order.customer_name}</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                الهاتف
              </p>
              <p className="font-semibold text-slate-900" dir="ltr">{order.customer_phone}</p>
            </div>
          </div>

          {/* Order Type */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <OrderIcon className="w-3 h-3" />
              {order.order_type === "dine_in" ? "تناول في المطعم" : order.order_type === "takeaway" ? "استلام" : "توصيل"}
            </Badge>
            <Badge className={`${conf.color} border`}>
              {conf.label}
            </Badge>
          </div>

          {/* Audio Player — No-skip enforcement */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-700 font-medium mb-3">
              🎙️ يجب الاستماع للتسجيل بالكامل قبل الاعتماد
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                disabled={!order.audio_url}
                className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center flex-shrink-0 disabled:opacity-50"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-purple-200"
                  style={{
                    background: `linear-gradient(to right, #9333ea ${duration ? (currentTime / duration) * 100 : 0}%, #e9d5ff ${duration ? (currentTime / duration) * 100 : 0}%)`,
                  }}
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={order.audio_url}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.target.duration)}
              onEnded={() => {
                setIsPlaying(false);
                setHasListenedFully(true);
              }}
            />
            {!hasListenedFully && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                لم يتم الاستماع للتسجيل بالكامل بعد
              </p>
            )}
            {hasListenedFully && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <Check className="w-3 h-3" />
                تم الاستماع للتسجيل بالكامل — يمكنك الاعتماد الآن
              </p>
            )}
          </div>

          {/* AI Summary */}
          {order.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-blue-700 mb-2">📋 ملخص الطلب (AI)</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.summary}</p>
            </div>
          )}

          {/* Confidence Reason */}
          {order.confidence_reason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">سبب مستوى الثقة</p>
              <p className="text-sm text-slate-700">{order.confidence_reason}</p>
            </div>
          )}

          {/* Corrected Transcript (AI reconstruction) */}
          {order.corrected_transcript && (
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                <Wand2 className="w-4 h-4 text-green-600" />
                النص المصحح (إعادة بناء AI)
              </Label>
              <div className="mt-1 bg-green-50 border border-green-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{order.corrected_transcript}</p>
              </div>
            </div>
          )}

          {/* Raw Transcript (original Whisper output) */}
          {order.transcript && (
            <div>
              <Label className="text-sm font-medium text-slate-500">النص الأصلي الخام (قبل التصحيح)</Label>
              <div className="mt-1 bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                <p className="text-sm text-slate-500 whitespace-pre-wrap">{order.transcript}</p>
              </div>
            </div>
          )}

          {/* Customer Notes */}
          {order.notes && (
            <div>
              <Label className="text-sm font-medium">ملاحظات العميل</Label>
              <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-2 rounded">{order.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={processing}
            >
              إغلاق
            </Button>
            <Button
              variant="outline"
              onClick={onFlag}
              className="flex-1 gap-1 border-amber-400 text-amber-600 hover:bg-amber-50"
              disabled={processing}
            >
              <Flag className="w-4 h-4" />
              متابعة يدوية
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(true)}
              className="flex-1 gap-1 border-red-400 text-red-600 hover:bg-red-50"
              disabled={processing}
            >
              <X className="w-4 h-4" />
              رفض
            </Button>
            <Button
              onClick={onApprove}
              disabled={processing || !hasListenedFully}
              className="flex-1 gap-1 bg-green-600 hover:bg-green-700"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              اعتماد
            </Button>
          </div>

          {/* Rejection Reason Dialog */}
          {showRejectDialog && (
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>سبب رفض الطلب</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="اكتب سبب الرفض..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowRejectDialog(false)} className="flex-1">
                      إلغاء
                    </Button>
                    <Button
                      onClick={() => onReject(rejectionReason)}
                      disabled={!rejectionReason.trim() || processing}
                      className="flex-1 bg-red-600 hover:bg-red-700"
                    >
                      تأكيد الرفض
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}