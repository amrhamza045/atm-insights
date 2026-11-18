export default `
# 1. System Overview

## 1.1 What this platform is

**Rosemary** (branded in-app from the *Branding* tab) is an end‑to‑end catering management platform. It runs the whole life of a catering event — from a public package enquiry, through quoting, deposits, planning, purchasing, production, staffing, logistics and event‑day execution, to reconciliation, final invoicing and guest engagement — and surrounds that core with the supporting business modules a food operation needs: inventory, purchasing, suppliers, HR & payroll, CRM & loyalty, finance, analytics and communications.

Everything is **multi‑branch**: nearly every record carries a branch, and the branch selector in the header scopes what you see.

## 1.2 Who uses it

| Audience | Where they work | Chapter |
|---|---|---|
| **Super Administrator** (platform role *admin*) | Everything — Admin Panel, HR Hub, Catering, all hubs and dashboards | Chapter 2 |
| **Catering team** (Manager, Restaurant Manager, Head Kitchen/Bar, Catering Manager) | *Catering* module, CRM referrals, Approvals | Chapter 3 |
| **Operations staff** (Cashier, Captain, Call Centre, KDS Kitchen/Bar, Inventory Manager, Delivery) | POS, Cashier, KDS, Inventory & Purchases hubs, Delivery Portal | Chapter 4 |
| **CRM, Marketing & Finance** (Marketing Team, Digital Marketing, Accountant) | CRM, Segments, Campaigns, Sales analytics, Executive Dashboard | Chapter 5 |
| **HR & general staff** | Attendance, own HR data, custody hand‑offs | Chapter 6 |
| **Clients & guests** (public visitors, portal customers, invited guests) | Packages catalog, Catering Portal, Event Pass | Chapter 7 |

Chapters 8 and 9 are reference material: the full permission model and the data flow / status glossary.

## 1.3 How the pieces connect

The platform is built around one chain of records. Understanding it makes every screen obvious:

1. **Package** (catalog template) → a public visitor or staff picks packages → **Enquiry** creates a **Client** (if new) and a **Catering Event** in status *enquiry*.
2. **Quote revisions** are built on the event (from packages or bespoke line items). One revision is *active*; its total and the event's **payment policy** (set by how far ahead it was booked) drive the **required deposit** and the later payment dates.
3. **Payments** (deposit, balance, refund) are recorded against the event. A verified deposit — the policy's first payment — moves the event to *confirmed* (bookings the policy holds for approval wait for the approver); an overdue policy payment blocks Confirm & Start and stock release.
4. **Confirm & Start Operations** locks the quote, freezes labor cost, reserves the package's **equipment**, allocates its **materials against stock**, and moves the event to *in_progress*.
5. Any stock shortfall becomes a **Shortfall** → **Recommended Cart** → **Purchase Order** → **Purchase Invoice** (only the invoice moves stock).
6. **Production plan** batches are generated from the quote; **Staffing** fills roles from Employees (creating Shifts → Attendance → Payroll); **Logistics** creates trips with a chain of custody.
7. On event day, **Execution** tracks the run, **Returned** items are logged, **Reconciliation** produces the final invoice, and **Staff Feedback** is captured.
8. **Guest Engagement** sends invitations (email / WhatsApp / SMS) with a QR **Event Pass**; guests RSVP, confirm attendance and can submit referrals that earn cashback.
9. All of the above rolls up into the **Executive Dashboard** (the Catering page: pipeline, P&L, cost variance, loss analysis, staffing, equipment & returns, advisor; the kitchen's production batches under Cost & supply › Kitchen Performance) and into the **Daily Financial Summary**.

## 1.4 Navigation at a glance

The header adapts to who you are:

- **Packages** — public catalog (everyone, including logged‑out visitors).
- **Catering** — the catering workspace (catering roles + admin).
- **Operations ▾** — KDS, Delivery Portal, Attendance, Approvals, CRM, Manufacturing, Butchery, Cashier, Menu Management, Inventory, Purchases, HR (admin only), Kitchen & Bar Manual.
- **Analytics ▾** — Executive Dashboard, POS / Counter Sales, Cashback History, Client Analytics, Manufacturing Analytics.
- **Support** — AI assistant, the module manual and this user manual.
- **Admin** — the Admin Panel (three sections: Settings, Operations, Systems).
- **My Profile**, **Custody** (only when you hold a hand‑off), **Portal** (catering customers), **Branch selector**, **Language (EN/AR)**, **Notifications**, **Logout**.

On mobile a bottom bar gives Packages, Profile, Attendance (staff), Support and Logout.

## 1.5 Cross‑cutting behaviours

- **Branch scoping** — the branch selector filters events, stock, orders, staff and reports. Catering access to branches is also enforced server‑side per user (*catering_branch_ids*).
- **Modules on/off** — an admin can *close* any module from **Admin → Settings → Modules**. A closed module disappears from navigation and its pages show "Module Closed". No data is deleted.
- **Permissions** — a super admin has everything. Every other user gets a **Role preset** plus optional granular flag overrides (see Chapter 8). Changes propagate live to open sessions.
- **Bilingual** — English / Arabic with full RTL mirroring, automatic UI translation cache, and Arabic/English numerals (Admin → Numeral Preferences). Catering documents and invitation e‑mails have separate EN/AR templates.
- **Branding** — logo, brand name and primary / secondary / accent colours are managed separately from optional success / warning / danger status colours (Admin → Branding), preserving consistent operational meaning.
- **Timezone** — one system‑wide offset (Admin → Timezone) governs every timestamp.
- **Audit** — administrative actions are written to the Audit Log; order edits to the Order Change Log.
`;