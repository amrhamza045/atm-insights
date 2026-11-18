export default `
# 9. Data Flows & Status Glossary

## 9.1 The catering record chain

\`\`\`
CateringPackage ─┐
                 ├─► CateringEvent ──► CateringQuote (revisions, one active)
Client ──────────┘        │                    │
                          │                    └─► required deposit
                          ├─► CateringPayment (deposit / balance / refund) ─► DailyFinancialSummary.catering_revenue
                          ├─► CateringReservation (stock & production inputs) ─► shortfall ─► PurchaseOrder ─► PurchaseInvoice (moves stock)
                          ├─► ProductionOrder (catering batches)
                          ├─► CateringAssignment ─► Shift ─► Attendance ─► SalaryRecord
                          ├─► CateringEquipmentReservation ─► CateringEquipmentUnit / Maintenance
                          ├─► CateringTrip ─► CateringCustodyCheckpoint
                          ├─► CateringInvitation ─► Event Pass RSVP ─► referral ─► CashbackTransaction
                          ├─► CateringReturnedItem
                          ├─► CateringReconciliation ─► final invoice ─► status completed
                          └─► CateringStaffFeedback
\`\`\`

## 9.2 Event statuses

| Status | Meaning | Set by |
|---|---|---|
| enquiry | Request received, no quote | Packages page / Events tab |
| quoted | Quote revision exists | Quotes tab |
| deposit_pending | Quote approved, deposit (the payment policy's first payment) awaited; also a paid booking the policy holds for approval | Approvals / portal approval |
| deposit_pending_verification | Customer declared an offline transfer; unverified | Portal |
| confirmed | Deposit recorded (and, when the policy asks, the booking approved) | Deposits & Payments / Approvals → Booking Approvals |
| in_progress | Operations started (quote locked) | Confirm & Start |
| completed | Reconciliation finalised | Reconciliation |
| cancelled | Cancelled with policy penalty | Cancel dialog |

**Deposit status:** none → partial → paid; after cancellation: retained / refundable / refunded.

**Reservation status (event):** none / reserved / shortfall / released. **Procurement status (event):** none / po_raised / partially_delivered / covered (only *covered* means everything was delivered).

**Production plan:** none / planned / released. **Staffing:** none / planned / partially_staffed / fully_staffed.

## 9.3 Reservation & procurement statuses (line level)

| Field | Values |
|---|---|
| CateringReservation.status | reserved (reduces free stock) / released / consumed |
| CateringReservation.procurement_status | none / po_pending / po_approved / po_delivered / po_cancelled |
| CateringReservation.at_risk | true when days to needed‑by ≤ item lead time and not delivered (daily job) |
| PurchaseOrder.status | recommended → pending_approval → pending → confirmed → shipped → delivered / cancelled |
| PurchaseOrder.urgency | routine / urgent |

Rules: the **creator cannot approve their own PO**; **stock only moves when a Purchase Invoice is processed**; a *recommended* PO is a draft suggestion from the Recommended Cart.

## 9.4 Quote & money fields

- *subtotal* → + *tax_total* + *service_total* → − discount (percent of gross, or fixed amount) → **total**.
- *required deposit* = the payment policy's first payment on the quote, kept on the event as *required_deposit_amount* (events booked before payment policies: total × event.deposit_percentage). Each later policy step is due by its date; *policy_approval_status* tracks the booking's approval (not_required / pending / approved / rejected).
- *estimated_cost* = Σ line unit_cost × qty (+ labour, equipment, logistics on the P&L); *estimated_margin* = total − cost.
- Labour cost is **frozen at Confirm & Start** so later rate changes cannot move the recorded margin.
- Catering revenue is reported separately from POS revenue in the Daily Financial Summary — never double‑counted.

## 9.5 Loyalty ledger

CashbackTransaction types: *welcome_cashback, referral_cashback (level 1‑3), self_cashback, redemption, payout*. Client balances (*cashback_earned / consumed*, *available_payout / consumed_payout*, *wallet_balance*) are derived from the ledger and can be recalculated by an admin tool.

## 9.6 HR chain

Employee → Shift (preset or catering assignment) → Attendance (face + GPS, late/early/overtime) → approval → SalaryRecord (base, hourly, overtime, bonus, attendance deductions, penalties, borrowings → gross/net) → paid.

## 9.7 Automated jobs

- **Escalate catering shortfalls** — daily: flags at‑risk reservations.
- **Escalate custody delays** — flags overdue hand‑off stages.
- **Low stock alerts** — e‑mail/SMS when below threshold (if enabled).
- **Daily financial summary** generation and e‑mail.

## 9.8 Communication channels

| Channel | Used for | Configuration |
|---|---|---|
| E‑mail | Invitations, catering documents, portal invites, transactional messages, campaigns | Admin → Email; Catering → Mail templates |
| WhatsApp | Order confirmations/status, referral cashback, catering documents, invitations, lead capture | Twilio credentials (secrets) |
| SMS | Alerts, invitations | Admin → SMS Notifications; Twilio |
| In‑app | Assignments, approvals, broadcasts | Notifications tab |
| Push | Native mobile only | — |

> **Known limitation:** business‑initiated WhatsApp messages outside a 24‑hour window require approved templates; free‑form sends may fail, and Twilio credentials must be configured in production.
`;