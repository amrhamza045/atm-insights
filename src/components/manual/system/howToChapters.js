import booking from "./chapterHowToBooking";
import stock from "./chapterHowToStock";
import staffing from "./chapterHowToStaffing";
import guests from "./chapterHowToGuests";
import eventDay from "./chapterHowToEventDay";
import releaseSlips from "./chapterHowToReleaseSlips";

// Step-by-step task guides, grouped by the role that performs them.
export const HOWTO_CHAPTERS = [
  { key: "howto-booking", number: "A", title: "Booking, Quoting & Confirming", audience: "Catering / restaurant manager, call centre", content: booking },
  { key: "howto-stock", number: "B", title: "Stock Shortages & Ordering", audience: "Catering manager, inventory & purchasing", content: stock },
  { key: "howto-staffing", number: "C", title: "Staffing, Equipment & Transport", audience: "Catering manager, HR", content: staffing },
  { key: "howto-guests", number: "D", title: "Client & Guest Communication", audience: "Catering manager, call centre", content: guests },
  { key: "howto-event-day", number: "E", title: "Event Day & Closing Out", audience: "Catering manager, finance", content: eventDay },
  { key: "howto-release-slips", number: "F", title: "Kitchen Release Slips", audience: "Inventory, Head Chef, catering staff", content: releaseSlips },
];

// Task index — each entry jumps to the exact procedure heading inside a chapter.
export const HOWTO_TASK_GROUPS = [
  {
    role: "Catering / restaurant manager — selling",
    tasks: [
      { label: "Book an event", chapter: "howto-booking", anchor: "book-an-event" },
      { label: "Create & send a quote", chapter: "howto-booking", anchor: "create-and-send-a-quote" },
      { label: "Take a deposit & confirm", chapter: "howto-booking", anchor: "take-a-deposit-and-get-to-confirmed" },
      { label: "Confirm & start operations", chapter: "howto-booking", anchor: "confirm-and-start-operations" },
      { label: "Cancel an event", chapter: "howto-booking", anchor: "cancel-an-event" },
    ],
  },
  {
    role: "Inventory + Head Chef — physical stock release",
    tasks: [
      { label: "Release a requisition batch", chapter: "howto-release-slips", anchor: "release-a-requisition-batch" },
    ],
  },
  {
    role: "Catering manager + inventory / purchasing — stock",
    tasks: [
      { label: "Resolve a stock shortfall", chapter: "howto-stock", anchor: "resolve-a-stock-shortfall" },
      { label: "Approve a purchase order", chapter: "howto-stock", anchor: "approve-a-purchase-order" },
      { label: "Receive goods & clear the shortfall", chapter: "howto-stock", anchor: "receive-goods-and-clear-the-shortfall" },
      { label: "Check stock before promising it", chapter: "howto-stock", anchor: "check-stock-before-you-promise-it" },
      { label: "Low stock & expiry", chapter: "howto-stock", anchor: "low-stock-and-expiry-day-to-day" },
    ],
  },
  {
    role: "Catering manager — planning & prep",
    tasks: [
      { label: "Staff an event", chapter: "howto-staffing", anchor: "staff-an-event" },
      { label: "Reserve equipment", chapter: "howto-staffing", anchor: "reserve-equipment" },
      { label: "Move equipment (trips & custody)", chapter: "howto-staffing", anchor: "move-equipment-to-the-venue-trips-custody" },
      { label: "Rate staff after the event", chapter: "howto-staffing", anchor: "rate-staff-after-the-event" },
      { label: "Prepare production", chapter: "howto-event-day", anchor: "prepare-production-before-the-day" },
    ],
  },
  {
    role: "Catering manager / call centre — client & guests",
    tasks: [
      { label: "Email a catering document", chapter: "howto-guests", anchor: "email-a-catering-document" },
      { label: "Invite guests & collect RSVPs", chapter: "howto-guests", anchor: "invite-guests-and-collect-rsvps" },
      { label: "Give a client portal access", chapter: "howto-guests", anchor: "give-a-client-portal-access" },
    ],
  },
  {
    role: "Catering manager + finance — event day & closing",
    tasks: [
      { label: "Run the event day", chapter: "howto-event-day", anchor: "run-the-event-day" },
      { label: "Log returned items", chapter: "howto-event-day", anchor: "log-returned-items" },
      { label: "Reconcile & close the event", chapter: "howto-event-day", anchor: "reconcile-and-close-the-event" },
      { label: "Where the numbers show up", chapter: "howto-event-day", anchor: "after-closing-where-the-numbers-show-up" },
      { label: "Daily checklist", chapter: "howto-event-day", anchor: "daily-checklist-for-a-catering-manager" },
    ],
  },
];