import { corsHeaders } from '../_shared/cors.ts';
import {  createClientFromRequest  } from '../_shared/base44Client.ts';
import { denyUnlessPermitted } from '../_shared/requirePermission.js';
import { loadBrandName } from '../_shared/brand.js';
import { MANUAL_MODULES } from '../_shared/manualCatalog.js';
import { generateSoloModule } from '../_shared/manualSoloModule.js';

// Writes the VeraKit360 module manual. The module facts (domain › chapter ›
// module, screens, workflows, access, entities, Finance link) live in the
// shared manual* files: update them when features change, then regenerate.
//
// Body: { language, list_modules } lists the catalog; { language, prune }
// deletes chapters of modules no longer in the catalog; { language,
// selected_modules } writes those modules (the screen sends a few at a time).

const LANG = {
  ar: 'Write ALL content in Arabic (Egyptian-friendly MSA). Keep entity names, field names, permission keys and account numbers in English (they are system identifiers). All headings, descriptions, steps and explanations must be in Arabic.',
  en: 'Write ALL content in English.',
};

async function handler(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const denied = await denyUnlessPermitted(base44, user, 'admin_settings');
    if (denied) return denied;

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const language = body.language === 'ar' ? 'ar' : 'en';
    const store = base44.asServiceRole.entities.VeraKit360ManualSection;

    if (body.list_modules) {
      return Response.json({
        modules: MANUAL_MODULES.map((m) => ({ name: m.name, category: m.domain, domain: m.domain, chapter: m.chapter, chapter_code: m.chapter_code, finance_status: m.finance?.status })),
      });
    }

    if (body.prune) {
      const names = MANUAL_MODULES.map((m) => m.name);
      const result = await store.deleteMany({ language, module_name: { $nin: names } });
      return Response.json({ success: true, language, pruned: result?.deleted ?? result?.count ?? 0 });
    }

    const selected = Array.isArray(body.selected_modules) && body.selected_modules.length > 0 ? new Set(body.selected_modules) : null;
    const targets = selected ? MANUAL_MODULES.filter((m) => selected.has(m.name)) : MANUAL_MODULES;
    if (targets.length === 0) return Response.json({ error: 'No matching modules selected' }, { status: 400 });

    const brand = await loadBrandName(base44);
    const order = Object.fromEntries(MANUAL_MODULES.map((m, i) => [m.name, i]));
    const written = [];
    const failed = [];

    await Promise.all(targets.map(async (mod) => {
      let sections;
      try {
        sections = await generateSoloModule(base44, mod, brand, LANG[language]);
      } catch (err) {
        console.log('Module ' + mod.name + ' failed: ' + err.message);
        failed.push(mod.name);
        return;
      }
      // Replace the old chapter only once the new one is ready; keep its screenshots.
      const existing = await store.filter({ language, module_name: mod.name });
      const screenshots = existing.find((s) => s.screenshot_urls?.length)?.screenshot_urls || [];
      if (existing.length) await store.deleteMany({ language, module_name: mod.name });
      await store.create({
        module_name: mod.name,
        category: mod.domain,
        domain: mod.domain,
        chapter: mod.chapter,
        chapter_code: mod.chapter_code,
        nav_path: mod.nav,
        language,
        ...sections,
        finance_status: mod.finance?.status,
        linked_modules: mod.links || [],
        related_entities: (mod.entities || []).map((e) => e.name),
        screenshot_urls: screenshots,
        order: order[mod.name],
        last_updated: new Date().toISOString(),
      });
      written.push(mod.name);
    }));

    if (written.length === 0) {
      return Response.json({ error: 'Generation failed for: ' + failed.join(', ') + '. The existing chapters were kept. Please try again.' }, { status: 500 });
    }
    return Response.json({ success: true, language, count: written.length, modules: written, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  try {
    const res = await handler(req);
    const newHeaders = new Headers(res.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      newHeaders.set(k, v);
    }
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  } catch (err: any) {
    return Response.json({ error: err.message || String(err) }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
