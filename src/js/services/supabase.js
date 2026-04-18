/**
 * Modul: Integrasi Supabase (Service)
 * Folder: /src/js/services/supabase.js
 * Fungsi: Menguruskan hubungan, pengesahan, dan penarikan data spesifik.
 * Arkitek: Pro Web Caster (Strategi Wildcard / Memory Fix)
 */

// ============================================================================
// KELAYAKAN SUPABASE SEBENAR (TELAH DISEMAK)
// ============================================================================
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
 * [RESOLUSI PEPIJAT] Strategi Wildcard OR.
 * Mengelakkan pemuatan >200k rekod yang meranapkan memori.
 * Hanya mencari nama yang wujud dalam unmatchedNames menggunakan .or() dan ilike.
 * @param {Array<string>} unmatchedNames - Array nama (e.g. ['ALI BIN ABU', 'SITI'])
 * @returns {Promise<Array>} - Hanya rekod yang dipadankan.
 */
export const fetchFallbackData = async (unmatchedNames) => {
    try {
        if (!unmatchedNames || unmatchedNames.length === 0) return [];

        let allFallbackData = [];
        // Kita hantar 25 nama serentak dalam satu query bagi mengelakkan URL terlampau panjang
        const chunkSize = 25; 

        for (let i = 0; i < unmatchedNames.length; i += chunkSize) {
            const chunk = unmatchedNames.slice(i, i + chunkSize);
            
            // Bina string OR berdasarkan nama yang telah dibersihkan ruang kosongnya
            // Contoh: "ALI BIN ABU" menjadi "nama_penuh.ilike.%ALI%BIN%ABU%"
            const orQueryString = chunk.map(name => {
                // Gantikan spasi tunggal/berganda dengan '%'
                const wildcardName = name.replace(/\s+/g, '%');
                return `nama_penuh.ilike.%${wildcardName}%`;
            }).join(',');

            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status')
                .or(orQueryString); // Hantar carian serentak

            if (error) {
                console.warn("Amaran Fallback Fetch (Wildcard OR):", error.message);
                continue; 
            }

            if (data && data.length > 0) {
                allFallbackData = allFallbackData.concat(data);
            }
        }

        return allFallbackData;
    } catch (err) {
        console.error("Ralat Kritikal Fallback Fetch:", err);
        return []; 
    }
};

export { supabaseClient };