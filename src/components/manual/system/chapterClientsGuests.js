export default `
# 7. Clients & Guests

## 7.1 Public visitors — Packages

The landing page (**/**) and **Packages** show every *active* catering package, filterable by category, with description, pricing mode (per guest / flat / itemised), minimum guests and included items. Visitors tick the packages they like and fill the **request panel** (name, phone with country code, e‑mail, event date, guests, notes). Submitting creates:
- a **Client** (matched by phone/e‑mail if they already exist — staff get duplicate warnings), and
- a **Catering Event** in status *enquiry* with the selected packages noted for the quote.

Logged‑out visitors also see the **VeraKit 360 GenMo** loyalty info page and a **Login/Signup** button.

## 7.2 Catering customers — the Catering Portal

A staff member invites the client from **Catering → Guest Engagement → Portal Access**. The client signs up from the e‑mail; on first visit their login is linked to the client record (*portal_client_id*). Record visibility is enforced by server‑side row security — the client only ever sees their own events.

**Portal** (header link) shows the list of their events and, for the selected event:
- header with date, venue, status, guests, quote total, paid, and balance (if the restaurant allows it);
- **Details** tab — the active **quote** (line detail according to the visibility settings staff chose), optional **service costs** card, **approve the quote** panel, **deposit** panel (amount due, offline methods with the restaurant's InstaPay/wallet numbers, *"I have transferred"* declaration with reference → event moves to *deposit_pending_verification*), **payments & documents** with downloadable *Quotation*, *Deposit receipt*, *Invoice* and — once reconciliation is finalised — *Final invoice*;
- **Transfers** tab — upload proof of transfer for staff to verify.

The portal never edits an event; changes are requested by contacting the restaurant.

## 7.3 Invited guests — the Event Pass

Guests receive an e‑mail / WhatsApp / SMS with a personal link (**/EventPass?t=…**). The page (EN/AR toggle, branded with the logo from **Admin → Branding**) shows the event details and:
1. **RSVP / confirm attendance** — name, phone, e‑mail, seats; *maybe* is supported.
2. On confirmation, a **QR attendance pass** with a pass code is displayed for check‑in at the door.
3. A **Referral cashback** card lets the guest refer someone (or a company / venue). Accepted referrals are managed by staff in **CRM → Referrals** and earn cashback in the loyalty ledger.
4. Declining shows a thank‑you message.

No login is needed; the token identifies the invitation.

## 7.4 Loyalty clients — My Profile

Registered loyalty (GenMo) clients log in and use **My Profile**:
- profile completion (phone, address) is enforced for older accounts;
- cashback balance, payout balance, wallet balance, tier and registration level;
- **referral link / code** sharing and a referral network tree with earnings;
- **submit a purchase** receipt for cashback, view submission history;
- **request a payout** (within limits) and **recharge wallet** (bank / InstaPay / wallet / Stripe when enabled);
- **rewards** catalog and redemptions;
- **notification preferences** (e‑mail / SMS / push categories) and addresses;
- order history and milestones.

## 7.5 What clients cannot do

Clients never see staff screens, other clients' data, costs, margins or internal notes. Everything they see is either explicitly published (packages, quotes with the chosen visibility) or their own transactional records.
`;