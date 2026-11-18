export default `
# F. Kitchen Release Slips

**Who does this:** Inventory releases batches; the Head Chef confirms receipt; catering staff can view.
**Where:** **Inventory → Requested Items** (release), **Kitchen Display → Requisitions** (receipt). Every slip is listed under **Catering → Planning & Prep → Release Slips**.

Release slips are the stock-issue records of the event's Stock Release Slip Requisition: one slip per dated batch. There is no separate release-slip approval or fulfilment step.

## Release a requisition batch

1. Planning the event creates its draft requisition from the reserved stock. The Head Chef reviews it on the Kitchen Display, adds any extra items and submits it to Inventory.
2. Inventory confirms, edits or declines every line in **Inventory → Requested Items**. Once every line is agreed, the requisition is scheduled and batch 1 is created for the event date. Either side can propose splitting the remaining quantities into more batches or moving their dates.
3. When a batch is due, open the requisition in **Requested Items**, go to **Batches** and press **Release batch**.
4. Enter what you actually issue for each line: the full batch quantity, less, or zero. Less than the batch quantity is recorded as a variance and nothing stays held. The system refuses more than is on hand.
5. Press **Release & issue stock** once. Stock is deducted, the batch reservations are marked consumed and the slip becomes **Released**.
6. The Head Chef opens the requisition on the Kitchen Display, goes to **Batches** and presses **Confirm received** (optionally with a shortage comment). The slip becomes **Received**.
7. Use the **Arabic PDF** button on any release-slip card to download an Arabic, right-to-left printable copy with the event details, material lines, quantities and a signature area.

## If the event is cancelled or its reservations are released

Unreleased batches are voided with the requisition and no inventory is deducted. Released batches stay as the record that stock was issued.

## Permission check

Releasing needs **Release Batches**; replying to lines needs **Inventory: Respond**; submitting and confirming receipt need **Chef: Request & Receive**. Admin status alone grants none of these.

## Old release slips

Slips from the retired release-slip-only flow are read-only history. They can't be fulfilled or edited.
`;