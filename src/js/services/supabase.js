/**
 * Modul: Integrasi Supabase (Service)
 * Folder: /src/js/services/supabase.js
 * Fungsi: Menguruskan hubungan, pengesahan, dan penarikan data daripada jadual Supabase.
 * Arkitek: Pro Web Caster (Migrasi ke Standalone Client-Side)
 * Keselamatan: 100% Read-Only. Tiada operasi insert/update/upsert.
 */

// ============================================================================
// ⚠️ KONFIGURASI KELAYAKAN (CREDENTIALS) SUPABASE
// Sila kemas kini URL dan ANON_KEY ini dengan kelayakan projek Supabase anda.
// ============================================================================
const SUPABASE_CONFIG = {
    URL: 'SILA_MASUKKAN_SUPABASE_PROJECT_URL_ANDA_DI_SINI',
    ANON_KEY: 'SILA_MASUKKAN_SUPABASE_ANON_KEY_ANDA_DI_SINI'
};

// Inisialisasi klien Supabase menggunakan fungsi dari CDN yang dimuatkan di index.html
const supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.URL,
    SUPABASE_CONFIG.ANON_KEY
);

/**
 * Menguji sambungan ke Supabase untuk memastikan klien dikonfigurasi dengan betul.
 * @returns {Promise<boolean>} - True jika berjaya berhubung, False jika gagal.
 */
export const checkSupabaseConnection = async () => {
    try {
        // Lakukan query ringkas untuk menyemak status akses. READ-ONLY.
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

/**
 * [BARU] Menarik senarai sekolah dari jadual 'delima_data_sekolah' untuk dropdown UI.
 * @returns {Promise<Array>} - Tatasusunan (Array) objek sekolah {kod_ou, nama_sekolah}.
 */
export const fetchSchoolsList = async () => {
    try {
        // Tarik hanya lajur yang diperlukan untuk mengurangkan muatan (payload). READ-ONLY.
        const { data, error } = await supabaseClient
            .from('delima_data_sekolah')
            .select('kod_ou, nama_sekolah')
            .order('nama_sekolah', { ascending: true }); // Susun ikut abjad untuk UI yang kemas

        if (error) {
            throw new Error(`Gagal menarik senarai sekolah: ${error.message}`);
        }

        return data || [];
    } catch (err) {
        console.error("Ralat Fetch Schools:", err);
        throw err;
    }
};

/**
 * Menarik senarai data pelajar dari jadual 'delima_salinan_admin'.
 * Fungsi ini kini akan menarik berdasarkan kod_ou yang dipilih oleh pengguna (Peringkat 1).
 * * @param {string} kodOU - Kod OU sekolah yang dipilih dari dropdown.
 * @returns {Promise<Array>} - Tatasusunan (Array) objek data dari Supabase.
 */
export const fetchDelimaDataByOU = async (kodOU) => {
    try {
        if (!kodOU) throw new Error("Parameter kod OU diperlukan untuk penarikan data spesifik.");

        // Tarik rekod pelajar berdasarkan Kod OU yang dipilih. READ-ONLY.
        const { data, error } = await supabaseClient
            .from('delima_salinan_admin')
            .select('id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status')
            .ilike('ou', `%${kodOU}%`); // Guna ILIKE (contains) jika struktur ou seperti /JPN/MELAKA/M020/SEKOLAH-1234

        if (error) {
            throw new Error(`Gagal menarik data sekolah spesifik: ${error.message}`);
        }

        return data || [];
    } catch (err) {
        console.error("Ralat Fetch Data By OU:", err);
        throw err;
    }
};

/**
 * [BARU] Menarik data tambahan untuk nama-nama yang GAGAL dipadankan pada Peringkat 1 (Peringkat 2 / Fallback).
 * Fungsi ini menggunakan kaedah 'Chunking' (kumpulan kecil) untuk tidak melepasi had URL Request dan RAM.
 * * @param {Array<string>} namesArray - Senarai nama-nama yang belum dijumpai.
 * @returns {Promise<Array>} - Rekod tambahan dari seluruh jadual untuk nama-nama tersebut sahaja.
 */
export const fetchFallbackData = async (namesArray) => {
    try {
        if (!namesArray || namesArray.length === 0) return [];

        let allFallbackData = [];
        const chunkSize = 50; // Hadkan carian IN clause kepada 50 nama pada satu-satu masa.

        for (let i = 0; i < namesArray.length; i += chunkSize) {
            const chunk = namesArray.slice(i, i + chunkSize);
            
            // Carian berdasarkan nama secara global. READ-ONLY.
            const { data, error } = await supabaseClient
                .from('delima_salinan_admin')
                .select('id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status')
                .in('nama_penuh', chunk); // Array pencarian

            if (error) {
                console.warn("Amaran Fallback Fetch (Chunk):", error.message);
                continue; // Teruskan ke chunk seterusnya jika ralat
            }

            if (data && data.length > 0) {
                allFallbackData = allFallbackData.concat(data);
            }
        }

        return allFallbackData;
    } catch (err) {
        console.error("Ralat Kritikal Fallback Fetch:", err);
        // Kita tidak 'throw' error di sini untuk membenarkan hasil padanan Peringkat 1 tetap dipaparkan walaupun Fallback gagal
        return []; 
    }
};

// Eksport klien utama jika modul lain memerlukan akses secara langsung
export { supabaseClient };