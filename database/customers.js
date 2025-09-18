import { getSupabaseClient } from './index.js';

export async function fetchCustomers() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching customers:', error);
        throw new Error('Müşteriler yüklenemedi: ' + error.message);
    }
}

export async function addCustomer(customerData) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('customers')
            .insert([customerData])
            .select();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error adding customer:', error);
        throw new Error('Müşteri eklenemedi: ' + error.message);
    }
}

export async function deleteCustomer(customerId) {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);

        if (error) throw error;
    } catch (error) {
        console.error('Error deleting customer:', error);
        throw new Error('Müşteri silinemedi: ' + error.message);
    }
}
