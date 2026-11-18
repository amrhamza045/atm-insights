export default `
# D. Client & Guest Communication

**Who does this:** catering manager, call centre.
**Where:** **Catering → Guest Engagement** (Invitations, Portal Access) and the **Email / WhatsApp** buttons on documents. Templates live in **Catering → Settings → Mail**.

## Email a catering document

Every send generates a **fresh PDF** at that moment, so the client never receives stale figures.

1. Find the document where it lives:
   - **quotation** → **Booking → Quotes**, on the revision;
   - **deposit receipt** / **invoice** → **Booking → Deposits & Payments**, on the payment row;
   - **final invoice** / **credit note** → **Event Day → Reconciliation**.
2. Press **Email** (the envelope button). To send on WhatsApp instead, press **WhatsApp** — same idea.
3. In the dialog pick the **document type** if asked, and the **language** (English or Arabic).
4. The **subject and body are pre-filled** from the Mail templates with the client name, event, date, total and the PDF link already resolved. Read it.
5. Edit the text if this one client needs something different — your edit affects only this send, never the saved template.
6. Check the **recipient address** (it comes from the client record; fix the client record if it's wrong or missing).
7. Press **Send**. The client receives the message with a link to download the PDF.

**Changing the wording for everyone:** **Catering → Settings → Mail → document e-mail** template, English and Arabic separately. Placeholders you can use: *{{client_name}} {{event_name}} {{event_date}} {{document_type}} {{total}} {{link}} {{brand_name}}*. Keep *{{link}}* in the body or the client gets no PDF.

## Invite guests and collect RSVPs

1. Scope to the event, then open **Catering → Guest Engagement → Invitations**.
2. Add the guest list:
   - **Add guest** — name, phone and/or e-mail, and **seats** (how many people that invitation covers). When an e-mail is entered, **Save & send email** stores the guest and immediately sends their invitation;
   - **Import** — upload a sheet of guests and map the columns. Fastest for large lists; check the preview before importing.
3. Select the guests to contact and choose the channel: **Email**, **WhatsApp** or **SMS**. WhatsApp and SMS need the phone number in full international form.
4. Pick the **language** (English or Arabic). Subject and body come from **Settings → Mail → invitation** template, with *{{guest_name}} {{event_name}} {{when}} {{where}} {{seats}} {{link}}* filled in.
5. **Send**. A guest added with an e-mail is sent immediately from the invite form; use the row envelope icon only to resend later. Each guest gets their own tokenised link — never forward one guest's link to another, it identifies them.
6. The guest opens the link (the **Event Pass** page), sees the event details, and **RSVPs** — attending or declining, and confirms how many seats.
7. Attending guests get a **QR attendance pass** on that same page, which is scanned at the door.
8. Watch the **stats strip**: sent / attending / declined / checked-in. Chase non-responders a few days before, and tell the kitchen if the attending count drifts far from the billable guest count.

**Changing the invitation wording:** **Catering → Settings → Mail** — the invitation subject/body per language. The guest pass always shows the logo from **Admin → Branding**.

## Give a client portal access

1. Open **Catering → Guest Engagement → Portal Access** and press **Invite client**.
2. Enter their e-mail (it must match the e-mail on the client record) and send. The invitation links their login to the client record the first time they sign in.
3. From the **Catering Portal** the client can then: see their events, read the **active quote**, **approve** it, see payments and balance, **declare a deposit transfer** and upload proof, and download the quotation, deposit receipt, invoice and final invoice.
4. Control what they see per event under **Booking → Quotes → Client quote visibility** (balance due, service costs, payment history…). Defaults for all events are in **Settings → Lists & Settings**.
5. When they declare a transfer, it lands in **Approvals** as *deposit_pending_verification* — verify it against the bank before recording. See *Take a deposit and get to confirmed*.
`;