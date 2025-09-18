import { getSupabaseClient } from './index.js';

export async function fetchPackages() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('packages')
            .select('*, customers (name, code)')
            .is('container_id', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching packages:', error);
        throw new Error('Paketler yüklenemedi: ' + error.message);
    }
}

export async function createPackage(packageData) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('packages')
            .insert([packageData])
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error creating package:', error);
        throw new Error('Paket oluşturulamadı: ' + error.message);
    }
}

export async function deletePackages(packageIds) {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('packages')
            .delete()
            .in('id', packageIds);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting packages:', error);
        throw new Error('Paketler silinemedi: ' + error.message);
    }
}
