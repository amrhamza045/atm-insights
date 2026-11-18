import React, { useState } from "react";
import { brandName } from "@/lib/brandName";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Printer, FileText, UtensilsCrossed, Truck, Package, PoundSterling,
  Users, Gift, BarChart3, Megaphone, Settings, ShoppingCart,
  ChefHat, CreditCard, MapPin, Bell, Globe, Shield, Smartphone,
  TrendingUp, ClipboardList, Wallet, Award, Zap
} from "lucide-react";

const FEATURES = [
  {
    category: { en: "POS & Order Management", ar: "نقطة البيع وإدارة الطلبات" },
    icon: ShoppingCart,
    color: "blue",
    features: [
      { en: "Full-featured POS with live menu integration and real-time pricing", ar: "نقطة بيع متكاملة مع تكامل مباشر للقائمة والأسعار الفورية" },
      { en: "Split payments: Cash, Visa, InstaPay, Wallet, and combinations", ar: "مدفوعات مقسمة: نقدي، فيزا، إنستاباي، محفظة، ومجموعات" },
      { en: "Dine-in table management with real-time status tracking", ar: "إدارة طاولات الصالة مع تتبع الحالة الفورية" },
      { en: "Built-in Kitchen Display System (KDS) with audio alerts", ar: "نظام عرض المطبخ (KDS) مدمج مع تنبيهات صوتية" },
      { en: "Silent thermal receipt printing via PrintNode integration", ar: "طباعة الإيصالات الحرارية الصامتة عبر تكامل PrintNode" },
      { en: "Website order panel for online ordering", ar: "لوحة طلبات الموقع الإلكتروني للطلب أونلاين" },
      { en: "Order history with full audit trail and change logs", ar: "سجل الطلبات مع مسار تدقيق كامل وسجلات التغييرات" },
    ],
  },
  {
    category: { en: "Menu Engineering & Management", ar: "هندسة وإدارة القائمة" },
    icon: ChefHat,
    color: "orange",
    features: [
      { en: "Menu item management with categories, sections, and sort ordering", ar: "إدارة أصناف القائمة مع الفئات والأقسام والترتيب" },
      { en: "Recipe management linked to inventory for real-time cost tracking", ar: "إدارة الوصفات مرتبطة بالمخزون لتتبع التكلفة الفورية" },
      { en: "Per-size pricing (Small/Medium/Large) with individual recipes", ar: "تسعير حسب الحجم (صغير/متوسط/كبير) مع وصفات فردية" },
      { en: "Automatic food cost calculation and margin analysis", ar: "حساب تكلفة الطعام تلقائياً وتحليل الهامش" },
      { en: "Menu profitability analysis with star/dog/plowhorse/puzzle classification", ar: "تحليل ربحية القائمة بتصنيف نجمة/كلب/حصان الحراثة/اللغز" },
      { en: "AI-powered menu insights and recommendations", ar: "رؤى وتوصيات القائمة المدعومة بالذكاء الاصطناعي" },
      { en: "Tax-exempt and service-exempt flags per item and category", ar: "أعلام الإعفاء من الضريبة والخدمة لكل صنف وفئة" },
      { en: "Visibility control: website vs. POS per item and category", ar: "التحكم في الظهور: الموقع مقابل نقطة البيع لكل صنف وفئة" },
    ],
  },
  {
    category: { en: "Delivery Management Portal", ar: "بوابة إدارة التوصيل" },
    icon: Truck,
    color: "green",
    features: [
      { en: "Real-time delivery portal with live order tracking and WebSocket sync", ar: "بوابة توصيل فورية مع تتبع الطلبات المباشر ومزامنة WebSocket" },
      { en: "Delivery person assignment and self-assignment workflow", ar: "تعيين موصل التوصيل وسير عمل التعيين الذاتي" },
      { en: "Third-party delivery company integration and management", ar: "تكامل وإدارة شركات التوصيل الخارجية" },
      { en: "Delivery zones with fee configuration", ar: "مناطق التوصيل مع إعداد الرسوم" },
      { en: "Delivery bonus milestone system (one-time & recurring tiers)", ar: "نظام مكافآت التوصيل المرحلي (طبقات لمرة واحدة ومتكررة)" },
      { en: "Per-partner performance analytics with bottleneck detection", ar: "تحليلات أداء لكل موصل مع كشف الاختناقات" },
      { en: "In-app delivery chat (per-order and general)", ar: "محادثة توصيل داخل التطبيق (لكل طلب وعامة)" },
      { en: "Delivery driver dashboard with personal stats and earnings", ar: "لوحة تحكم السائق مع إحصائيات وأرباح شخصية" },
    ],
  },
  {
    category: { en: "Inventory & Supply Chain", ar: "المخزون وسلسلة الإمداد" },
    icon: Package,
    color: "purple",
    features: [
      { en: "Full inventory item management with units and categories", ar: "إدارة كاملة لعناصر المخزون مع الوحدات والفئات" },
      { en: "Supplier management with reliability scoring and reviews", ar: "إدارة الموردين مع تقييم الموثوقية والمراجعات" },
      { en: "Purchase orders and purchase invoice management", ar: "أوامر الشراء وإدارة فواتير الشراء" },
      { en: "Automated low-stock alerts via SMS and email", ar: "تنبيهات نقص المخزون التلقائية عبر الرسائل والبريد" },
      { en: "Stock review freeze (full or partial by category)", ar: "تجميد مراجعة المخزون (كامل أو جزئي حسب الفئة)" },
      { en: "Waste declaration tracking with admin approval", ar: "تتبع إقرارات الهدر مع موافقة المسؤول" },
      { en: "Average purchase price tracking and supplier price advisory", ar: "تتبع متوسط أسعار الشراء واستشارة أسعار الموردين" },
      { en: "Bulk CSV import/export for inventory data", ar: "استيراد/تصدير مجمّع لبيانات المخزون" },
    ],
  },
  {
    category: { en: "Cashier Management", ar: "إدارة الكاشير" },
    icon: CreditCard,
    color: "indigo",
    features: [
      { en: "Cashier session management (open/close) with reconciliation", ar: "إدارة جلسات الكاشير (فتح/إغلاق) مع التسوية" },
      { en: "Session closing reports with breakdown by payment method", ar: "تقارير إغلاق الجلسة مع تفصيل حسب طريقة الدفع" },
      { en: "Cashier audit log with full transaction history", ar: "سجل تدقيق الكاشير مع تاريخ المعاملات الكامل" },
      { en: "Grouped order view and pending approvals", ar: "عرض الطلبات المجمعة والموافقات المعلقة" },
      { en: "Session debugging and reconciliation tools", ar: "أدوات تصحيح الأخطاء والتسوية للجلسات" },
    ],
  },
  {
    category: { en: `Loyalty & Cashback Program (${brandName()} GenMo)`, ar: `برنامج الولاء والاسترداد (${brandName()} جينمو)` },
    icon: Gift,
    color: "amber",
    features: [
      { en: "Multi-level referral system (3 levels deep) with automatic cashback distribution", ar: "نظام إحالة متعدد المستويات (3 مستويات) مع توزيع الاسترداد التلقائي" },
      { en: "Welcome cashback on registration with tiered benefits", ar: "استرداد ترحيبي عند التسجيل مع مزايا متدرجة" },
      { en: "Loyalty tier progression with automatic upgrades", ar: "تدرج طبقات الولاء مع الترقية التلقائية" },
      { en: "Payout management with daily/weekly/monthly withdrawal limits", ar: "إدارة المدفوعات مع حدود السحب اليومية/الأسبوعية/الشهرية" },
      { en: "Prepaid recharge wallet system", ar: "نظام محفظة الشحن المدفوع مسبقاً" },
      { en: "Rewards catalog with category filtering and redemption workflow", ar: "كتالوج المكافآت مع تصفية الفئات وسير عمل الاستبدال" },
      { en: "Cashback rule management with version history", ar: "إدارة قواعد الاسترداد مع تاريخ الإصدارات" },
    ],
  },
  {
    category: { en: "HR, Attendance & Payroll", ar: "الموارد البشرية والحضور والرواتب" },
    icon: Users,
    color: "teal",
    features: [
      { en: "Employee management with roles, shifts, and salary configuration", ar: "إدارة الموظفين مع الأدوار والورديات وإعداد الرواتب" },
      { en: "Photo + GPS location verification at sign-in/sign-out", ar: "التحقق بالصورة + موقع GPS عند تسجيل الدخول/الخروج" },
      { en: "Face scan verification for attendance authentication", ar: "التحقق بمسح الوجه لمصادقة الحضور" },
      { en: "Configurable attendance policy (late/early-leave tiers, overtime)", ar: "سياسة حضور قابلة للتكوين (طبقات التأخير/المغادرة المبكرة، الإضافي)" },
      { en: "Automated payroll calculation from attendance + penalties + borrowings", ar: "حساب الرواتب التلقائي من الحضور + العقوبات + السلف" },
      { en: "Salary penalties and employee borrowing installments", ar: "عقوبات الراتب وأقساط سلف الموظفين" },
      { en: "Payslip distribution via email to all employees", ar: "توزيع كشوف الرواتب عبر البريد الإلكتروني لجميع الموظفين" },
      { en: "Shift presets and schedule management", ar: "قوالب الورديات وإدارة الجدولة" },
    ],
  },
  {
    category: { en: "Financial Management & Accounting", ar: "الإدارة المالية والمحاسبة" },
    icon: PoundSterling,
    color: "emerald",
    features: [
      { en: "Daily financial summaries with automated generation", ar: "ملخصات مالية يومية مع توليد تلقائي" },
      { en: "General Ledger accounts and journal entries", ar: "حسابات الأستاذ العام وقيد اليومية" },
      { en: "Expense tracking and deposit management", ar: "تتبع المصروفات وإدارة الودائع" },
      { en: "Supplier payment management and tracking", ar: "إدارة وتتبع مدفوعات الموردين" },
      { en: "Financial dashboard with multi-dimensional reporting", ar: "لوحة مالية متعددة الأبعاد مع تقارير" },
      { en: "Direct vs. delivery company financials breakdown", ar: "تفصيل الماليات المباشرة مقابل شركات التوصيل" },
      { en: "Payment file generation for bank transfers", ar: "توليد ملفات الدفع للتحويلات البنكية" },
    ],
  },
  {
    category: { en: "Analytics & Business Intelligence", ar: "التحليلات وذكاء الأعمال" },
    icon: BarChart3,
    color: "cyan",
    features: [
      { en: "Sales analytics with item-level breakdown and trends", ar: "تحليلات المبيعات مع تفصيل على مستوى الصنف والاتجاهات" },
      { en: "Traffic analytics with visitor breakdown by device and source", ar: "تحليلات الزوار مع تفصيل حسب الجهاز والمصدر" },
      { en: "Menu profitability analysis and food cost dashboards", ar: "تحليل ربحية القائمة ولوحات تكلفة الطعام" },
      { en: "Supplier reliability and price advisory dashboards", ar: "لوحات موثوقية الموردين واستشارة الأسعار" },
      { en: "Discount audit reports", ar: "تقارير تدقيق الخصومات" },
      { en: "Cashback monthly reports and distribution tracking", ar: "تقارير الاسترداد الشهرية وتتبع التوزيع" },
      { en: "Recommendation analytics and conversion tracking", ar: "تحليلات التوصيات وتتبع التحويل" },
      { en: "Full audit log with admin action tracking", ar: "سجل تدقيق كامل مع تتبع إجراءات المسؤول" },
    ],
  },
  {
    category: { en: "Marketing & Customer Engagement", ar: "التسويق وتفاعل العملاء" },
    icon: Megaphone,
    color: "pink",
    features: [
      { en: "Marketing campaign management with recipient targeting", ar: "إدارة حملات التسويق مع استهداف المستلمين" },
      { en: "WhatsApp integration for order notifications and lead capture", ar: "تكامل واتساب لإشعارات الطلبات والتقاط العملاء المحتملين" },
      { en: "SMS notifications for low stock and critical alerts", ar: "إشعارات SMS لنقص المخزون والتنبيهات الحرجة" },
      { en: "Email notification system with customizable templates", ar: "نظام إشعارات البريد مع قوالب قابلة للتخصيص" },
      { en: "Lead management from WhatsApp, Instagram, Facebook, TikTok", ar: "إدارة العملاء المحتملين من واتساب، إنستغرام، فيسبوك، تيك توك" },
      { en: "Customer review moderation and management", ar: "إدارة ومراجعة تقييمات العملاء" },
      { en: "Broadcast notifications to targeted user segments", ar: "إشعارات البث لشرائح مستخدمين مستهدفة" },
      { en: "AI recommendation engine for upselling at checkout", ar: "محرک توصيات الذكاء الاصطناعي للبيع الإضافي عند الدفع" },
    ],
  },
  {
    category: { en: "Customer Portal & App", ar: "بوابة العميل والتطبيق" },
    icon: Smartphone,
    color: "rose",
    features: [
      { en: "Customer profile with wallet, cashback, and payout balances", ar: "ملف العميل مع المحفظة والاسترداد وأرصدة المدفوعات" },
      { en: "Purchase submission with receipt upload and tracking", ar: "تقديم المشتريات مع رفع الإيصال والتتبع" },
      { en: "Interactive referral network tree visualization", ar: "عرض تفاعلي لشبكة الإحالات" },
      { en: "Address management with delivery zone mapping", ar: "إدارة العناوين مع ربط مناطق التوصيل" },
      { en: "Rewards catalog browsing and redemption", ar: "تصفح كتالوج المكافآت والاستبدال" },
      { en: "Loyalty tier display with progress tracking", ar: "عرض طبقة الولاء مع تتبع التقدم" },
      { en: "Guided onboarding flow for new members", ar: "تدفق إعداد موجّه للأعضاء الجدد" },
      { en: "In-app support chatbot (WhatsApp & Telegram channels)", ar: "روبوت دعم داخل التطبيق (قنوات واتساب وتيليجرام)" },
    ],
  },
  {
    category: { en: "System, Security & Configuration", ar: "النظام والأمان والإعدادات" },
    icon: Settings,
    color: "slate",
    features: [
      { en: "Granular role-based permissions (8+ roles, 50+ permission flags)", ar: "أذونات قائمة على الأدوار (8+ أدوار، 50+ علم إذن)" },
      { en: "Multi-language support (Arabic RTL & English LTR)", ar: "دعم متعدد اللغات (عربي يمين-ل-يسار وإنجليزي يسار-ل-يمين)" },
      { en: "User invitation and management system", ar: "نظام دعوة وإدارة المستخدمين" },
      { en: "Configurable system settings (tax, service, limits, fees)", ar: "إعدادات نظام قابلة للتكوين (ضريبة، خدمة، حدود، رسوم)" },
      { en: "Restaurant info management (logo, address, contacts)", ar: "إدارة معلومات المطعم (شعار، عنوان، جهات اتصال)" },
      { en: "Multi-printer configuration (cashier, kitchen, bar)", ar: "تكوين متعدد للطابعات (كاشير، مطبخ، بار)" },
      { en: "Timezone-aware operations (Africa/Cairo)", ar: "عمليات مراعية للمنطقة الزمنية (أفريقيا/القاهرة)" },
      { en: "Mobile-responsive design (iOS/Android publishable)", ar: "تصميم متجاوب مع الجوال (قابل للنشر على iOS/Android)" },
    ],
  },
];

const KEY_BENEFITS = {
  en: [
    { icon: TrendingUp, title: "Increase Revenue", desc: "AI-powered upselling, loyalty programs, and referral systems drive repeat business and higher average order values." },
    { icon: Shield, title: "Full Control & Security", desc: "Granular permissions, audit logs, and role-based access ensure your data and operations stay protected." },
    { icon: Zap, title: "Operational Efficiency", desc: "Automated workflows for payroll, cashback distribution, low-stock alerts, and financial summaries reduce manual work." },
    { icon: Award, title: "Customer Loyalty", desc: "Multi-tier cashback, referral rewards, and loyalty programs keep customers coming back and referring friends." },
    { icon: Wallet, title: "Financial Clarity", desc: "Real-time financial dashboards, daily summaries, and complete accounting give you full visibility into your business." },
    { icon: Globe, title: "Bilingual & Mobile", desc: "Native Arabic (RTL) and English support with mobile-responsive design, publishable to iOS and Android." },
  ],
  ar: [
    { icon: TrendingUp, title: "زيادة الإيرادات", desc: "البيع الإضافي المدعوم بالذكاء الاصطناعي، برامج الولاء، وأنظمة الإحالة تدفع الأعمال المتكررة وقيم طلبات أعلى." },
    { icon: Shield, title: "تحكم وأمان كامل", desc: "أذونات دقيقة، سجلات تدقيق، ووصول قائم على الأدوار تضمن حماية بياناتك وعملياتك." },
    { icon: Zap, title: "كفاءة تشغيلية", desc: "سير عمل تلقائي للرواتب وتوزيع الاسترداد وتنبيهات نقص المخزون والملخصات المالية يقلل العمل اليدوي." },
    { icon: Award, title: "ولاء العملاء", desc: "استرداد متعدد الطبقات، مكافآت الإحالة، وبرامج الولاء تبقي العملاء يعودون ويحيلون الأصدقاء." },
    { icon: Wallet, title: "وضوح مالي", desc: "لوحات مالية فورية، ملخصات يومية، ومحاسبة كاملة تمنحك رؤية شاملة لعملك." },
    { icon: Globe, title: "ثنائي اللغة ومتنقل", desc: "دعم عربي أصلي (يمين-ل-يسار) وإنجليزي مع تصميم متجاوب، قابل للنشر على iOS و Android." },
  ],
};

const colorClasses = {
  blue: "bg-blue-50 text-blue-600 border-blue-200",
  orange: "bg-orange-50 text-orange-600 border-orange-200",
  green: "bg-green-50 text-green-600 border-green-200",
  purple: "bg-purple-50 text-purple-600 border-purple-200",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
  amber: "bg-amber-50 text-amber-600 border-amber-200",
  teal: "bg-teal-50 text-teal-600 border-teal-200",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
  cyan: "bg-cyan-50 text-cyan-600 border-cyan-200",
  pink: "bg-pink-50 text-pink-600 border-pink-200",
  rose: "bg-rose-50 text-rose-600 border-rose-200",
  slate: "bg-slate-50 text-slate-600 border-slate-200",
};

function generateWordDocument(lang) {
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const benefitsHtml = KEY_BENEFITS[lang].map(b =>
    `<div style="width:45%;margin:1%;padding:12px;border:1px solid #ccc;border-radius:8px;">
      <h3 style="margin:0 0 4px;font-size:14pt;">${b.title}</h3>
      <p style="margin:0;font-size:11pt;color:#555;">${b.desc}</p>
    </div>`
  ).join("");

  const featuresHtml = FEATURES.map(cat => {
    const IconSvg = "&#9632;";
    const feats = cat.features.map(f =>
      `<li style="margin-bottom:6px;font-size:11pt;">${isAr ? f.ar : f.en}</li>`
    ).join("");
    return `
      <div style="margin-bottom:20px;page-break-inside:avoid;">
        <h2 style="font-size:16pt;color:#0f172a;border-bottom:2px solid #f59e0b;padding-bottom:6px;">${isAr ? cat.category.ar : cat.category.en}</h2>
        <ul style="margin:8px 0 0;padding-${isAr ? "right" : "left"}:20px;">${feats}</ul>
      </div>`;
  }).join("");

  const html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Vera F&amp;B Ops - ${isAr ? "كتيب التسويق" : "Marketing Brochure"}</title>
<style>
  @page { size: A4; margin: 2cm; }
  body { font-family: ${isAr ? "'Arial', sans-serif" : "'Calibri', sans-serif"}; direction: ${dir}; }
  h1 { font-size: 28pt; color: #f59e0b; }
  .subtitle { font-size: 14pt; color: #666; }
</style>
</head>
<body>
  <h1>Vera F&amp;B Ops</h1>
  <p class="subtitle">${isAr ? "نظام إدارة المطاعم المتكامل" : "Complete Restaurant Management System"}</p>
  <p class="subtitle">${isAr ? "كتيب المزايا والفوائد" : "Features & Benefits Brochure"}</p>
  <hr style="margin:20px 0;">
  <h2 style="font-size:20pt;">${isAr ? "الفوائد الرئيسية" : "Key Benefits"}</h2>
  <div style="display:flex;flex-wrap:wrap;">${benefitsHtml}</div>
  <hr style="margin:20px 0;">
  <h2 style="font-size:20pt;">${isAr ? "المزايا التفصيلية" : "Detailed Features"}</h2>
  ${featuresHtml}
</body>
</html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Marketing_Brochure_${lang.toUpperCase()}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AppMarketingBrochure() {
  const [lang, setLang] = useState("en");
  const isAr = lang === "ar";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50" dir={isAr ? "rtl" : "ltr"}>
      {/* Action Bar (hidden in print) */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-slate-900 text-sm sm:text-base">
            {isAr ? "كتيب التسويق - المزايا والفوائد" : "Marketing Brochure — Features & Benefits"}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Tabs value={lang} onValueChange={setLang}>
              <TabsList className="h-8">
                <TabsTrigger value="en" className="text-xs px-3">EN</TabsTrigger>
                <TabsTrigger value="ar" className="text-xs px-3">عربي</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? "طباعة / PDF" : "Print / PDF"}</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => generateWordDocument(lang)} className="gap-1.5">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{isAr ? "تصدير Word" : "Export Word"}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Printable Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 print:px-0 print:py-0" id="printable-area">
        {/* Header with Logo */}
         <div className="text-center mb-8 print:mb-6">
           <div className="flex justify-center mb-4">
             <img
               src="https://base44.com/logo_v2.svg"
               alt="Vera F&B Ops"
               className="h-16 w-auto object-contain"
             />
           </div>
           <h1 className="text-3xl sm:text-4xl font-bold text-amber-600 mb-1">Vera F&B Ops</h1>
           <p className="text-lg text-slate-600 font-medium">
             {isAr ? "نظام إدارة المطاعم المتكامل" : "Complete Restaurant Management System"}
           </p>
           <p className="text-sm text-slate-400 mt-1">
             {isAr ? "كتيب المزايا والفوائد للتسويق" : "Marketing Features & Benefits Brochure"}
           </p>
           <div className="mt-3 flex justify-center gap-4 text-xs text-slate-400 flex-wrap">
             <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> {isAr ? "ثنائي اللغة" : "Bilingual"}</span>
             <span className="flex items-center gap-1"><Smartphone className="w-3.5 h-3.5" /> {isAr ? "متجاوب مع الجوال" : "Mobile Ready"}</span>
             <span className="flex items-center gap-1"><Bell className="w-3.5 h-3.5" /> {isAr ? "إشعارات فورية" : "Real-time"}</span>
           </div>
         </div>

        {/* Key Benefits with Chart */}
         <div className="mb-10 print:mb-8 print:break-inside-avoid">
           <h2 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-amber-500 pb-2">
             {isAr ? "الفوائد الرئيسية" : "Key Benefits"}
           </h2>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
             <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
               {KEY_BENEFITS[lang].map((b, i) => {
                 const Icon = b.icon;
                 return (
                   <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 print:break-inside-avoid">
                     <div className="flex items-start gap-3">
                       <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                         <Icon className="w-5 h-5" />
                       </div>
                       <div>
                         <h3 className="font-semibold text-slate-900 text-sm mb-1">{b.title}</h3>
                         <p className="text-xs text-slate-500 leading-relaxed">{b.desc}</p>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
             <div className="bg-white rounded-xl border border-slate-200 p-4 print:break-inside-avoid">
               <h3 className="font-semibold text-slate-900 mb-3 text-sm">{isAr ? "تأثير الفوائد" : "Benefit Impact"}</h3>
               <ResponsiveContainer width="100%" height={200}>
                 <PieChart>
                   <Pie data={[
                     { name: isAr ? "إيرادات" : "Revenue", value: 30 },
                     { name: isAr ? "كفاءة" : "Efficiency", value: 25 },
                     { name: isAr ? "ولاء" : "Loyalty", value: 25 },
                     { name: isAr ? "أمان" : "Security", value: 20 }
                   ]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                     <Cell fill="#f59e0b" />
                     <Cell fill="#10b981" />
                     <Cell fill="#3b82f6" />
                     <Cell fill="#ef4444" />
                   </Pie>
                   <Tooltip formatter={(v) => `${v}%`} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           </div>
         </div>

        {/* Detailed Features with Charts */}
         <div className="mb-10 print:mb-8">
           <h2 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-amber-500 pb-2">
             {isAr ? "المزايا التفصيلية" : "Detailed Features"}
           </h2>
           <div className="space-y-6">
             {FEATURES.map((cat, idx) => {
               const Icon = cat.icon;
               const colorClass = colorClasses[cat.color] || colorClasses.slate;
               const chartData = [
                 { name: isAr ? "الميزات" : "Features", value: cat.features.length },
                 { name: isAr ? "التأثير" : "Impact", value: Math.min(10, cat.features.length) }
               ];
               return (
                 <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5 print:break-inside-avoid grid grid-cols-1 lg:grid-cols-3 gap-5">
                   <div className="lg:col-span-2">
                     <div className="flex items-center gap-3 mb-3">
                       <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                         <Icon className="w-5 h-5" />
                       </div>
                       <h3 className="font-bold text-slate-900 text-base">
                         {isAr ? cat.category.ar : cat.category.en}
                       </h3>
                     </div>
                     <ul className={`space-y-2 text-xs text-slate-600 ${isAr ? "pr-2" : "pl-2"}`}>
                       {cat.features.map((f, fi) => (
                         <li key={fi} className="flex items-start gap-2">
                           <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                           <span className="leading-relaxed">{isAr ? f.ar : f.en}</span>
                         </li>
                       ))}
                     </ul>
                   </div>
                   <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-3 flex items-center justify-center print:break-inside-avoid">
                     <ResponsiveContainer width="100%" height={200}>
                       <BarChart data={chartData}>
                         <CartesianGrid strokeDasharray="3 3" />
                         <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                         <YAxis tick={{ fontSize: 10 }} />
                         <Tooltip formatter={(v) => v} />
                         <Bar dataKey="value" fill={colorClasses[cat.color]?.split(" ")[1]?.replace("text-", "") === "blue-600" ? "#3b82f6" : colorClasses[cat.color]?.split(" ")[1]?.replace("text-", "") === "orange-600" ? "#f97316" : colorClasses[cat.color]?.split(" ")[1]?.replace("text-", "") === "green-600" ? "#10b981" : "#8b5cf6"} />
                       </BarChart>
                     </ResponsiveContainer>
                   </div>
                 </div>
               );
             })}
           </div>
         </div>

        {/* Summary Stats with Growth Chart */}
         <div className="mb-6 print:mb-8 print:break-inside-avoid">
           <h2 className="text-xl font-bold text-slate-900 mb-4 border-b-2 border-amber-500 pb-2">
             {isAr ? "إحصائيات النظام" : "System Overview"}
           </h2>
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white print:break-inside-avoid">
               <h3 className="text-lg font-bold mb-4 text-center">
                 {isAr ? "إحصائيات النظام" : "System at a Glance"}
               </h3>
               <div className="grid grid-cols-2 gap-4 text-center">
                 <div>
                   <p className="text-3xl font-bold">{FEATURES.length}</p>
                   <p className="text-xs opacity-90">{isAr ? "فئة ميزات" : "Feature Categories"}</p>
                 </div>
                 <div>
                   <p className="text-3xl font-bold">{FEATURES.reduce((s, c) => s + c.features.length, 0)}+</p>
                   <p className="text-xs opacity-90">{isAr ? "ميزة تفصيلية" : "Detailed Features"}</p>
                 </div>
                 <div>
                   <p className="text-3xl font-bold">8+</p>
                   <p className="text-xs opacity-90">{isAr ? "أدوار مستخدمين" : "User Roles"}</p>
                 </div>
                 <div>
                   <p className="text-3xl font-bold">2</p>
                   <p className="text-xs opacity-90">{isAr ? "لغة" : "Languages"}</p>
                 </div>
               </div>
             </div>
             <div className="bg-white rounded-2xl border border-slate-200 p-6 print:break-inside-avoid">
               <h3 className="text-sm font-semibold text-slate-900 mb-3">{isAr ? "نمو الإيرادات" : "Revenue Growth Projection"}</h3>
               <ResponsiveContainer width="100%" height={200}>
                 <LineChart data={[
                   { month: isAr ? "شهر 1" : "Month 1", revenue: 10 },
                   { month: isAr ? "شهر 2" : "Month 2", revenue: 18 },
                   { month: isAr ? "شهر 3" : "Month 3", revenue: 28 },
                   { month: isAr ? "شهر 4" : "Month 4", revenue: 40 },
                   { month: isAr ? "شهر 5" : "Month 5", revenue: 55 },
                   { month: isAr ? "شهر 6" : "Month 6", revenue: 75 }
                 ]}>
                   <CartesianGrid strokeDasharray="3 3" />
                   <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                   <YAxis tick={{ fontSize: 10 }} />
                   <Tooltip formatter={(v) => `${v}%`} />
                   <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
           </div>
         </div>

        {/* Footer with Full Info for PDF */}
         <div className="text-center text-xs text-slate-400 pt-6 border-t-2 border-amber-200 print:mt-8 print:pt-8 print:border-t-4">
           <div className="mb-6 pb-6 border-b border-slate-200">
             <p className="font-bold text-base text-amber-600 mb-2">Vera F&B Ops</p>
             <p className="font-medium text-slate-600">{isAr ? "نظام إدارة المطاعم المتكامل" : "Complete Restaurant Management System"}</p>
             <p className="mt-2 text-slate-500">{isAr ? "كتيب التسويق - جميع المزايا والفوائد" : "Marketing Brochure — All Features & Benefits"}</p>
             <p className="mt-2 text-slate-400">{isAr ? "آخر تحديث:" : "Last Updated:"} {new Date().toLocaleDateString(isAr ? "ar-EG" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
           </div>

           {/* Veragates HUB Information */}
           <div className="mb-6 pb-6 border-b border-slate-200 print:break-inside-avoid">
             <div className="flex justify-center mb-3">
               <img
                 src="https://media.base44.com/images/public/69709def3c5445d198d66244/3e672a413_img-a820cf20-b513-4b73-84b3-12b205524572.png"
                 alt="Veragates HUB"
                 className="h-12 w-auto object-contain"
               />
             </div>
             <p className="font-semibold text-slate-700 text-base">{isAr ? "يدعمه" : "Powered by"} Veragates HUB</p>
             <p className="mt-2 text-slate-600 font-medium">{isAr ? "تحويل أعمالك من خلال التكنولوجيا المتقدمة" : "Transform Your Business Through Advanced Technology"}</p>
             <p className="mt-2 text-slate-500 text-xs leading-relaxed">
               {isAr ? "Veragates HUB توفر حلول إدارة متكاملة للمطاعم والمشاريع الغذائية مع التركيز على الكفاءة والولاء والنمو المستدام." : "Veragates HUB provides integrated management solutions for restaurants and food businesses with focus on efficiency, loyalty, and sustainable growth."}
             </p>
           </div>

           {/* Contact Information */}
           <div className="pb-4 print:break-inside-avoid">
             <p className="font-semibold text-slate-700 mb-3">{isAr ? "تواصل معنا اليوم" : "Contact Us Today"}</p>
             <div className="space-y-2 text-slate-600">
               <div className="flex justify-center items-center gap-2 flex-wrap">
                 <span className="font-medium">📧</span>
                 <span>info@veragates.com</span>
               </div>
               <div className="flex justify-center items-center gap-2 flex-wrap">
                 <span className="font-medium">🌐</span>
                 <span>www.veragates.com</span>
               </div>
               <div className="flex justify-center items-center gap-2 flex-wrap">
                 <span className="font-medium">📱</span>
                 <span>+20 106 668 1368</span>
               </div>
             </div>
             <p className="mt-4 text-slate-500 text-xs">{isAr ? "نحن هنا لمساعدتك على تحقيق أهدافك التجارية" : "We're here to help you achieve your business goals"}</p>
           </div>

           {/* Footer Note */}
           <div className="text-slate-400 text-xs pt-4">
             <p>{isAr ? "© 2024 Veragates HUB. جميع الحقوق محفوظة." : "© 2024 Veragates HUB. All Rights Reserved."}</p>
           </div>
         </div>
      </div>
    </div>
  );
}