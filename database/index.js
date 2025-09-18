/// Supabase initialization and configuration
const SUPABASE_URL = 'https://viehnigcbosgsxgehgnn.supabase.co';
let SUPABASE_ANON_KEY = null;
let supabase = null;

export { SUPABASE_URL, SUPABASE_ANON_KEY, supabase };

export function getSupabaseClient() {
    if (!supabase) {
        return initializeSupabase();
    }
    return supabase;
}

export function initializeSupabase() {
    if (supabase && SUPABASE_ANON_KEY) {
        return supabase;
    }
    
    if (!SUPABASE_ANON_KEY) {
        console.warn('Supabase API key not set');
        return null;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase client initialized successfully');
        return supabase;
    } catch (error) {
        console.error('Supabase initialization error:', error);
        return null;
    }
}

export function isSupabaseReady() {
    return supabase !== null && SUPABASE_ANON_KEY !== null;
}
