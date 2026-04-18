/**
 * Modul: Integrasi Supabase (Service)
 * Folder: /src/js/services/supabase.js
 * Fungsi: Menguruskan hubungan, pengesahan, dan penarikan data daripada jadual 'delima_salinan_admin' Supabase.
 * Arkitek: Pro Web Caster (Migrasi ke Standalone Client-Side)
 */

// ============================================================================
// ⚠️ KONFIGURASI KELAYAKAN (CREDENTIALS) SUPABASE
// Sila kemas kini URL dan ANON_KEY ini dengan kelayakan projek Supabase anda.
// ============================================================================
const SUPABASE_CONFIG = {
    URL: 'https://app.tech4ag.my',
    ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY'
};

// Inisialisasi klien Supabase menggunakan fungsi dari CDN yang dimuatkan di index.html
// Objek 'supabase' wujud secara global (window.supabase) disebabkan CDN.
const supabaseClient = window.supabase.createClient(
    SUPABASE_CONFIG.URL,
    SUPABASE_CONFIG.ANON_KEY
);

/**
 * Menguji sambungan ke Supabase untuk memastikan klien dikonfigurasi dengan betul.
 * Berguna untuk menukar status lencana (badge) di UI.
 * @returns {Promise<boolean>} - True jika berjaya berhubung, False jika gagal.
 */
export const checkSupabaseConnection = async () => {
    try {
        // Lakukan query ringkas untuk menyemak status akses
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
 * Menarik senarai data pelajar dari jadual 'delima_salinan_admin'.
 * Fungsi ini menyokong penarikan data secara berkelompok (pagination/limit) 
 * jika data terlampau besar, tetapi secara lalai akan cuba menarik semua padanan.
 * * @param {string} kodSekolah - (Pilihan) Tapis data berdasarkan kod sekolah untuk mengelakkan muat turun data yang tidak relevan.
 * @returns {Promise<Array>} - Tatasusunan (Array) objek data dari Supabase.
 */
export const fetchDelimaData = async (kodSekolah = null) => {
    try {
        let query = supabaseClient
            .from('delima_salinan_admin')
            .select('id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status');

        // Jika Kod Sekolah dibekalkan, lakukan penapisan.
        // Ini adalah amalan terbaik (Best Practice) untuk mengurangkan beban *payload*.
        if (kodSekolah) {
            query = query.eq('kod_sekolah', kodSekolah);
        }

        // Jalankan query (Secara lalai, Supabase mengehadkan kepada 1000 rekod. 
        // Jika perlu lebih, logik pagination perlu ditambah di masa hadapan)
        const { data, error } = await query;

        if (error) {
            throw new Error(`Gagal menarik data dari Supabase: ${error.message}`);
        }

        return data || [];

    } catch (err) {
        console.error("Ralat Fetch Data:", err);
        // Lontarkan semula ralat supaya boleh ditangkap oleh UI Logger
        throw err; 
    }
};

// Eksport klien utama jika modul lain memerlukan akses secara langsung (contohnya untuk Realtime subscription)
export { supabaseClient };