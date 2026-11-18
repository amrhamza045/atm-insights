export default `
# 4. Operations Staff

This chapter covers the restaurant‑operations roles. Each section states the role preset, what appears in the header for that role, and what they can do.

## 4.1 Cashier

**Preset:** *cashier*. **Default flags:** POS view/edit/print/approve, cashier view/edit/print, orders, clients view, inventory & purchase view/edit/print, voice‑note approve, own HR, attendance check‑in, admin operations.

**Header:** POS, Cashier, Inventory, Purchases, Attendance, Packages, Support.

- **POS** — table grid (dine‑in), takeaway and delivery orders; add items with options/sizes; send to kitchen/bar (KDS + ticket printers); split checks; minimum charge per guest; apply discounts (approve flag); take payment (cash, Visa, InstaPay, wallet, cashback balance, recharge balance, split); print receipt; refund/cancel (separate flags); review **voice orders** and **website orders**; captain and call‑centre staged orders await cashier approval here.
- **Cashier** — open a session with an opening float, record cashier purchases (with receipts), close with reconciliation of cash / Visa / InstaPay totals; closing may need approval (*cashier_session_approve*). Session reports and closing report are printable.
- **Inventory Hub** — view stock, declare waste, expiry reports (edit flag required to change).
- **Purchases Hub** — view/create purchase orders and invoices.
- **Attendance** — clock in/out with face scan and GPS.

## 4.2 Captain (floor)

**Preset:** *captain*. **Flags:** POS view/edit/print, own HR, attendance check‑in.

Works in **Captain POS**: pick a table, build the order from the menu, capture guest count, send to the cashier as a *staged* order (the cashier approves it into the POS), collect **guest feedback** at the table. Cannot take payment.

## 4.3 Call Centre

**Role:** Call Centre Agent. **Permission:** Call center mode (*pos_call_center*) — phone orders go to the cashier for approval.

Works in **Call Center POS**: search or create the customer (phone‑based, address book with QR/location), build a delivery or takeaway order, choose delivery zone/company, submit to the cashier queue. Also retains the **CRM → Referrals** view to check guest referrals.

## 4.4 Kitchen & Bar (KDS)

**Roles:** kitchen and bar staff, Head Chef and Head Bartender (the heads also hold *selling_priority_manage*). **Permissions:** kds_view or kds_bar_view, own HR, attendance check‑in.

- **Kitchen Display** — live queue of tickets routed by each item's preparation station; mark preparing → ready; overdue alerts with sound (Admin → KDS Settings). Modified quantities are highlighted.
- **Heads** additionally reach **Manufacturing** (recipes → production orders with pre‑production stock check, consumption and finished‑goods receipt), **Butchery** (livestock → slaughter → primal cuts → raw material SKUs with lot traceability), and the whole **Catering** module (Chapter 3) — heads are catering roles.
- **Kitchen & Bar Manual** — recipe cards, portioning and plating standards, new‑item onboarding.

## 4.5 Inventory Manager

**Preset:** *inventory_manager*. **Flags:** menu view/create/edit, orders view, inventory view/edit/print/approve, purchase view/edit/print/approve.

**Header:** Inventory, Menu, Engineering, Support.

- **Inventory Hub**
  - *Inventory* — items (purchase vs selling unit, thresholds, cost, supplier, expiry date, **lead time days**), categories, deduction history.
  - *Cost Analysis* — cost dashboards.
  - *Waste* — declare waste (business date, reason, photo, cost impact) and approve declarations.
  - *Expiry* — expiry reports and resolution.
  - *Stock Admin* — stock balance review, low‑stock overview, stock **freeze** (full or by category, pauses sales), low‑stock alert settings, re‑initiate stock.
  - *Forecast* — restocking recommendations from sales trends.
- **Purchases Hub** (lifecycle order): **Recommended Cart** (auto‑built from catering shortfalls and planning horizon, grouped by supplier, with sourcing comparison) → **Purchase Orders** (creator‑vs‑approver gate, per‑line approval, urgency, needed‑by) → **Purchase Invoices** (recording an invoice is the *only* action that moves stock and updates average prices) → **Average Prices** → **Price Advisory** → **Reliability** → **Suppliers** → **PO Advisory**.
- **Menu Management / Menu Engineering** — recipes link menu items to ingredients; food cost recalculates when purchase prices change.
- **Butchery** — accessible to inventory managers.

## 4.6 Delivery

**Presets:** *delivery_driver* (legacy driver) and *delivery*.

- **Delivery Portal** — orders ready for dispatch, assign to self, update status (picked up → delivered), chat with the restaurant, delivery bonus progress.
- **My Deliveries** dashboard (driver preset).
- **My Custody** — if assigned as driver or custodian on a catering trip, confirm hand‑off stages and count items.

## 4.7 Restaurant Manager / Manager

**Presets:** *restaurant_manager*, *manager*. These are the broadest non‑admin roles: POS (incl. refund/cancel), cashier, inventory (incl. delete), purchases (incl. approve), delivery, KDS, HR view/edit/approve (restaurant manager), sales analytics, admin operations, plus **Catering**, **Manufacturing**, **Butchery** and **CRM → Referrals**.

They see the **Approvals** page (Operations ▾) — a consolidated queue of purchase orders, waste declarations, attendance, registrations, redemptions and cashback distributions awaiting decision.

## 4.8 Shared operational tools

- **Approvals** — anyone with an approve flag (or admin_operations) sees the relevant queues.
- **Attendance** (Operations ▾ or bottom bar) — face + GPS clock‑in; managers with *hr_attendance_approve* review others.
- **Support → AI Assistant** — role‑aware chatbot that can look up orders, clients and menu.
- **Notifications** (bell) — in‑app notifications, including catering assignment notices.
`;