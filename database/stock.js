import { getSupabaseClient } from './index.js';

export async function fetchStockItems() {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('stock_items')
            .select('*')
            .order('name');

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching stock items:', error);
        throw new Error('Stok verileri yüklenemedi: ' + error.message);
    }
}

export async function updateStockItem(itemCode, newQuantity) {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('stock_items')
            .update({ 
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('code', itemCode);

        if (error) throw error;
    } catch (error) {
        console.error('Error updating stock item:', error);
        throw new Error('Stok güncellenemedi: ' + error.message);
    }
}
