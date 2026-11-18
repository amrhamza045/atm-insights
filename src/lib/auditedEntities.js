import { auditConfig, nameOf } from "@/lib/auditCatalog";
import { same, describeChange, short } from "@/lib/auditDiff";

// Records who created / changed / deleted records, from any screen. Which
// records, and which fields count as automatic, is set in auditCatalog.
const countOf = (r) => (typeof r?.updated === "number" ? r.updated : typeof r?.deleted === "number" ? r.deleted : undefined);

export function withAuditedEntities(client) {
  const raw = client.entities;
  let me = null;
  const log = async (action, entity, id, name, description, changes) => {
    try {
      me = me || (await client.auth.me());
      if (!me) return;
      await raw.AuditLog.create({
        admin_id: me.id, admin_email: me.email, action_type: action,
        entity_type: entity, entity_id: id || null, entity_name: name,
        action_description: description, changes, status: "success",
      });
    } catch {
      // never block the user's action on an audit failure
    }
  };

  const wrap = (entity, h, { label, auto, full, private: hidden }) => {
    const onlyAuto = (keys) => keys.every((k) => auto.includes(k));
    return new Proxy(h, {
      get(t, prop) {
        const fn = t[prop];
        if (full && prop === "create") return async (data) => {
          const r = await fn.call(t, data);
          const name = nameOf(r || data);
          log("create", entity, r?.id, name, `Created ${label}${name ? `: ${name}` : ""}`);
          return r;
        };
        if (full && prop === "update") return async (id, data) => {
          const keys = Object.keys(data || {});
          if (onlyAuto(keys)) return fn.call(t, id, data);
          const before = await t.get(id).catch(() => null);
          const r = await fn.call(t, id, data);
          // A form re-saves every field; only the ones that really changed are logged.
          const changed = before ? keys.filter((k) => !same(before[k], data[k])) : keys;
          if (!changed.length) return r;
          const status = changed.includes("status") ? data.status : null;
          const what = changed.length === 1 && status ? `set status to "${status}"`
            : `changed ${changed.map((k) => (hidden ? k : describeChange(k, before?.[k], data[k]))).join(", ")}`;
          const changes = Object.fromEntries(changed.map((k) => [k, hidden ? { changed: true } : { from: short(before?.[k]), to: short(data[k]) }]));
          const name = nameOf(r) || nameOf(before);
          log(status === "rejected" ? "reject" : status === "approved" ? "approve" : "update",
            entity, id, name, `${label}${name ? ` "${name}"` : ""}: ${what}`, changes);
          return r;
        };
        if (full && prop === "delete") return async (id) => {
          const before = await t.get(id).catch(() => null);
          const r = await fn.call(t, id);
          const name = nameOf(before);
          log("delete", entity, id, name, `Deleted ${label}${name ? `: ${name}` : ""}`);
          return r;
        };
        if (full && prop === "bulkCreate") return async (rows) => {
          const r = await fn.call(t, rows);
          log("create", entity, null, null, `Created ${rows?.length || 0} ${label} record(s)`);
          return r;
        };
        if (prop === "bulkUpdate") return async (rows) => {
          const r = await fn.call(t, rows);
          const keys = [...new Set((rows || []).flatMap((row) => Object.keys(row || {}).filter((k) => k !== "id")))];
          if (rows?.length && !onlyAuto(keys)) log("update", entity, null, null, `Bulk-edited ${rows.length} ${label} record(s): changed ${keys.join(", ")}`);
          return r;
        };
        if (prop === "updateMany") return async (query, ops) => {
          const r = await fn.call(t, query, ops);
          const keys = [...new Set(Object.entries(ops || {}).flatMap(([k, v]) => (k.startsWith("$") ? Object.keys(v || {}) : [k])))];
          const n = countOf(r);
          if (n !== 0 && !onlyAuto(keys)) log("update", entity, null, null, `Bulk-edited ${n ?? "the matching"} ${label} record(s): changed ${keys.join(", ")}`, { filter: short(query) });
          return r;
        };
        if (prop === "deleteMany") return async (query) => {
          const r = await fn.call(t, query);
          const n = countOf(r);
          if (n !== 0) log("delete", entity, null, null, `Bulk-deleted ${n ?? "the matching"} ${label} record(s)`, { filter: short(query) });
          return r;
        };
        return typeof fn === "function" ? fn.bind(t) : fn;
      },
    });
  };

  client.entities = new Proxy(raw, {
    get(t, entity) {
      const h = t[entity];
      const cfg = typeof entity === "string" && h && typeof h === "object" ? auditConfig(entity) : null;
      return cfg ? wrap(entity, h, cfg) : h;
    },
  });
  return client;
}