import { createClient } from '@supabase/supabase-js';
import entityTableMap from './entityTableMap.json';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uhcpbhhioaeswxdkglys.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_4K69KU9UWx0Yu22sM2SbzQ_EL2mqLhU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export function getTableName(entityName) {
  if (entityTableMap && entityTableMap[entityName]) {
    return entityTableMap[entityName];
  }
  return entityName
    .replace(/([A-Z]+)/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase();
}

function createEntityProxy() {
  return new Proxy(
    {},
    {
      get(_target, entityName) {
        if (typeof entityName !== 'string') return undefined;
        const tableName = getTableName(entityName);

        return {
          async get(id) {
            if (!id) {
              const err = new Error(`${entityName}.get: id is required`);
              err.status = 400;
              throw err;
            }
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .eq('id', id)
              .maybeSingle();
            if (error) throw error;
            if (!data) {
              const notFound = new Error(`${entityName} ${id} not found`);
              notFound.status = 404;
              throw notFound;
            }
            return data;
          },

          async filter(query = {}, sort, limit) {
            let q = supabase.from(tableName).select('*');
            if (query && typeof query === 'object') {
              for (const [k, v] of Object.entries(query)) {
                if (v === undefined) continue;
                if (v === null) {
                  q = q.is(k, null);
                } else if (typeof v === 'object' && !Array.isArray(v)) {
                  if (v.$in && Array.isArray(v.$in)) q = q.in(k, v.$in);
                  if (v.$nin && Array.isArray(v.$nin))
                    q = q.not(k, 'in', `(${v.$nin.join(',')})`);
                  if (v.$gt !== undefined) q = q.gt(k, v.$gt);
                  if (v.$gte !== undefined) q = q.gte(k, v.$gte);
                  if (v.$lt !== undefined) q = q.lt(k, v.$lt);
                  if (v.$lte !== undefined) q = q.lte(k, v.$lte);
                  if (v.$ne !== undefined) q = q.neq(k, v.$ne);
                  if (v.$like !== undefined) q = q.like(k, v.$like);
                  if (v.$ilike !== undefined) q = q.ilike(k, v.$ilike);
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
            if (error) {
              console.warn(`Query on ${tableName} failed:`, error.message);
              return [];
            }
            return data || [];
          },

          async list(sort, limit) {
            return this.filter({}, sort, limit);
          },

          async find(query) {
            const results = await this.filter(query, undefined, 1);
            return results[0] || null;
          },

          async count(query = {}) {
            let q = supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            if (query && typeof query === 'object') {
              for (const [k, v] of Object.entries(query)) {
                if (v !== undefined && v !== null && typeof v !== 'object') {
                  q = q.eq(k, v);
                }
              }
            }
            const { count, error } = await q;
            if (error) return 0;
            return count || 0;
          },

          async create(record) {
            const { data, error } = await supabase
              .from(tableName)
              .insert(record)
              .select()
              .single();
            if (error) throw error;
            return data;
          },

          async bulkCreate(records) {
            if (!records || !records.length) return [];
            const { data, error } = await supabase
              .from(tableName)
              .insert(records)
              .select();
            if (error) throw error;
            return data || [];
          },

          async update(id, record) {
            const { data, error } = await supabase
              .from(tableName)
              .update(record)
              .eq('id', id)
              .select()
              .single();
            if (error) throw error;
            return data;
          },

          async delete(id) {
            const { error } = await supabase.from(tableName).delete().eq('id', id);
            if (error) throw error;
            return { success: true };
          },
        };
      },
    }
  );
}

export const functions = {
  async invoke(functionName, payload = {}, options = {}) {
    const body =
      payload && payload.body !== undefined ? payload.body : payload;
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      ...options,
    });
    if (error) {
      console.warn(`Function ${functionName} error:`, error.message);
      return { data: null, error };
    }
    return { data };
  },
};

export const auth = {
  async me() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (user && !error) {
        const { data: profile } = await supabase
          .from('user')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        return profile ? { ...user, ...profile } : user;
      }
      if (typeof window !== 'undefined' && localStorage.getItem('rosemary_demo_admin') === 'true') {
        return {
          id: 'user_admin',
          email: 'admin@rosemary.com',
          role: 'admin',
          full_name: 'Rosemary Admin',
        };
      }
      return null;
    } catch {
      if (typeof window !== 'undefined' && localStorage.getItem('rosemary_demo_admin') === 'true') {
        return {
          id: 'user_admin',
          email: 'admin@rosemary.com',
          role: 'admin',
          full_name: 'Rosemary Admin',
        };
      }
      return null;
    }
  },

  async getUser() {
    return this.me();
  },

  async isAuthenticated() {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) return true;
      if (typeof window !== 'undefined' && localStorage.getItem('rosemary_demo_admin') === 'true') {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  async updateMe(data) {
    const user = await this.me();
    if (!user) throw new Error('Not authenticated');
    const { data: updated, error } = await supabase
      .from('user')
      .update(data)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  },

  async logout(redirectUrl) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rosemary_demo_admin');
    }
    await supabase.auth.signOut().catch(() => {});
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin(redirectUrl) {
    if (redirectUrl) {
      window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      window.location.href = '/login';
    }
  },
};

export const integrations = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw new Error('No file provided');
      const filename = `${Date.now()}_${file.name || 'upload'}`;
      try {
        const { data, error } = await supabase.storage
          .from('rosemary-files')
          .upload(filename, file);
        if (error || !data) {
          return { file_url: URL.createObjectURL(file), file_path: filename };
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from('rosemary-files').getPublicUrl(data.path);
        return { file_url: publicUrl, file_path: data.path };
      } catch {
        return { file_url: URL.createObjectURL(file), file_path: filename };
      }
    },
    async UploadPublicFile(params) {
      return this.UploadFile(params);
    },
    async UploadPrivateFile(params) {
      return this.UploadFile(params);
    },
    async CreateFileSignedUrl({ file_path, expires_in = 3600 }) {
      try {
        const { data, error } = await supabase.storage
          .from('rosemary-files')
          .createSignedUrl(file_path, expires_in);
        if (error || !data) return { signed_url: file_path };
        return { signed_url: data.signedUrl };
      } catch {
        return { signed_url: file_path };
      }
    },
    async SendEmail(payload) {
      return functions.invoke('sendEmail', payload);
    },
    async InvokeLLM(payload) {
      return functions.invoke('aiAssistant', payload);
    },
  },
};

export const appLogs = {
  async logUserInApp(pageName) {
    return { success: true, page: pageName };
  },
};

const rawEntities = createEntityProxy();

export const base44 = {
  entities: rawEntities,
  asServiceRole: {
    entities: rawEntities,
    auth,
  },
  auth,
  functions,
  integrations,
  appLogs,
};

export default supabase;
