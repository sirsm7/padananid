/**
 * Modul: Integrasi Supabase (Service)
 * Folder: /src/js/services/supabase.js
 * Fungsi: Menguruskan hubungan, pengesahan, dan penarikan data.
 * Arkitek: Pro Web Caster (Strategi Chunking/Pagination)
 */

const SUPABASE_CONFIG = {
    URL: 'https://app.tech4ag.my',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY'
};

const supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.URL,
    SUPABASE_CONFIG.ANON_KEY
);

export const checkSupabaseConnection = async () => {
    try {
        const { error } = await supabaseClient.from('delima_salinan_admin').select('id').limit(1);
        if (error) {
            console.error("Ralat Sambungan Supabase:", error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error("Ralat Kritikal Sistem Supabase:", err);
        return false;
    }
};

export const fetchSchoolsList = async () => {
    try {
        const { data, error } = await supabaseClient
            .from('delima_data_sekolah')
            .select('kod_ou, nama_sekolah')
            .order('nama_sekolah', { ascending: true });

        if (error) throw new Error(`Gagal menarik senarai sekolah: ${error.message}`);
        return data || [];
    } catch (err) {
        console.error("Ralat Fetch Schools:", err);
        throw err;
    }
};

export const fetchDelimaDataByOU = async (kodOU) => {
    try {
        if (!kodOU) throw new Error("Parameter kod OU diperlukan.");

        const { data, error } = await supabaseClient
            .from('delima_salinan_admin')
            .select('id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status')
            .ilike('ou', `%${kodOU}%`);

        if (error) throw new Error(`Gagal menarik data sekolah spesifik: ${error.message}`);
        return data || [];
    } catch (err) {
        console.error("Ralat Fetch Data By OU:", err);
        throw err;
    }
};

/**
 * [KEMAS KINI] Menarik SEMUA baki data secara berperingkat (Chunking) untuk Fallback.
 * Ini memastikan tiada rekod tertinggal disebabkan isu 'case-sensitivity' atau 'spacing' di pangkalan data.
 * @returns {Promise<Array>} - Seluruh jadual rekod pelajar.
 */
export const fetchFallbackData = async () => {
    try {
        let allFallbackData = [];
        let limit = 1000; // Had maksimum Supabase per request
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status')
                .range(offset, offset + limit - 1);

            if (error) {
                console.warn("Amaran Fallback Fetch (Chunk):", error.message);
                break; // Keluar dari loop jika ralat, tapi kekalkan data yang berjaya ditarik
            }

            if (data && data.length > 0) {
                allFallbackData = allFallbackData.concat(data);
                offset += limit;
                
                // Jika data yang diterima kurang daripada limit, bermakna kita dah sampai hujung jadual
                if (data.length < limit) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        return allFallbackData;
    } catch (err) {
        console.error("Ralat Kritikal Fallback Fetch:", err);
        return []; 
    }
};

export { supabaseClient };