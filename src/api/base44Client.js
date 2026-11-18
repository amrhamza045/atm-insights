import { base44 as supabaseBase44, supabase } from '@/lib/supabaseClient';
import { withAuditedEntities } from '@/lib/auditedEntities';

// Client wrapping Supabase with audit logging
export const base44 = withAuditedEntities(supabaseBase44);
export { supabase };
export default base44;
