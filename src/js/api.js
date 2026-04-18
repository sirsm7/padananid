/**
 * Modul: Kawalan API (Application Programming Interface)
 * Folder: /src/js/api.js
 * Fungsi: Menguruskan komunikasi HTTP dengan Supabase REST API berdasarkan skema terkini.
 * Arkitek: Pro Web Caster
 */

// ============================================================================\
// KONFIGURASI SUPABASE (Single Source of Truth)
// ============================================================================\
const SUPABASE_CONFIG = {
    URL: "https://app.tech4ag.my",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY",
    
    // Nama jadual berdasarkan input user
    TABLE_DELIMA: "delima_salinan_admin",
    TABLE_SCHOOLS: "delima_data_sekolah", 
    
    TIMEOUT_MS: 30000 // 30 saat
};

const HEADERS = {
    "apikey": SUPABASE_CONFIG.ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
    "Content-Type": "application/json"
};

/**
 * FUNGSI 1: Ambil Senarai Unik Sekolah
 * Digunakan untuk memenuhkan <datalist> di UI bagi carian sekolah.
 */
export const fetchSchoolsList = async () => {
    try {
        const url = `${SUPABASE_CONFIG.URL}/rest/v1/${SUPABASE_CONFIG.TABLE_SCHOOLS}?select=nama_sekolah,kod_ou&order=nama_sekolah.asc`;
        
        const response = await fetch(url, { method: "GET", headers: HEADERS });
        
        if (!response.ok) throw new Error(`Ralat API: ${response.statusText}`);
        
        const data = await response.json();
        return data.map(item => ({
            nama_sekolah: item.nama_sekolah,
            kod_ou: item.kod_ou
        }));

    } catch (error) {
        console.error("❌ Gagal mengambil senarai sekolah:", error);
        return [];
    }
};

/**
 * FUNGSI 2: Ambil Data Peringkat Sekolah (Local Scope)
 * Mengambil semua data DELIMa bagi sesebuah sekolah (OU) untuk padanan pantas.
 */
export const fetchSchoolData = async (kodOu) => {
    try {
        if (!kodOu) return [];

        // Menggunakan skema yang disahkan: nama_penuh, emel, ou, nama_sekolah
        const url = `${SUPABASE_CONFIG.URL}/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA}?ou=eq.${kodOu}&select=nama_penuh,emel,ou,nama_sekolah`;
        
        const response = await fetch(url, { method: "GET", headers: HEADERS });
        
        if (!response.ok) throw new Error(`Ralat API: ${response.statusText}`);
        
        return await response.json();

    } catch (error) {
        console.error(`❌ Gagal mengambil data sekolah (OU: ${kodOu}):`, error);
        return [];
    }
};

/**
 * FUNGSI 3: Carian Global (Peringkat 2)
 * Digunakan untuk rekod yang gagal dipadan di peringkat sekolah.
 * Melakukan carian 'IN' menggunakan tatasusunan nama_penuh.
 */
export const fetchGlobalMatch = async (nameList) => {
    if (!nameList || nameList.length === 0) return [];

    try {
        // Supabase/PostgREST mempunyai had panjang URL. Kita pecahkan kepada kelompok (chunks) 50 nama.
        const chunkSize = 50;
        let allResults = [];

        for (let i = 0; i < nameList.length; i += chunkSize) {
            const chunk = nameList.slice(i, i + chunkSize);
            // Format filter: nama_penuh=in.("NAMA 1","NAMA 2")
            const formattedNames = chunk.map(n => `"${n}"`).join(",");
            const url = `${SUPABASE_CONFIG.URL}/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA}?nama_penuh=in.(${formattedNames})&select=nama_penuh,emel,ou,nama_sekolah`;

            const response = await fetch(url, { method: "GET", headers: HEADERS });
            
            if (response.ok) {
                const data = await response.json();
                allResults = [...allResults, ...data];
            }
        }

        return allResults;

    } catch (error) {
        console.error("❌ Gagal melakukan carian global:", error);
        return [];
    }
};