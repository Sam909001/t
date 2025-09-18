import { getSupabaseClient } from './index.js';

export async function fetchContainers(filter = 'all') {
    try {
        const supabase = getSupabaseClient();
        let query = supabase
            .from('containers')
            .select('*, packages (id, package_no, total_quantity, customers (name, code))');

        if (filter !== 'all') {
            query = query.eq('status', filter);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching containers:', error);
        throw new Error('Konteynerler yüklenemedi: ' + error.message);
    }
}

export async function createContainer(containerData) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('containers')
            .insert([containerData])
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating container:', error);
        throw new Error('Konteyner oluşturulamadı: ' + error.message);
    }
}
