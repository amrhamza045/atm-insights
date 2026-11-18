export default `
# 6. HR & General Staff

## 6.1 HR role

**Preset:** *hr*. **Flags:** hr_view_own, hr_view_all, hr_edit, hr_attendance_approve, attendance_checkin, menu_view.

> **Note:** the **HR Hub** page itself is admin‑only. HR‑preset users work through **Attendance** (Operations ▾) and **Approvals**, where *hr_attendance_approve* lets them approve or reject other people's attendance. Employee record creation and payroll are performed by an administrator in the HR Hub (Chapter 2.6). If your HR staff must run payroll, make them platform admins or have an admin do it.

What HR users do daily:
- **Attendance Review → Pending HR Confirmation** — confirm presence with one click or reject with a required reason. Reviewers cannot confirm their own requests. This presence decision remains separate from daily attendance/payroll approval.
- **Attendance → Admin view** — today's confirmed clock‑ins, verification flags (face, location), late/early minutes.
- **Approvals** — approve confirmed attendance with notes; rejected and unconfirmed days don't count toward payroll.
- Advise managers on **catering staffing** availability and rates (rates live on the Employee record).

## 6.2 General staff

**Preset:** *staff*. **Flags:** menu_view, hr_view_own, attendance_checkin.

Anyone with an **Employee** record whose e‑mail matches their login sees:
- **Packages** — the public catalog.
- **Attendance** — clock in / clock out:
  1. The normal path keeps **face verification** and verified **GPS** at the branch or assigned event site.
  2. If biometric check-in is unavailable, open **HR Confirm**, optionally attach location and a note, then select **Request Check-in**.
  3. The request shows **Awaiting HR confirmation** and does not enable sign-out, attendance earnings or payroll. If rejected, the reason appears and a fresh request is allowed.
  4. Once HR confirms presence, the original request time becomes the sign-in time and normal verified sign-out becomes available.
  5. The confirmed day still requires the existing daily attendance/payroll approval.
- **My HR data** (own only) — hours, earnings this month, penalties and borrowings.
- **Notifications** — including *"You have been assigned to <event>"* when a catering manager confirms a staffing assignment.
- **My Custody** (appears only when relevant) — trips where you are a custodian or the driver: confirm your stage, count the items; a shortfall is flagged automatically and delays are escalated.
- **Support** — AI assistant and manuals.

## 6.3 Temporary & freelance staff

Employees can be flagged *temporary* or *freelance*. They are treated identically in attendance and payroll (hours × rate) but the label is used when the staffing matcher suggests people for events, and freelancers fall back to the **role default rate** when they have no hourly rate of their own.

## 6.4 Ex‑employees

When an admin **revokes** a user in *Users & Permissions*, the record is marked *ex‑employee* with the previous role kept for history; all permissions are removed and they disappear from staffing suggestions. Their attendance and salary history stays intact for reporting and for the **Staff Backup** export.
`;