import { getSupabaseClient } from './index.js';

export async function generateDailyReport(startDate, endDate) {
    try {
        const supabase = getSupabaseClient();
        
        const [
            { data: packages, error: packagesError },
            { data: containers, error: containersError },
            { data: criticalStock, error: stockError }
        ] = await Promise.all([
            supabase
                .from('packages')
                .select('*, customers (name, code)')
                .gte('created_at', startDate)
                .lte('created_at', endDate),
            supabase
                .from('containers')
                .select('*')
                .gte('created_at', startDate)
                .lte('created_at', endDate),
            supabase
                .from('stock_items')
                .select('*')
                .lte('quantity', 5)
                .order('quantity', { ascending: true })
        ]);

        if (packagesError) throw packagesError;
        if (containersError) throw containersError;
        if (stockError) throw stockError;

        return {
            packages,
            containers,
            criticalStock,
            totalPackages: packages.length,
            totalItems: packages.reduce((sum, pkg) => sum + pkg.total_quantity, 0)
        };
    } catch (error) {
        console.error('Error generating report:', error);
        throw new Error('Rapor oluşturulamadı: ' + error.message);
    }
}

export async function saveReport(reportData) {
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('reports')
            .insert([reportData])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error saving report:', error);
        throw new Error('Rapor kaydedilemedi: ' + error.message);
    }
}
