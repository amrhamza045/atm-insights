// Writes one manual module section by section. Each section gets an AI call
// of its own and comes back as plain markdown, so a long, fully detailed
// chapter keeps its line breaks and never has to share one answer's length.
import { FINANCE_STATUS_LABELS } from './manualStructure.js';

const SECTIONS = {
  description: "Overview in 3-5 paragraphs: the module's purpose, who uses it, where it sits (`domain`, `chapter` and `nav`), and how it connects to the modules in `links`.",
  benefits_and_features: "Cover EVERY item in `features`, grouped under ### sub-headings; each a bullet with a **bold** name, what it does and the business outcome it drives (revenue, cost control, efficiency, customer satisfaction, compliance).",
  max_benefit_strategy: "At least 6 numbered strategies, each with a **bold** title and the concrete workflow (tabs, buttons and settings from `screens` and `workflows`) that delivers it. Include at least one strategy about using the module together with Finance, based only on `finance`.",
  cautions: "At least 8 specific warnings as bullets with a **bold** lead, drawn from the statuses, gates, approvals and rules in `screens`, `workflows`, `access` and `finance.controls`: what goes wrong and how to avoid it.",
  required_accurate_data: "For EVERY entity in `entities`, a ### heading with the entity name, then bullets of its key fields and why each must be accurate (include the financial consequence where `finance` names that field).",
  usage_guide: "Staff training guide. Start with a short 'Where to find it' line using `nav`. Then, for EVERY item in `screens`, a ### heading named after the screen, with numbered, click-by-click steps using the exact tab, button and field names given, and what the user sees. Then, for EVERY item in `workflows`, a ### heading walking that workflow end to end: each status in order, who acts at each step and the permission they need (from `access`).",
  finance_integration: "How this module connects to the Finance module, for the finance team linking Finance with the whole system. Use these ### headings in this order: 'Link status' (state `finance_status_label` and explain `finance.summary`), 'Money and cost events' (a bullet per item of `finance.events`: the event, the record and fields that carry the amount, and when it happens; write 'None' if empty), 'Ledger postings' (a bullet per item of `finance.postings`, keeping debit / credit accounts exactly as given and clearly separating what posts today from what is 'Not built yet'), 'Controls and reconciliation' (a bullet per item of `finance.controls`, plus one bullet on which Finance screen to reconcile against when `finance_status` is posts or reported), 'Related modules' (the modules in `links` and why each matters to the money flow).",
};

export const MANUAL_SECTION_KEYS = Object.keys(SECTIONS);

const facts = (mod) => ({
  domain: mod.domain, chapter: mod.chapter, nav: mod.nav,
  screens: mod.screens, workflows: mod.workflows, features: mod.features,
  access: mod.access, entities: mod.entities, links: mod.links || [],
  finance_status: mod.finance?.status, finance_status_label: FINANCE_STATUS_LABELS[mod.finance?.status],
  finance: mod.finance,
});

const sectionPrompt = (brand, mod, guide, langInstruction) => [
  `You are writing the official user manual for "VeraKit360", the platform powering ${brand} restaurant and catering operations.`,
  `Module: "${mod.name}". Its facts:`,
  JSON.stringify(facts(mod), null, 2),
  '',
  'Write ONLY the section described below, as professional markdown: ### headings on their own lines, bullets (-), numbered lists (1.), **bold**, and a blank line between blocks. No title for the section itself and no preamble.',
  'Use only the facts above. Never invent screens, buttons, integrations, accounts, numbers or permissions.',
  langInstruction,
  '',
  'Section: ' + guide
].join('\n');

export async function generateSoloModule(base44, mod, brand, langInstruction) {
  const write = async (guide) => {
    const call = () => base44.asServiceRole.integrations.Core.InvokeLLM({ prompt: sectionPrompt(brand, mod, guide, langInstruction) });
    const text = await call().catch(() => call());
    return String(text || '').trim();
  };
  const texts = await Promise.all(MANUAL_SECTION_KEYS.map((field) => write(SECTIONS[field])));
  if (texts.some((text) => !text)) throw new Error('A section came back empty');
  return Object.fromEntries(MANUAL_SECTION_KEYS.map((field, i) => [field, texts[i]]));
}