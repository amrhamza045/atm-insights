import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';
import { denyUnlessPermitted } from '../../shared/requirePermission.js';
import { loadBrandName } from '../../shared/brand.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, ['hr_view_all', 'hr_edit']);
    if (denied) return denied;
    const brand = await loadBrandName(base44);

    const body = await req.json();
    const { policy_id, employee_name, employee_id, month_label } = body;

    if (!policy_id) return Response.json({ error: 'policy_id is required' }, { status: 400 });

    const policy = await base44.asServiceRole.entities.AttendancePolicy.get(policy_id);
    if (!policy) return Response.json({ error: 'Policy not found' }, { status: 404 });

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB');
    const arDateStr = now.toLocaleDateString('ar-EG');
    const empName = employee_name || '__________________________';
    const empId = employee_id || '__________________________';
    const monthLabel = month_label || now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const arMonthLabel = now.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // ===== HELPERS =====
    const addHeader = (titleEn, titleAr) => {
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text(titleEn, margin, 12);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${brand} - Attendance Policy Summary`, margin, 18);
      doc.text(`Date: ${dateStr}`, margin, 23);
      // Arabic title (right-aligned, drawn as reversed chars since jsPDF lacks RTL shaping)
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const arTitleReversed = titleAr.split('').reverse().join('');
      doc.text(arTitleReversed, pageWidth - margin, 12, { align: 'right' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const arSubReversed = 'ملخص سياسة الحضور والانصراف'.split('').reverse().join('');
      doc.text(arSubReversed, pageWidth - margin, 18, { align: 'right' });
      const arDateReversed = `التاريخ: ${arDateStr}`.split('').reverse().join('');
      doc.text(arDateReversed, pageWidth - margin, 23, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    };

    const addFooter = (pageNum, totalPages) => {
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.setFont('helvetica', 'normal');
      doc.text(`${brand} | Attendance Policy Document`, margin, pageHeight - 12);
      doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
      doc.text(`Generated: ${now.toLocaleString('en-GB')}`, pageWidth - margin, pageHeight - 12, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    };

    let y = 0;

    const checkPageBreak = (needed = 20) => {
      if (y + needed > pageHeight - 25) {
        return true;
      }
      return false;
    };

    const sectionTitle = (en, ar) => {
      if (checkPageBreak(15)) { doc.addPage(); y = margin; }
      doc.setFillColor(240, 240, 245);
      doc.rect(margin, y, contentWidth, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(en, margin + 3, y + 6);
      const arRev = ar.split('').reverse().join('');
      doc.text(arRev, pageWidth - margin - 3, y + 6, { align: 'right' });
      y += 11;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
    };

    const infoRow = (labelEn, valueEn, labelAr, valueAr) => {
      if (checkPageBreak(10)) { doc.addPage(); y = margin; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${labelEn}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      const valStr = String(valueEn ?? '—');
      doc.text(valStr, margin + 40, y);
      // Arabic side
      doc.setFont('helvetica', 'bold');
      const arLabelRev = labelAr.split('').reverse().join('');
      doc.text(arLabelRev + ':', pageWidth - margin - 40, y, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      const arValRev = String(valueAr ?? '—').split('').reverse().join('');
      doc.text(arValRev, pageWidth - margin, y, { align: 'right' });
      doc.setDrawColor(235, 235, 235);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += 7;
    };

    const tableHeader = (cols) => {
      if (checkPageBreak(25)) { doc.addPage(); y = margin; }
      doc.setFillColor(15, 23, 42);
      const colWidth = contentWidth / cols.length;
      cols.forEach((col, i) => {
        doc.rect(margin + i * colWidth, y, colWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        const colRev = col.split('').reverse().join('');
        doc.text(colRev, margin + i * colWidth + colWidth / 2, y + 5.5, { align: 'center' });
      });
      y += 8;
      doc.setTextColor(0, 0, 0);
      return colWidth;
    };

    const tableRow = (cols, colWidth, isAlt) => {
      if (checkPageBreak(10)) { doc.addPage(); y = margin; }
      if (isAlt) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 7, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      cols.forEach((col, i) => {
        const colRev = String(col ?? '—').split('').reverse().join('');
        doc.text(colRev, margin + i * colWidth + colWidth / 2, y + 5, { align: 'center' });
      });
      y += 7;
    };

    // ===== PAGE 1: ENGLISH =====
    addHeader('Attendance Policy Summary', 'ملخص سياسة الحضور');
    y = 34;

    // Employee info box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EMPLOYEE DETAILS', margin + 4, y + 6);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${empName}`, margin + 4, y + 12);
    doc.text(`Employee ID: ${empId}`, margin + 4, y + 17);
    doc.text(`Pay Period: ${monthLabel}`, margin + 90, y + 12);
    doc.text(`Policy: ${policy.policy_name}`, margin + 90, y + 17);
    y += 30;

    // Policy overview
    sectionTitle('Policy Overview', 'نظرة عامة على السياسة');
    infoRow('Policy Name', policy.policy_name, 'اسم السياسة', policy.policy_name);
    infoRow('Overtime Multiplier', `${policy.overtime_rate_multiplier}x`, 'معامل الأوفر تايم', `${policy.overtime_rate_multiplier}x`);
    infoRow('Late Grace Period', `${policy.late_grace_minutes} minutes`, 'فترة السماح للتأخير', `${policy.late_grace_minutes} دقيقة`);
    infoRow('Absence Penalty', `${policy.absence_penalty_amount || 0} EGP`, 'غربة الغياب', `${policy.absence_penalty_amount || 0} ج.م`);
    infoRow('Approval Required', policy.require_approval_for_payroll ? 'Yes' : 'No', 'يتطلب موافقة', policy.require_approval_for_payroll ? 'نعم' : 'لا');
    y += 3;

    // Shift presets
    sectionTitle('Shift Schedules', 'مواعيد العمل');
    const shifts = policy.shift_presets || [];
    if (shifts.length > 0) {
      const colWidth = tableHeader(['Shift Label', 'Start', 'End', 'وصف الوردية', 'البداية', 'النهاية']);
      shifts.forEach((s, i) => {
        tableRow([s.label || '', s.start_time || '', s.end_time || '', s.label || '', s.start_time || '', s.end_time || ''], colWidth, i % 2 === 1);
      });
      y += 2;
    } else {
      doc.setFontSize(9); doc.text('No shift presets defined.', margin, y + 5); y += 8;
    }

    // Late deductions
    sectionTitle('Late Arrival Deductions', 'خصومات التأخير');
    const lateMode = policy.late_deduction_mode;
    const lateModeAr = lateMode === 'gradual_tiers' ? 'شرائح متدرجة' : lateMode === 'fixed_hourly' ? 'مبلغ ثابت للساعة' : 'لا يوجد خصم';
    infoRow('Deduction Mode', lateMode, 'نوع الخصم', lateModeAr);
    if (lateMode === 'fixed_hourly') {
      infoRow('EGP per Hour', `${policy.late_deduction_per_hour} EGP`, 'مبلغ للساعة', `${policy.late_deduction_per_hour} ج.م`);
    } else if (lateMode === 'gradual_tiers') {
      const tiers = policy.late_deduction_tiers || [];
      if (tiers.length > 0) {
        const colWidth = tableHeader(['Tier', 'Max Minutes', 'Deduction (EGP)', 'الشريحة', 'أقصى دقائق', 'الخصم (ج.م)']);
        tiers.forEach((t, i) => {
          tableRow([t.label || `Tier ${i+1}`, `${t.max_minutes}`, `${t.deduction_amount}`, t.label || `شريحة ${i+1}`, `${t.max_minutes}`, `${t.deduction_amount}`], colWidth, i % 2 === 1);
        });
        y += 2;
      }
    } else {
      doc.setFontSize(9); doc.text('No late arrival penalty applied.', margin, y + 5); y += 8;
    }

    // Early leave deductions
    sectionTitle('Early Leave Deductions', 'خصومات الانصراف المبكر');
    const earlyMode = policy.early_leave_deduction_mode;
    const earlyModeAr = earlyMode === 'gradual_tiers' ? 'شرائح متدرجة' : earlyMode === 'fixed_hourly' ? 'مبلغ ثابت للساعة' : 'لا يوجد خصم';
    infoRow('Deduction Mode', earlyMode, 'نوع الخصم', earlyModeAr);
    if (earlyMode === 'fixed_hourly') {
      infoRow('EGP per Hour', `${policy.early_leave_deduction_per_hour} EGP`, 'مبلغ للساعة', `${policy.early_leave_deduction_per_hour} ج.م`);
    } else if (earlyMode === 'gradual_tiers') {
      const tiers = policy.early_leave_deduction_tiers || [];
      if (tiers.length > 0) {
        const colWidth = tableHeader(['Tier', 'Max Minutes', 'Deduction (EGP)', 'الشريحة', 'أقصى دقائق', 'الخصم (ج.م)']);
        tiers.forEach((t, i) => {
          tableRow([t.label || `Tier ${i+1}`, `${t.max_minutes}`, `${t.deduction_amount}`, t.label || `شريحة ${i+1}`, `${t.max_minutes}`, `${t.deduction_amount}`], colWidth, i % 2 === 1);
        });
        y += 2;
      }
    } else {
      doc.setFontSize(9); doc.text('No early leave penalty applied.', margin, y + 5); y += 8;
    }

    // ===== PAGE 2: SIGNATURE & ACKNOWLEDGMENT =====
    doc.addPage();
    addHeader('Acknowledgment & Signature', 'إقرار وتوقيع');
    y = 34;

    // Acknowledgment text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Acknowledgment', margin, y);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const enAckLines = [
      'I, the undersigned employee, hereby acknowledge that I have received, read, and understood',
      'the attendance policy summary outlined in this document. I agree to comply with the shift',
      'schedules, late arrival penalties, early leave deductions, and all other terms defined in',
      `the "${policy.policy_name}" policy. I understand that adherence to these terms is a condition`,
      'of my continued employment and that violations may result in the deductions described herein.',
      '',
      'I further acknowledge that the overtime rate, grace periods, and penalty tiers have been',
      'explained to me and I have had the opportunity to ask questions regarding their application.'
    ];
    enAckLines.forEach(line => {
      if (checkPageBreak(8)) { doc.addPage(); y = margin; }
      doc.text(line, margin, y);
      y += 5;
    });

    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.text('Arabic Acknowledgment', margin, y);
    y += 7;
    doc.setFont('helvetica', 'normal');
    const arAckLines = [
      'أقر أنا الموقع أدناه بأنني استلمت وقرأت وفهمت ملخص سياسة الحضور والانصراف',
      'الوارد في هذه الوثيقة. وأوافق على الالتزام بمواعيد العمل وغرامات التأخير',
      'وخصومات الانصراف المبكر وجميع الشروط الأخرى المحددة في سياسة',
      `"${policy.policy_name}". وأفهم أن الالتزام بهذه الشروط شرط لاستمرار عملي`,
      'وأن المخالفات قد تؤدي إلى الخصومات الموضحة أعلاه.',
      '',
      'كما أقر بأنه تم شرح معدل الأوفر تايم وفترات السماح وشرائح الخصم لي،',
      'وقد أتيحت لي الفرصة لطرح الأسئلة حول تطبيقها.'
    ];
    arAckLines.forEach(line => {
      if (checkPageBreak(8)) { doc.addPage(); y = margin; }
      const rev = line.split('').reverse().join('');
      doc.text(rev, pageWidth - margin, y, { align: 'right' });
      y += 5;
    });

    y += 12;

    // Signature lines
    if (checkPageBreak(40)) { doc.addPage(); y = margin; }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Signatures', margin, y);
    y += 8;

    // Employee signature
    doc.setFontSize(9);
    doc.setDrawColor(100, 100, 100);
    doc.line(margin + 40, y, margin + 130, y);
    doc.line(margin + 40, y + 25, margin + 130, y + 25);
    doc.setFont('helvetica', 'normal');
    doc.text('Employee Signature', margin, y - 1);
    doc.text('Date', margin, y + 24);
    const arEmpSig = 'توقيع الموظف'.split('').reverse().join('');
    const arDateLbl = 'التاريخ'.split('').reverse().join('');
    doc.text(arEmpSig, pageWidth - margin, y - 1, { align: 'right' });
    doc.text(arDateLbl, pageWidth - margin, y + 24, { align: 'right' });
    doc.line(pageWidth - margin - 90, y, pageWidth - margin, y);
    doc.line(pageWidth - margin - 90, y + 25, pageWidth - margin, y + 25);

    y += 45;

    // Manager signature
    if (checkPageBreak(40)) { doc.addPage(); y = margin; }
    doc.line(margin + 40, y, margin + 130, y);
    doc.line(margin + 40, y + 25, margin + 130, y + 25);
    doc.text('Manager / HR Signature', margin, y - 1);
    doc.text('Date', margin, y + 24);
    const arMgrSig = 'توقيع المدير / الموارد البشرية'.split('').reverse().join('');
    doc.text(arMgrSig, pageWidth - margin, y - 1, { align: 'right' });
    doc.text(arDateLbl, pageWidth - margin, y + 24, { align: 'right' });
    doc.line(pageWidth - margin - 90, y, pageWidth - margin, y);
    doc.line(pageWidth - margin - 90, y + 25, pageWidth - margin, y + 25);

    // ===== FOOTERS ON ALL PAGES =====
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(i, totalPages);
    }

    const pdfBytes = doc.output('arraybuffer');
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Attendance_Policy_${policy.policy_name.replace(/\s/g, '_')}.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});