import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Save, CheckCircle, Clock, AlertCircle, Upload, X, Image } from "lucide-react";

const STATUS_CONFIG = {
  draft: { label: "Draft", label_ar: "مسودة", color: "bg-slate-100 text-slate-600", icon: Clock },
  pending_approval: { label: "Pending Approval", label_ar: "بانتظار الموافقة", color: "bg-warning-100 text-warning-700", icon: Clock },
  approved: { label: "Approved", label_ar: "معتمد", color: "bg-green-100 text-green-700", icon: CheckCircle },
  needs_revision: { label: "Needs Revision", label_ar: "يحتاج مراجعة", color: "bg-red-100 text-red-700", icon: AlertCircle },
};

export default function SectionEditor({ section, entry, onSaved, isAdmin, lang = "en" }) {
  const isAr = lang === "ar";
  const [contentEn, setContentEn] = useState(entry?.content_en ? JSON.stringify(entry.content_en, null, 2) : "{}");
  const [contentAr, setContentAr] = useState(entry?.content_ar ? JSON.stringify(entry.content_ar, null, 2) : "{}");
  const [preparedBy, setPreparedBy] = useState(entry?.prepared_by || "");
  const [reviewedBy, setReviewedBy] = useState(entry?.reviewed_by || "");
  const [approvedBy, setApprovedBy] = useState(entry?.approved_by || "");
  const [notes, setNotes] = useState(entry?.notes || "");
  const [saving, setSaving] = useState(false);
  const [dineInImages, setDineInImages] = useState(entry?.dine_in_images || []);
  const [deliveryImages, setDeliveryImages] = useState(entry?.delivery_images || []);
  const [uploadingDineIn, setUploadingDineIn] = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);

  const isRecipe = section.type === "recipe_food" || section.type === "recipe_beverage";
  const status = entry?.status || "draft";
  const StatusIcon = STATUS_CONFIG[status]?.icon || Clock;

  const handleSave = async (newStatus) => {
    setSaving(true);
    let parsedEn = {}, parsedAr = {};
    try { parsedEn = JSON.parse(contentEn); } catch { parsedEn = { raw: contentEn }; }
    try { parsedAr = JSON.parse(contentAr); } catch { parsedAr = { raw: contentAr }; }

    const payload = {
      section_key: section.key,
      section_number: section.number,
      section_title_en: section.title_en,
      section_title_ar: section.title_ar,
      section_type: section.type,
      main_category: section.main_category || "operations",
      item_category: section.item_category || null,
      content_en: parsedEn,
      content_ar: parsedAr,
      prepared_by: preparedBy,
      reviewed_by: reviewedBy,
      approved_by: approvedBy,
      notes,
      status: newStatus || status,
      dine_in_images: dineInImages,
      delivery_images: deliveryImages,
    };
    if (entry?.menu_item_id || section.menu_item_id) {
      payload.menu_item_id = entry?.menu_item_id || section.menu_item_id;
      payload.menu_item_name = entry?.menu_item_name || section.menu_item_name;
      payload.menu_category = entry?.menu_category || section.item_category;
    }

    try {
      if (entry?.id) {
        await base44.entities.KitchenManual.update(entry.id, payload);
      } else {
        await base44.entities.KitchenManual.create(payload);
      }
      toast.success(isAr ? "تم الحفظ بنجاح" : "Saved successfully");
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file, type) => {
    if (!file) return;
    const setter = type === "dine_in" ? setUploadingDineIn : setUploadingDelivery;
    setter(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (type === "dine_in") setDineInImages(prev => [...prev, file_url]);
      else setDeliveryImages(prev => [...prev, file_url]);
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setter(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[status]?.color}`}>
          <StatusIcon className="w-3 h-3" />
          {isAr ? STATUS_CONFIG[status]?.label_ar : STATUS_CONFIG[status]?.label}
        </span>
        {entry?.approved_date && (
          <span className="text-xs text-slate-400">{isAr ? "تاريخ الاعتماد:" : "Approved:"} {entry.approved_date}</span>
        )}
      </div>

      {/* Content - bilingual */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">📝 Content (English)</label>
          <Textarea
            value={contentEn}
            onChange={e => setContentEn(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
            placeholder='{"key": "value", "steps": []}'
            dir="ltr"
          />
          <p className="text-xs text-slate-400 mt-1">Enter content as JSON or plain text wrapped in {"{ \"raw\": \"...\" }"}</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">📝 المحتوى (عربي)</label>
          <Textarea
            value={contentAr}
            onChange={e => setContentAr(e.target.value)}
            className="font-mono text-xs min-h-[200px]"
            placeholder='{"المفتاح": "القيمة"}'
            dir="rtl"
          />
        </div>
      </div>

      {/* Recipe / Food & Beverage photos */}
      {isRecipe && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadArea
            label={isAr ? "صور خدمة المطعم" : "Dine-In Photos"}
            images={dineInImages}
            uploading={uploadingDineIn}
            onUpload={f => handleImageUpload(f, "dine_in")}
            onRemove={url => setDineInImages(prev => prev.filter(u => u !== url))}
          />
          <ImageUploadArea
            label={isAr ? "صور التوصيل" : "Delivery Photos"}
            images={deliveryImages}
            uploading={uploadingDelivery}
            onUpload={f => handleImageUpload(f, "delivery")}
            onRemove={url => setDeliveryImages(prev => prev.filter(u => u !== url))}
          />
        </div>
      )}

      {/* Meta fields */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{isAr ? "أُعد بواسطة" : "Prepared By"}</label>
          <Input value={preparedBy} onChange={e => setPreparedBy(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{isAr ? "راجع بواسطة" : "Reviewed By"}</label>
          <Input value={reviewedBy} onChange={e => setReviewedBy(e.target.value)} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">{isAr ? "اعتمد بواسطة" : "Approved By"}</label>
          <Input value={approvedBy} onChange={e => setApprovedBy(e.target.value)} className="text-sm" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1">{isAr ? "ملاحظات" : "Notes"}</label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="text-sm min-h-[60px]" />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-2">
        <Button onClick={() => handleSave("draft")} disabled={saving} variant="outline" size="sm" className="gap-1">
          <Save className="w-3.5 h-3.5" />{isAr ? "حفظ مسودة" : "Save Draft"}
        </Button>
        <Button onClick={() => handleSave("pending_approval")} disabled={saving} size="sm" className="gap-1 bg-amber-600 hover:bg-amber-700 text-white">
          <Clock className="w-3.5 h-3.5" />{isAr ? "إرسال للموافقة" : "Submit for Approval"}
        </Button>
        {isAdmin && (
          <>
            <Button onClick={() => handleSave("approved")} disabled={saving} size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="w-3.5 h-3.5" />{isAr ? "موافقة واعتماد" : "Approve"}
            </Button>
            <Button onClick={() => handleSave("needs_revision")} disabled={saving} variant="outline" size="sm" className="gap-1 border-red-300 text-red-600 hover:bg-red-50">
              <AlertCircle className="w-3.5 h-3.5" />{isAr ? "يحتاج مراجعة" : "Needs Revision"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ImageUploadArea({ label, images, uploading, onUpload, onRemove }) {
  return (
    <div className="border border-dashed border-slate-300 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
          <Image className="w-3.5 h-3.5" />{label}
        </span>
        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && onUpload(e.target.files[0])} />
          <Button size="sm" variant="outline" className="h-6 text-xs gap-1 pointer-events-none">
            <Upload className="w-3 h-3" />{uploading ? "..." : "Add"}
          </Button>
        </label>
      </div>
      {images.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-2">No photos yet</p>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {images.map((url, i) => (
          <div key={i} className="relative group aspect-square">
            <img src={url} alt="" className="w-full h-full object-cover rounded" />
            <button
              onClick={() => onRemove(url)}
              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}