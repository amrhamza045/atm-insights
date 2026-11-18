// All sections from the Kitchen & Bar Operations Manual Template
// Each section has a key, number, EN title, AR title, type, and sortOrder

export const MANUAL_SECTIONS = [
  // Section 1
  { key: "1_business_profile", number: "1", title_en: "Business and Operating Profile", title_ar: "الملف التشغيلي للمنشأة", type: "general", group: "1. Business & Operating Profile", sort: 1 },

  // Section 2
  { key: "2_org_kitchen", number: "2", title_en: "Organization, Roles & Shift Structure", title_ar: "الهيكل التنظيمي والأدوار والمناوبات", type: "table", group: "2. Organization & Roles", sort: 2 },

  // Section 3
  { key: "3_sop_template", number: "3", title_en: "SOP Master Template", title_ar: "نموذج إجراءات التشغيل الموحدة", type: "sop", group: "3. SOP Library", sort: 3 },

  // Section 4 – Kitchen
  { key: "4_1_kitchen_layout", number: "4.1", title_en: "Kitchen Layout and Process Flow", title_ar: "مخطط المطبخ وتدفق العمليات", type: "checklist", group: "4. Kitchen Operations", sort: 10 },
  { key: "4_2_suppliers", number: "4.2", title_en: "Approved Supplier & Receiving Standards", title_ar: "معايير الموردين المعتمدين والاستلام", type: "table", group: "4. Kitchen Operations", sort: 11 },
  { key: "4_3_storage", number: "4.3", title_en: "Storage Standards", title_ar: "معايير التخزين", type: "table", group: "4. Kitchen Operations", sort: 12 },
  { key: "4_4_hygiene", number: "4.4a", title_en: "Personal Hygiene & Handwashing", title_ar: "النظافة الشخصية وغسيل اليدين", type: "table", group: "4. Kitchen Operations", sort: 13 },
  { key: "4_4_thawing", number: "4.4b", title_en: "Thawing Controls", title_ar: "ضوابط الإذابة", type: "table", group: "4. Kitchen Operations", sort: 14 },
  { key: "4_4_washing", number: "4.4c", title_en: "Washing & Sanitizing Produce", title_ar: "غسل وتعقيم المنتجات", type: "table", group: "4. Kitchen Operations", sort: 15 },
  { key: "4_4_protein", number: "4.4d", title_en: "Raw Protein Handling", title_ar: "التعامل مع البروتين الخام", type: "table", group: "4. Kitchen Operations", sort: 16 },
  { key: "4_4_crosscontam", number: "4.4e", title_en: "Cross-Contamination Prevention", title_ar: "منع التلوث المتبادل", type: "table", group: "4. Kitchen Operations", sort: 17 },
  { key: "4_4_batch", number: "4.4f", title_en: "Batch Preparation", title_ar: "التحضير الجماعي", type: "table", group: "4. Kitchen Operations", sort: 18 },
  { key: "4_4_cooking", number: "4.4g", title_en: "Cooking and Reheating", title_ar: "الطهي وإعادة التسخين", type: "table", group: "4. Kitchen Operations", sort: 19 },
  { key: "4_4_cooling", number: "4.4h", title_en: "Cooling", title_ar: "التبريد", type: "table", group: "4. Kitchen Operations", sort: 20 },
  { key: "4_4_holding", number: "4.4i", title_en: "Hot and Cold Holding", title_ar: "الحفظ الساخن والبارد", type: "table", group: "4. Kitchen Operations", sort: 21 },
  { key: "4_4_allergen", number: "4.4j", title_en: "Allergen Order Handling", title_ar: "التعامل مع طلبات مسببات الحساسية", type: "table", group: "4. Kitchen Operations", sort: 22 },
  { key: "4_4_tasting", number: "4.4k", title_en: "Food Tasting", title_ar: "تذوق الطعام", type: "table", group: "4. Kitchen Operations", sort: 23 },
  { key: "4_4_pass", number: "4.4l", title_en: "Pass and Dispatch Control", title_ar: "التحكم في تسليم وإرسال الطلبات", type: "table", group: "4. Kitchen Operations", sort: 24 },
  { key: "4_6_opening", number: "4.6", title_en: "Kitchen Opening Checklist", title_ar: "قائمة فتح المطبخ", type: "checklist", group: "4. Kitchen Operations", sort: 26 },
  { key: "4_7_shift", number: "4.7", title_en: "Kitchen Shift Control Checklist", title_ar: "قائمة متابعة مناوبة المطبخ", type: "checklist", group: "4. Kitchen Operations", sort: 27 },
  { key: "4_8_closing", number: "4.8", title_en: "Kitchen Closing Checklist", title_ar: "قائمة إغلاق المطبخ", type: "checklist", group: "4. Kitchen Operations", sort: 28 },
  { key: "4_9_temp_log", number: "4.9", title_en: "Temperature Log", title_ar: "سجل درجات الحرارة", type: "log", group: "4. Kitchen Operations", sort: 29 },

  // Section 5 – Bar
  { key: "5_1_bar_layout", number: "5.1", title_en: "Bar Layout and Workstation Standards", title_ar: "مخطط البار ومعايير محطات العمل", type: "checklist", group: "5. Bar Operations", sort: 30 },
  { key: "5_2_bev_storage", number: "5.2", title_en: "Beverage Receiving and Storage", title_ar: "استلام وتخزين المشروبات", type: "table", group: "5. Bar Operations", sort: 31 },
  { key: "5_4_bar_opening", number: "5.4a", title_en: "Bar Opening & Station Setup", title_ar: "فتح البار وإعداد المحطة", type: "table", group: "5. Bar Operations", sort: 33 },
  { key: "5_4_ice", number: "5.4b", title_en: "Ice Handling", title_ar: "التعامل مع الثلج", type: "table", group: "5. Bar Operations", sort: 34 },
  { key: "5_4_glass", number: "5.4c", title_en: "Glassware Inspection & Polishing", title_ar: "فحص وتلميع الأواني الزجاجية", type: "table", group: "5. Bar Operations", sort: 35 },
  { key: "5_4_garnish", number: "5.4d", title_en: "Garnish Preparation & Dating", title_ar: "تحضير وتأريخ الزينة", type: "table", group: "5. Bar Operations", sort: 36 },
  { key: "5_4_order", number: "5.4e", title_en: "Order Taking & POS Entry", title_ar: "أخذ الطلبات وإدخال نقطة البيع", type: "table", group: "5. Bar Operations", sort: 37 },
  { key: "5_4_bev_prep", number: "5.4f", title_en: "Beverage Preparation", title_ar: "تحضير المشروبات", type: "table", group: "5. Bar Operations", sort: 38 },
  { key: "5_4_guest_svc", number: "5.4g", title_en: "Guest Presentation & Service", title_ar: "تقديم وخدمة الضيف", type: "table", group: "5. Bar Operations", sort: 39 },
  { key: "5_4_cash", number: "5.4h", title_en: "Cash & Payment Handling", title_ar: "التعامل مع النقد والمدفوعات", type: "table", group: "5. Bar Operations", sort: 40 },
  { key: "5_4_bottle", number: "5.4i", title_en: "Bottle Control & Stock Movement", title_ar: "التحكم في الزجاجات وحركة المخزون", type: "table", group: "5. Bar Operations", sort: 41 },
  { key: "5_4_breakage", number: "5.4j", title_en: "Breakage & Spillage Recording", title_ar: "تسجيل الكسر والسكب", type: "table", group: "5. Bar Operations", sort: 42 },
  { key: "5_4_last_order", number: "5.4k", title_en: "Last Order and Closing", title_ar: "آخر طلب والإغلاق", type: "table", group: "5. Bar Operations", sort: 43 },
  { key: "5_5_bar_opening_cl", number: "5.5", title_en: "Bar Opening Checklist", title_ar: "قائمة فتح البار", type: "checklist", group: "5. Bar Operations", sort: 44 },
  { key: "5_6_bar_closing", number: "5.6", title_en: "Bar Closing Checklist", title_ar: "قائمة إغلاق البار", type: "checklist", group: "5. Bar Operations", sort: 45 },

  // Section 6 – Food Safety
  { key: "6_1_cleaning", number: "6.1", title_en: "Cleaning & Sanitation Schedule", title_ar: "جدول التنظيف والتعقيم", type: "table", group: "6. Food Safety & Maintenance", sort: 50 },
  { key: "6_2_equipment", number: "6.2", title_en: "Equipment Register & Preventive Maintenance", title_ar: "سجل المعدات والصيانة الوقائية", type: "table", group: "6. Food Safety & Maintenance", sort: 51 },
  { key: "6_3_pest", number: "6.3", title_en: "Pest Control", title_ar: "مكافحة الآفات", type: "table", group: "6. Food Safety & Maintenance", sort: 52 },
  { key: "6_4_incident", number: "6.4", title_en: "Incident & Non-Conformance Report", title_ar: "تقرير الحوادث وعدم المطابقة", type: "general", group: "6. Food Safety & Maintenance", sort: 53 },

  // Section 7 – Inventory
  { key: "7_1_stock", number: "7.1", title_en: "Stock Count Sheet", title_ar: "ورقة جرد المخزون", type: "log", group: "7. Inventory, Cost & Waste", sort: 60 },
  { key: "7_2_waste", number: "7.2", title_en: "Waste / Spoilage / Spillage Log", title_ar: "سجل الهدر والتلف والسكب", type: "log", group: "7. Inventory, Cost & Waste", sort: 61 },
  { key: "7_3_breakage", number: "7.3", title_en: "Breakage Log", title_ar: "سجل الكسر", type: "log", group: "7. Inventory, Cost & Waste", sort: 62 },
  { key: "7_4_cost_review", number: "7.4", title_en: "Daily Cost & Control Review", title_ar: "مراجعة التكلفة اليومية والرقابة", type: "table", group: "7. Inventory, Cost & Waste", sort: 63 },

  // Section 8 – Quality
  { key: "8_1_quality", number: "8.1", title_en: "Quality Standards", title_ar: "معايير الجودة", type: "table", group: "8. Service Quality & Handover", sort: 70 },
  { key: "8_2_complaint", number: "8.2", title_en: "Guest Complaint Record", title_ar: "سجل شكاوى الضيوف", type: "general", group: "8. Service Quality & Handover", sort: 71 },
  { key: "8_3_handover", number: "8.3", title_en: "Shift Handover Log", title_ar: "سجل تسليم المناوبة", type: "log", group: "8. Service Quality & Handover", sort: 72 },

  // Section 9 – Training
  { key: "9_1_training_matrix", number: "9.1", title_en: "Training Matrix", title_ar: "مصفوفة التدريب", type: "table", group: "9. Training & Competency", sort: 80 },
  { key: "9_2_assessment", number: "9.2", title_en: "Practical Assessment", title_ar: "التقييم العملي", type: "general", group: "9. Training & Competency", sort: 81 },

  // Section 10 – Emergency
  { key: "10_fire", number: "10a", title_en: "Fire / Evacuation Procedure", title_ar: "إجراء الحريق والإخلاء", type: "table", group: "10. Emergency Procedures", sort: 90 },
  { key: "10_power", number: "10b", title_en: "Power Failure Procedure", title_ar: "إجراء انقطاع الكهرباء", type: "table", group: "10. Emergency Procedures", sort: 91 },
  { key: "10_water", number: "10c", title_en: "Water Interruption Procedure", title_ar: "إجراء انقطاع المياه", type: "table", group: "10. Emergency Procedures", sort: 92 },
  { key: "10_gas", number: "10d", title_en: "Gas Leak Procedure", title_ar: "إجراء تسرب الغاز", type: "table", group: "10. Emergency Procedures", sort: 93 },
  { key: "10_refrigeration", number: "10e", title_en: "Refrigeration Failure Procedure", title_ar: "إجراء عطل التبريد", type: "table", group: "10. Emergency Procedures", sort: 94 },
  { key: "10_equipment", number: "10f", title_en: "Equipment Breakdown Procedure", title_ar: "إجراء عطل المعدات", type: "table", group: "10. Emergency Procedures", sort: 95 },
  { key: "10_food_contam", number: "10g", title_en: "Food Contamination Procedure", title_ar: "إجراء تلوث الغذاء", type: "table", group: "10. Emergency Procedures", sort: 96 },
  { key: "10_injury", number: "10h", title_en: "Employee Injury Procedure", title_ar: "إجراء إصابة الموظف", type: "table", group: "10. Emergency Procedures", sort: 97 },
  { key: "10_security", number: "10i", title_en: "Security Incident Procedure", title_ar: "إجراء الحادث الأمني", type: "table", group: "10. Emergency Procedures", sort: 98 },
  { key: "10_pos_outage", number: "10j", title_en: "POS / System Outage Procedure", title_ar: "إجراء تعطل نظام نقطة البيع", type: "table", group: "10. Emergency Procedures", sort: 99 },
  { key: "10_recall", number: "10k", title_en: "Product Recall Procedure", title_ar: "إجراء استدعاء المنتج", type: "table", group: "10. Emergency Procedures", sort: 100 },
  { key: "10_staffing", number: "10l", title_en: "Severe Staffing Shortage Procedure", title_ar: "إجراء النقص الحاد في الموظفين", type: "table", group: "10. Emergency Procedures", sort: 101 },

  // Section 11
  { key: "11_completion", number: "11", title_en: "Manual Completion & Approval Checklist", title_ar: "قائمة اكتمال الدليل والموافقة", type: "checklist", group: "11. Approval Checklist", sort: 110 },

  // Section 12 — New Item Onboarding Process
  { key: "12_new_item_onboarding", number: "12", title_en: "New Item Addition Process (Manual → POS → Website)", title_ar: "عملية إضافة صنف جديد (الدليل ← نقطة البيع ← الموقع)", type: "onboarding", group: "12. New Item Onboarding", sort: 120 },
];

// Food & Beverage recipe sections are generated dynamically from menu items
// They use section_key = "recipe_food_{menu_item_id}" or "recipe_bev_{menu_item_id}"