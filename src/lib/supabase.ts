import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'castell-auth-token' // Usar una clave específica para evitar colisiones
    }
});
// Para Server Actions (SSR/Server side)
export const createServerClient = () => {
    return createClient(supabaseUrl, supabaseAnonKey);
};
