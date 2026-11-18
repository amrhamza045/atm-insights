import { Facebook, Instagram, Linkedin, MessageCircle, Music2 } from "lucide-react";

// Webhook URLs are pasted into Meta, Twilio, Zapier or Make, so they must point at the published
// app, never at the preview.
const PUBLISHED_APP_URL = "https://rosemary.base44.app";
const functionUrl = (name, query = "") => `${PUBLISHED_APP_URL}/functions/${name}${query}`;

const META_SECRETS = ["META_APP_SECRET", "META_VERIFY_TOKEN", "META_PAGE_ACCESS_TOKEN"];
const FORWARD_SECRETS = ["SOCIAL_LEADS_WEBHOOK_SECRET"];

const forwardingSteps = (trigger) => [
  `Create a Zap in Zapier (or a scenario in Make) that starts with "${trigger}".`,
  'Add a "Webhooks → POST" step that sends JSON to the URL below, with YOUR_SECRET replaced by the value saved as SOCIAL_LEADS_WEBHOOK_SECRET.',
  "Map the fields full_name, email, phone, company, campaign, message and lead_id.",
  "Switch Enabled on and press Save. The card turns Connected when the first lead arrives.",
];

export const SOCIAL_PLATFORMS = [
  {
    key: "facebook",
    label: "Facebook",
    icon: Facebook,
    iconBg: "bg-blue-600",
    accountLabel: "Page name",
    accountPlaceholder: "e.g. Your Catering",
    idLabel: "Page ID",
    appLabel: "Meta App ID",
    method: "Meta webhook: lead form ads and Messenger messages",
    webhookUrl: functionUrl("metaLeadsWebhook"),
    verifyToken: true,
    secrets: META_SECRETS,
    steps: [
      "In Meta for Developers, create a Business app and add the Webhooks product.",
      "Under Webhooks → Page, paste the URL below and your verify token, then subscribe to leadgen and messages.",
      "In Meta Business Settings → System users, give a system user your Page and ad account, then generate a never-expiring token with leads_retrieval, pages_manage_metadata, pages_show_list, pages_read_engagement, pages_messaging and ads_management.",
      "Save the App secret, the verify token and that token in the app's Secrets under the names listed above.",
      "Enter your Page ID, switch Enabled on and press Check connection: it saves the card and links your Page.",
      "Send a test lead with Meta's Lead Ads Testing Tool.",
    ],
  },
  {
    key: "instagram",
    label: "Instagram",
    icon: Instagram,
    iconBg: "bg-gradient-to-br from-pink-500 to-orange-400",
    accountLabel: "Instagram account",
    accountPlaceholder: "e.g. @yourbrand",
    idLabel: "Instagram account ID",
    appLabel: "Meta App ID",
    method: "Meta webhook: Instagram lead form ads and direct messages",
    webhookUrl: functionUrl("metaLeadsWebhook"),
    verifyToken: true,
    secrets: META_SECRETS,
    steps: [
      "Link your Instagram professional account to the Facebook Page set up on the Facebook card (same Meta app and token).",
      "In that Meta app, under Webhooks → Instagram, paste the URL below and the same verify token, then subscribe to messages.",
      "Add instagram_basic and instagram_manage_messages to the system user token.",
      "Instagram lead form ads arrive through the Facebook Page and are labelled Instagram here.",
      "Switch Enabled on and press Check connection.",
    ],
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    icon: MessageCircle,
    iconBg: "bg-green-600",
    accountLabel: "Business name",
    accountPlaceholder: "e.g. Your Catering",
    idLabel: "WhatsApp number",
    idPlaceholder: "e.g. +201001234567",
    method: "Twilio webhook: every incoming WhatsApp message",
    webhookUrl: functionUrl("captureWhatsAppLead"),
    secrets: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_NUMBER"],
    steps: [
      "In the Twilio Console, register your WhatsApp sender (Messaging → Senders → WhatsApp senders).",
      "Open the sender and set its webhook for incoming messages to the URL below (HTTP POST).",
      "Save the Account SID, Auth Token and WhatsApp number in the app's Secrets. The same number sends the app's WhatsApp notifications.",
      "Switch Enabled on, press Save, then send a WhatsApp message to the number: it appears in Social leads.",
      "Messages from the same number within an hour are added to one lead.",
    ],
  },
  {
    key: "tiktok",
    label: "TikTok",
    icon: Music2,
    iconBg: "bg-slate-900",
    accountLabel: "Advertiser name",
    accountPlaceholder: "e.g. Your Catering",
    idLabel: "Advertiser ID",
    method: "Zapier or Make: TikTok only sends lead webhooks to approved partner apps",
    webhookUrl: functionUrl("ingestSocialLead", "?platform=tiktok&secret=YOUR_SECRET"),
    secrets: FORWARD_SECRETS,
    steps: forwardingSteps("TikTok Lead Generation → New Lead"),
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    icon: Linkedin,
    iconBg: "bg-sky-700",
    accountLabel: "Company page",
    accountPlaceholder: "e.g. Your Catering",
    idLabel: "Organisation ID",
    method: "Zapier or Make: LinkedIn only sends lead webhooks to approved partner apps",
    webhookUrl: functionUrl("ingestSocialLead", "?platform=linkedin&secret=YOUR_SECRET"),
    secrets: FORWARD_SECRETS,
    steps: forwardingSteps("LinkedIn Lead Gen Forms → New Form Response"),
  },
];