import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { entityTableMap } from './entityTableMap.ts';
import { corsHeaders } from './cors.ts';

export { corsHeaders };

export function createClientFromRequest(req: Request) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || supabaseServiceKey;

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const userClient = token
    ? createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      })
    : serviceClient;

  function createEntityProxy(sb: SupabaseClient) {
    return new Proxy({} as any, {
      get(_target, entityName: string) {
        const tableName = entityTableMap[entityName] || entityName.replace(/([A-Z]+)/g, '_$1').replace(/^_/, '').toLowerCase();
        return {
          async get(id: string) {
            const { data, error } = await sb.from(tableName).select('*').eq('id', id).maybeSingle();
            if (error) throw error;
            if (!data) {
              const notFound = new Error(`${entityName} ${id} not found`);
              (notFound as any).status = 404;
              throw notFound;
            }
            return data;
          },
          async filter(query: any = {}, sort?: string, limit?: number) {
            let q = sb.from(tableName).select('*');
            if (query && typeof query === 'object') {
              for (const [k, v] of Object.entries(query)) {
                if (v === undefined) continue;
                if (v === null) {
                  q = q.is(k, null);
                } else if (typeof v === 'object' && !Array.isArray(v)) {
                  const ops = v as Record<string, any>;
                  if (ops.$in) q = q.in(k, ops.$in);
                  if (ops.$nin) q = q.not(k, 'in', `(${ops.$nin.join(',')})`);
                  if (ops.$gt !== undefined) q = q.gt(k, ops.$gt);
                  if (ops.$gte !== undefined) q = q.gte(k, ops.$gte);
                  if (ops.$lt !== undefined) q = q.lt(k, ops.$lt);
                  if (ops.$lte !== undefined) q = q.lte(k, ops.$lte);
                  if (ops.$ne !== undefined) q = q.neq(k, ops.$ne);
                  if (ops.$like !== undefined) q = q.like(k, ops.$like);
                  if (ops.$ilike !== undefined) q = q.ilike(k, ops.$ilike);
                } else if (Array.isArray(v)) {
                  q = q.in(k, v);
                } else {
                  q = q.eq(k, v);
                }
              }
            }
            if (sort && typeof sort === 'string') {
              const descending = sort.startsWith('-');
              const cleanSort = sort.replace(/^[-+]/, '');
              q = q.order(cleanSort, { ascending: !descending });
            }
            if (typeof limit === 'number') {
              q = q.limit(limit);
            }
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
          },
          async list(sort?: string, limit?: number) {
            return this.filter({}, sort, limit);
          },
          async create(record: any) {
            const { data, error } = await sb.from(tableName).insert(record).select().single();
            if (error) throw error;
            return data;
          },
          async bulkCreate(records: any[]) {
            if (!records || !records.length) return [];
            const { data, error } = await sb.from(tableName).insert(records).select();
            if (error) throw error;
            return data || [];
          },
          async update(id: string, record: any) {
            const { data, error } = await sb.from(tableName).update(record).eq('id', id).select().single();
            if (error) throw error;
            return data;
          },
          async delete(id: string) {
            const { error } = await sb.from(tableName).delete().eq('id', id);
            if (error) throw error;
            return { success: true };
          },
        };
      }
    });
  }

  const auth = {
    async me() {
      if (!token) return null;
      const { data: { user }, error } = await serviceClient.auth.getUser(token);
      if (error || !user) return null;
      const { data: appUser } = await serviceClient.from('user').select('*').eq('id', user.id).maybeSingle();
      return appUser ? { ...user, ...appUser } : user;
    }
  };

  return {
    auth,
    entities: createEntityProxy(userClient),
    asServiceRole: {
      entities: createEntityProxy(serviceClient),
      auth,
    },
  };
}
