// Every module of the VeraKit360 module manual, in manual order:
// domain order, then chapter order, then the order inside each module file.
import { DOMAINS } from './manualStructure.js';
import { CATERING_MODULES } from './manualCateringModules.js';
import { SALES_MODULES } from './manualModulesSales.js';
import { SUPPLY_MODULES } from './manualModulesSupply.js';
import { PEOPLE_MODULES } from './manualModulesPeople.js';
import { FINANCE_MODULES } from './manualModulesFinance.js';
import { ANALYTICS_MODULES } from './manualModulesAnalytics.js';
import { ADMIN_MODULES } from './manualModulesAdmin.js';

const ALL = [
  ...CATERING_MODULES, ...SALES_MODULES, ...SUPPLY_MODULES, ...PEOPLE_MODULES,
  ...FINANCE_MODULES, ...ANALYTICS_MODULES, ...ADMIN_MODULES,
];

const rank = (m) => {
  const d = DOMAINS.findIndex((x) => x.label === m.domain);
  const c = DOMAINS[d].chapters.findIndex((x) => x.label === m.chapter);
  return d * 100 + c;
};

export const MANUAL_MODULES = ALL
  .map((m, i) => ({ m, i }))
  .sort((a, b) => rank(a.m) - rank(b.m) || a.i - b.i)
  .map(({ m }) => m);

// Every related-module name must exist, so the manual's links never break.
const names = new Set(MANUAL_MODULES.map((m) => m.name));
for (const m of MANUAL_MODULES) {
  for (const link of m.links || []) {
    if (!names.has(link)) throw new Error(`Manual module "${m.name}" links to unknown module "${link}"`);
  }
}