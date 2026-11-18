export default `
# 2. Super Administrator

The Super Administrator is any user whose platform role is **admin**. Admins bypass every permission check, see every branch, every module and every tab, and are the only users who can manage users, roles, modules, HR and platform‑level settings. This chapter walks through everything an admin can do, screen by screen.

> **Tip:** the Admin Panel has a search bar. Type "tax", "printer", "users", "cashback"… to jump straight to a tab.

## 2.1 Admin Panel — structure

The Admin Panel is organised into three colour‑coded **sections**, each with grouped tabs:

| Section | Purpose |
|---|---|
| **Settings** (green) | Configuration: business setup, regional, comms, access control, loyalty config, kitchen & inventory settings |
| **Operations** (blue) | Operational masters: tables, rewards, promotions, reviews, guest feedback, delivery, suppliers, financial system |
| **Systems** (purple) | Data & maintenance: client data views, loyalty registrations, redemptions and cashback approvals, social media lead capture, analytics, cache, audit, cleanup, exports, backups |

Non‑admin staff can be given one or more section flags (*admin_settings / admin_operations / admin_systems*) — they then see only that section, and never the Users, Roles, Modules or Inventory Compliance tabs.

## 2.2 Settings section

### Business Setup
- **Branches** — create/edit branches (address, contacts, WhatsApp, social links, per‑order‑type tax & service %, receipt header/footer, GPS + radius for attendance geofencing, commercial registration, tax card). **Bulk Branch Settings Update** pushes a setting to many branches at once.
- **Restaurant Info** — website, phone numbers, location, social links, marketing texts; **Default Root Client** (who receives referrals when no code is used); **Payment Methods** numbers (InstaPay, wallet); **Enabled Payment Methods** toggles (bank transfer, PayPal, cash, InstaPay, wallet, Stripe); **Stripe Payment Gateway** keys.
- **Branding** — upload the logo, set the brand name (also the browser title), and enable a theme. Primary / secondary / accent control the brand palette; the separate optional success / warning / danger palette controls semantic status colours without mixing their meaning with the brand. Leave a status colour blank to retain the system default. Similar brand and status colours show a non-blocking confusion warning before saving.
- **Modules** *(admin only)* — open/close any module. Closing hides it everywhere (navigation, hubs, admin tabs, routes). Child modules follow their parent (e.g. closing *GenMo Program* closes cashback, referrals, rewards and registrations). Core tabs (Modules, Branding, Restaurant Info, Clear Cache, Users, Roles) can never be closed.

### Regional & Format
- **Timezone** — UTC offset in minutes; the database is the single source of truth for all timestamps.
- **Numeral Preferences** — English (0‑9) or Arabic (٠‑٩) digits app‑wide.

### Comms Config
- **Email** — switches for every automatic email, grouped by who receives it: clients & guests (deposit receipt, guest entry pass), kitchen & operations (Head Chef kitchen brief, event confirmed & payment alerts, chain of custody emails), sales & management (client quote decision, deposit copy to the recorder, weekly catering data check) and customer accounts & loyalty (welcome email, tier upgrade). Each email shows when it is sent, who it reaches right now and when it was last sent. **Choose recipients & send a test** opens its recipient choices: staff emails can switch their usual recipients off, and any email can also go to chosen employees (search by name, department or email; only active employees with an email receive it) and to other email addresses. Client, guest and customer emails always reach the client, guest or customer, and the people added there get a copy. For chain of custody emails, stage emails still go to the person assigned to each stage, and the people added receive the overdue digest. **Send a test to me** and **Send a test to added people** send a short test (up to 10 an hour) and show who received it. The Head Chef who receives the kitchen brief is chosen here too. Switch and recipient changes are saved together with **Save changes**. The overview counts the emails that are on, what was sent in the last 30 days and the people added, and lists anything to check (an email that would reach no one, chosen people who can't receive it, recent failures), each linking to the email. **Recent activity** lists every automatic email and test, newest first, filtered by email or to problems only, with who received each one and why any address failed. Below: report recipients (with email checks) and the emails staff send themselves (documents, guest invitations, portal invitations, payslips), with links to where they are sent from.
- **SMS Notifications** — SMS alert preferences (orders, deliveries, inventory).

### Access Control *(admin only)*
- **Users** — the *Users & Permissions* workspace. Filter (all / staff / clients / ex‑employees, by role), pick a user, then:
  - choose a **Role preset** (Cashier, Manager, Restaurant Manager, HR, Marketing Team, Digital Marketing, KDS Kitchen/Bar, Head KDS, Captain, Call Centre, Accountant, Catering Manager, Delivery, Inventory Manager, Staff, View Only…);
  - toggle **granular permissions** grouped by section (Menu, Orders, POS, Cashier, Inventory, Purchases, Clients/CRM, Rewards, Analytics/Finance, HR, Catering, Admin sections, Independent tabs);
  - **assign a platform role** (user/admin), **revoke** access (marks ex‑employee, stores previous role), and **Save**.
  - Saving a permissions record also ensures an **Employee** record exists for that person so they appear in HR and staffing.
  - **Invite user** by email with role *user* or *admin*.
- **Role Management** — create, edit, deactivate custom roles (key, label, description, permission preset, sort order). System roles are protected from deletion. Changing a preset does not alter already‑assigned users until re‑applied.

### Loyalty Program Config
- **Cashback** — default cashback % per referral tier (levels 1‑3), registration fee, welcome cashback %, payout %, minimum payout.
- **Cashback Rules** — dynamic rules by order type, tier and promotional period.
- **Reg Levels** — registration levels and fees.
- **Loyalty Tiers**, **Milestones** (referral milestone bonuses), **Categories** (reward categories).

### Kitchen & Inventory
- **Printer** — receipt printers (cashier/kitchen/bar), PrintNode, width, fonts, auto‑print.
- **Preparation** — preparation areas and ticket settings.
- **Inventory Compliance** *(admin only)* — purchases vs POS consumption vs stock balance variance report.
- **KDS Settings** — sound alerts, volume, new‑order / overdue sound URLs.

## 2.3 Operations section
- **Menu** has moved out of Admin: it is its own screen in the top bar under **Operations → Menu Management** (items, categories, sections, options, recipes, prices, station, visibility), opened with the Menu permissions (view / create / edit / delete). Old Admin › Menu links open it there.
- **Tables** — dine‑in tables, minimum charge per guest.
- **Rewards** — create/edit/delete redeemable rewards (name, description, category, cashback cost, availability).
- **Delivery** — Companies (Talabat, Noon…, commission & fees), Zones, Drivers, Bonus tiers.

## 2.4 Systems section

### Client Data
- **Cashback History**; **Top Referrers** leaderboard; **Cashback Report** (monthly generated vs paid). Client records moved to **CRM › Clients**.

### Order & Guest Ops
- **Registrations** — register a client directly (no approval), approve new registrations after payment, approve level‑upgrade requests.

### Loyalty Ops
- **Redemptions** — redeem a reward for a client; approve redemption requests.
- **Cashback Approvals** — approve/reject pending automatic cashback distributions from completed orders (server‑side, permission‑gated).

### Marketing & Outreach
- **Social Media** — lead capture from Facebook and Instagram (Meta webhook: lead form ads and messages), WhatsApp (Twilio webhook), TikTok and LinkedIn (forwarded through Zapier or Make). Each card shows its webhook URL, which secrets are saved, step-by-step setup and a live **Check connection** (*social_media_view*).

### Maintenance
- **Clear Cache** (*clear_cache_view*) — force clients to reload the latest version.
- **Rule History** (*rule_history_view*) — which cashback rule applied to each order.
- **Audit Log** — every administrator action (who, what, before/after, success/failure).
- **Branch Reassignment** — move unassigned records to a branch.
- **Go Live Cleanup** — purge test data before launch (irreversible).

### Data Management
- **Data Clone** — export selected modules to JSON / import to clone into another app.
- **Staff Backup** — CSV export of employees, attendance and salaries.

## 2.5 HR Hub *(admin only)*

Reached from **Operations ▾ → HR**. Tabs:

| Tab | What you do |
|---|---|
| Employees | Invite a user; create/edit Employee records (position, department, employment type *regular / temporary / freelance*, skills, salary type & rates, bonus structure, hire date, status, face template) |
| Attendance Review | Approve / reject daily attendance with reviewer notes |
| Attendance Policy | Grace periods, late & early‑leave deductions, overtime rate |
| Live Dashboard | Who is clocked in right now |
| Summary | Daily attendance summary |
| Shifts | Shift presets (start/end, expected hours) |
| Penalties | Salary penalties (late, absence, misconduct, damage) |
| Borrowings | Salary advances with automatic monthly instalments |
| Payroll | Payroll runner — base + hourly + overtime + bonus − deductions − penalties − borrowings → gross / net, mark paid |
| Payroll Dashboard | 6‑month salary trends |
| Restaurant Location | GPS point + radius used to verify clock‑ins |

Catering staffing plugs into HR: confirming an assignment creates a **Shift**, the person clocks in at the branch or at the event site, and their hours flow into payroll like any other day.

## 2.6 Catering module — admin view

Admins see every Catering tab (Chapter 3 documents each in depth), plus four admin‑relevant capabilities:

- **Settings → Lists & Settings** — manage the option lists (event types, service styles, dress codes, package categories), deposit % (events booked before payment policies), cancellation policies, logistics on/off, portal quote visibility defaults.
- **Settings → Payment Policies** — the payment rules for each booking window (payment steps, whether approval is needed and by which role, the status shown while waiting, hold until approved), with checks for uncovered or overlapping windows and a preview on a sample quote. Applied to every new booking and again on reschedule: the first payment is the deposit, approvals go to Approvals → Booking Approvals (give the approver role the **Booking Approvals** permission in Role Management), and a booking on hold, not approved or behind on a payment can't start operations or have stock released.
- **Operations → Assets and Resources** — staffing roles & default rates, equipment catalog (with units, maintenance, vehicle requirement), vehicles, media vendors, labour rate settings.
- **Settings → Mail** — two sub-tabs: **Mail templates** (invitation and document e‑mail templates, EN & AR) and **Client Receipt** (the PDF payment receipt, its email and automatic sending).
- **Booking → Discounts** and **Event Day → Staff Feedback** — visible to admins and users with catering finance/discount access.

## 2.7 Other admin‑only or admin‑first pages

- **Executive Dashboard** (Analytics ▾) — pages: *Overview*, *Financial performance*, *Catering*, *Cost & supply*, *People*, *Customers & growth*, *Alerts & insights*; each report shows only while its module is switched on (see Chapter 5).
- **Inventory Hub / Purchases Hub / Cashier / KDS / Delivery Portal / Manufacturing / Butchery** — all reachable (Chapter 4).
- **Kitchen & Bar Manual** — recipe cards, onboarding process, section editor.
- **Support → Manual** — regenerate the AI module manual, capture screenshots, export PDF. **Support → User Manual** — this document.
- **Staff Data Backup**, **Comparative Branch Report**, **App Marketing Brochure** — direct URLs.

## 2.8 Recommended admin routines

**Initial setup order**
1. Branches → Restaurant Info → Branding → Timezone → Numerals.
2. Modules — close what you don't run yet.
3. Users → invite staff → assign role presets → adjust flags.
4. HR → Employees (rates!), Shifts, Attendance Policy, Restaurant Location.
5. Catering → Lists & Settings, Payment Policies, Packages & Media, Mail templates; Operations → Assets and Resources (roles, equipment, vehicles).
6. Inventory items (with lead times) and Suppliers.

**Weekly**
- Approvals page (purchase orders, waste, attendance, registrations, redemptions, cashback, catering booking approvals).
- Shortfall Queue and Recommended Cart.
- Audit Log spot check.

**Monthly**
- Payroll runner → Payroll dashboard.
- Cashback report → payout requests in Approvals.
- Executive Dashboard → Event P&L and Catering Advisor.
`;