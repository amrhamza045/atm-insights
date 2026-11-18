import { Users, ChefHat, Briefcase, UserCheck } from "lucide-react";

export const EMAIL_SETTING_KEY = "email_notifications";
// Lives in Catering settings and is shared with Catering › Equipment › Chain of custody.
export const CUSTODY_KEY = "custody_emails_enabled";

// Automatic emails, grouped by who receives them.
// audience "client": the client, guest or customer always gets it; added people get a copy.
// `reach` names the live list of usual staff recipients (see useEmailRecipients).
// `short` names the usual recipients in summaries; `usual` labels their on/off choice.
export const EMAIL_GROUPS = [
  {
    id: "clients",
    title: "Clients & guests",
    description: "What your catering clients and their event guests receive.",
    icon: Users,
    items: [
      {
        key: "catering_deposit_customer",
        label: "Deposit receipt",
        description: "Confirms the deposit amount, method and reference, with the remaining event balance.",
        when: "A deposit payment is completed",
        to: "The event's client (client email, or their portal sign-in)",
        audience: "client",
        short: "The client",
      },
      {
        key: "rsvp_entry_pass",
        label: "Guest entry pass",
        description: "The guest's QR entry pass for the event door.",
        when: "A guest confirms attendance on their invitation",
        to: "The guest who replied",
        audience: "client",
        short: "The guest",
      },
    ],
  },
  {
    id: "kitchen",
    title: "Kitchen & operations",
    description: "Briefs and alerts that get the team ready for each event.",
    icon: ChefHat,
    items: [
      {
        key: "catering_chef_brief",
        label: "Head Chef kitchen brief",
        description: "Price-free brief with date, venue, headcount and menu items. The WhatsApp and in-app copies go to the Head Chef either way.",
        when: "An event's deposit is fully paid (once per event)",
        to: "The Head Chef",
        reach: "chef",
        short: "Head Chef",
        usual: "Email the Head Chef",
      },
      {
        key: "catering_ops_payment",
        label: "Event confirmed & payment alerts",
        description: "Event details and payment totals, so Operations and Kitchen can plan.",
        when: "The deposit is fully paid, and each later payment is recorded",
        to: "Active staff in an Operations or Kitchen department",
        reach: "operations",
        short: "Operations & Kitchen staff",
        usual: "Send to active staff in an Operations or Kitchen department",
        empty: "No active Operations or Kitchen staff have an email",
      },
      {
        key: CUSTODY_KEY,
        label: "Chain of custody emails",
        description: "Stage assignments, handoff requests and overdue reminders, plus an overdue digest to catering approvers. Same switch as Catering › Equipment.",
        when: "A trip stage is assigned, handed over or overdue",
        to: "The person assigned to each stage, plus the overdue digest",
        reach: "approvers",
        short: "Digest to approvers",
        usual: "Send the overdue digest to staff with the Catering Approve permission",
        empty: "No one holds the Catering Approve permission yet",
        note: "Stage emails always go to the person assigned to each stage. People you add here receive the overdue digest.",
      },
    ],
  },
  {
    id: "management",
    title: "Sales & management",
    description: "Alerts for the people who approve, record and oversee bookings.",
    icon: Briefcase,
    items: [
      {
        key: "catering_quote_decision",
        label: "Client quote decision",
        description: "Tells approvers a client accepted or declined a quote, with the approved total.",
        when: "A client accepts or declines a quote in their portal",
        to: "Staff with the Catering Approve permission",
        reach: "approvers",
        short: "Catering approvers",
        usual: "Send to staff with the Catering Approve permission",
        empty: "No one holds the Catering Approve permission yet",
      },
      {
        key: "catering_deposit_recorder",
        label: "Deposit copy to the recorder",
        description: "A copy of the deposit receipt for the staff member who entered the payment.",
        when: "A deposit payment is completed",
        to: "The staff member who recorded the payment",
        short: "The recorder",
        usual: "Send to the staff member who recorded the payment",
        perEmail: "Decided by who records each deposit.",
      },
      {
        key: "catering_orphan_scan",
        label: "Weekly catering data check",
        description: "Lists records whose event is missing. Read-only; the in-app alert is sent either way.",
        when: "On the day and hour set in Admin › Timezone",
        to: "Staff with the Catering Approve permission",
        reach: "approvers",
        short: "Catering approvers",
        usual: "Send to staff with the Catering Approve permission",
        empty: "No one holds the Catering Approve permission yet",
      },
    ],
  },
  {
    id: "accounts",
    title: "Customer accounts & loyalty",
    description: "Emails for customers who register an account.",
    icon: UserCheck,
    items: [
      {
        key: "registration_approved",
        label: "Welcome email",
        description: "Welcome message with the customer's referral code.",
        when: "A customer completes their account",
        to: "The new customer",
        audience: "client",
        short: "The customer",
      },
      {
        key: "tier_upgrade",
        label: "Tier upgrade",
        description: "Congratulations with the new loyalty tier.",
        when: "A customer reaches a new loyalty tier",
        to: "The upgraded customer",
        audience: "client",
        short: "The customer",
      },
    ],
  },
];

export const EMAIL_ITEMS = EMAIL_GROUPS.flatMap((group) => group.items);
export const SWITCH_KEYS = EMAIL_ITEMS.map((item) => item.key).filter((key) => key !== CUSTODY_KEY);
export const EMAIL_LABEL_BY_KEY = Object.fromEntries(EMAIL_ITEMS.map((item) => [item.key, item.label]));