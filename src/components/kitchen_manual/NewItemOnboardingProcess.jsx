import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, FileText, ExternalLink, Lock, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const STEPS = [
  {
    num: 1,
    title_en: "Create Draft Recipe Card in Manual",
    title_ar: "إنشاء بطاقة وصفة مبدئية في الدليل",
    desc_en: "Before a new item can appear in POS or Website, a KitchenManual recipe card must be created with: recipe ingredients, preparation steps, portion size, cost breakdown, and pricing (dine-in + delivery).",
    desc_ar: "قبل أن يظهر الصنف الجديد في نقطة البيع أو الموقع، يجب إنشاء بطاقة وصفة في الدليل تتضمن: المكونات، خطوات التحضير، حجم البورشن، تحليل التكلفة، والتسعير (مطعم + توصيل).",
    link: null,
  },
  {
    num: 2,
    title_en: "Upload Dine-In & Delivery Photos",
    title_ar: "رفع صور العرض (مطعم وتوصيل)",
    desc_en: "Upload presentation photos for dine-in plating and delivery packaging. Both are required for 100% completion.",
    desc_ar: "ارفع صور التقديم للمطعب والتغليف للتوصيل. كلاهما مطلوب لتحقيق اكتمال 100%.",
    link: null,
  },
  {
    num: 3,
    title_en: "Submit for Approval",
    title_ar: "إرسال للموافقة",
    desc_en: "Submit the recipe card for admin review. Status changes from Draft → Pending Approval.",
    desc_ar: "أرسل بطاقة الوصفة للمراجعة الإدارية. تتغير الحالة من مسودة إلى بانتظار الموافقة.",
    link: null,
  },
  {
    num: 4,
    title_en: "Admin Review & Approval",
    title_ar: "المراجعة والاعتماد الإداري",
    desc_en: "Admin reviews the card. If approved → status = Approved (100% complete). If rejected → Needs Revision with notes.",
    desc_ar: "يراجع المدير البطاقة. عند الموافقة → الحالة = معتمد (اكتمال 100%). عند الرفض → تحتاج مراجعة مع ملاحظات.",
    link: null,
  },
  {
    num: 5,
    title_en: "Create MenuItem in POS",
    title_ar: "إنشاء الصنف في نقطة البيع",
    desc_en: "Only after the recipe card is 100% approved can the MenuItem be created and made visible in POS. The manual_entry_id links them.",
    desc_ar: "فقط بعد اعتماد بطاقة الوصفة 100% يمكن إنشاء الصنف وجعله مرئيًا في نقطة البيع. يربطهما حقل manual_entry_id.",
    link: "MenuManagement",
    linkLabel: "Go to Menu Management",
  },
  {
    num: 6,
    title_en: "Enable on Website",
    title_ar: "تفعيل على الموقع",
    desc_en: "Set visible_website=true on the MenuItem only after POS visibility is confirmed. The website menu will display the item with its approved photo and description.",
    desc_ar: "فعّل visible_website=true على الصنف فقط بعد تأكيد ظهوره في نقطة البيع. سيعرض الموقع الصنف بصورته ووصفه المعتمد.",
    link: "MenuManagement",
    linkLabel: "Go to Menu Management",
  },
];

export default function NewItemOnboardingProcess({ lang = "en" }) {
  const [open, setOpen] = useState(true);
  const isAr = lang === "ar";

  return (
    <div className="border border-blue-200 rounded-lg overflow-hidden bg-blue-50/30">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 hover:bg-blue-50 transition-colors text-left"
      >
        {open ? <ChevronDown className="w-5 h-5 text-blue-500" /> : <ChevronRight className="w-5 h-5 text-blue-500" />}
        <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-slate-800">
            {isAr ? "عملية إضافة صنف جديد للدليل" : "New Item Addition Process — Manual → POS → Website"}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAr
              ? "لا يمكن إضافة صنف جديد لنقطة البيع أو الموقع دون اكتمال 100% من بطاقة الوصفة"
              : "A new item cannot be added to POS or Website without 100% completion of its recipe card"}
          </p>
        </div>
        <Lock className="w-4 h-4 text-blue-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="border-t border-blue-100 p-4 space-y-3">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                  {step.num}
                </div>
                {i < STEPS.length - 1 && <div className="w-0.5 h-full bg-blue-200 flex-1 mt-1" />}
              </div>
              <div className="pb-3 flex-1">
                <h4 className="text-sm font-semibold text-slate-800">
                  {isAr ? step.title_ar : step.title_en}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  {isAr ? step.desc_ar : step.desc_en}
                </p>
                {step.link && (
                  <Link to={step.link === "MenuManagement" ? createPageUrl("MenuManagement") : `/${step.link}`} className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
                    <ExternalLink className="w-3 h-3" />
                    {isAr ? "اذهب إلى" : step.linkLabel}
                  </Link>
                )}
              </div>
            </div>
          ))}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800">
                {isAr ? "قيد الإنفاذ" : "Enforcement"}
              </span>
            </div>
            <p className="text-xs text-amber-700">
              {isAr
                ? "كل صنف في نقطة البيع والموقع مرتبط ببطاقة وصفة في الدليل عبر manual_entry_id. الصنف الذي بطاقته غير معتمدة (أو غير موجودة) يظهر بعلامة 🔒 ولا يمكن تفعيله للعملاء حتى يكتمل 100%."
                : "Every item in POS and Website is linked to a manual recipe card via manual_entry_id. An item whose card is not approved (or missing) shows a 🔒 lock icon and cannot be activated for customers until 100% complete."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}