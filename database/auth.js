import { getSupabaseClient } from './index.js';

export async function loginUser(email, password) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error(`Giriş başarısız: ${error.message}`);
    }
}

export async function logoutUser() {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    } catch (error) {
        console.error('Logout error:', error);
        throw new Error(`Çıkış yapılırken hata oluştu: ${error.message}`);
    }
}

export async function getCurrentUser() {
    try {
        const supabase = getSupabaseClient();
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Get user error:', error);
        throw new Error(`Kullanıcı bilgileri alınamadı: ${error.message}`);
    }
}

export async function getUserRole(email) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('personnel')
            .select('role, name')
            .eq('email', email)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Get user role error:', error);
        return { role: 'operator', name: email.split('@')[0] };
    }
}

export function setupAuthListener(callback) {
    const supabase = getSupabaseClient();
    return supabase.auth.onAuthStateChange((event, session) => {
        if (callback) callback(event, session);
    });
}
