/**
 * Modul: Kawalan API (Schema-Aligned Edition)
 * Folder: /src/js/api.js
 * Fungsi: Menguruskan komunikasi dengan Supabase berdasarkan skema jadual 'delima_salinan_admin'.
 * Arkitek: Pro Web Caster (Strict Schema Enforcement V3.1)
 * Kemas kini: Penyelarasan lajur 'nama_penuh' dan pembuangan logik IC/No KP.
 */

// ============================================================================
// KONFIGURASI SUPABASE
// ============================================================================
const SUPABASE_CONFIG = {
    URL: "https://app.tech4ag.my",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY",
    
    // Nama jadual utama mengikut skema yang diberikan
    TABLE_DELIMA: "delima_salinan_admin",
    
    // Jadual sokongan untuk senarai sekolah
    TABLE_SMPID: "smpid_sekolah_data",
    TABLE_DELIMA_SEKOLAH: "delima_data_sekolah",
    
    TIMEOUT_MS: 30000 
};

/**
 * ADAPTER CORAK STRUKTUR
 * Menjamin objek yang dipulangkan sentiasa mengikut kontrak yang diharapkan oleh matcher.js.
 * Berdasarkan skema: id, kod_sekolah, nama_sekolah, nama_penuh, emel, ou, kategori, status.
 */
const mapToMatcherFormat = (dbItem) => {
    return {
        nama_penuh: dbItem.nama_penuh || '', // Wajib (Not Null dalam DB)
        nama_sekolah: dbItem.nama_sekolah || '',
        emel: dbItem.emel || '',            // Wajib (Not Null dalam DB)
        ou: dbItem.ou || '',
        kod_sekolah: dbItem.kod_sekolah || ''
    };
};

/**
 * Utility: Wrapper fetch untuk komunikasi Supabase.
 */
const fetchSupabase = async (endpoint, options = {}) => {
    const { timeout = SUPABASE_CONFIG.TIMEOUT_MS, ...fetchOptions } = options;
    const url = `${SUPABASE_CONFIG.URL}${endpoint}`;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const defaultHeaders = {
        'apikey': SUPABASE_CONFIG.ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const response = await fetch(url, {
        ...fetchOptions,
        headers: {
            ...defaultHeaders,
            ...(fetchOptions.headers || {})
        },
        signal: controller.signal  
    });
    
    clearTimeout(id);
    return response;
};

/**
 * Panggil senarai semua sekolah untuk paparan Datalist.
 */
export const fetchSchoolsList = async () => {
    try {
        // Kita tarik dari jadual delima_data_sekolah untuk mendapatkan pemetaan OU
        const endpointDelimaSekolah = `/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA_SEKOLAH}?select=kod_sekolah,kod_ou`;
        const endpointSmpid = `/rest/v1/${SUPABASE_CONFIG.TABLE_SMPID}?select=kod_sekolah,nama_sekolah`;
        
        const [resDelima, resSmpid] = await Promise.all([
            fetchSupabase(endpointDelimaSekolah, { method: 'GET' }),
            fetchSupabase(endpointSmpid, { method: 'GET' })
        ]);

        if (!resDelima.ok || !resSmpid.ok) throw new Error("Gagal akses jadual rujukan sekolah.");

        const delimaSekolah = await resDelima.json();
        const smpidSekolah = await resSmpid.json();

        // Bina Map untuk nama sekolah berdasarkan kod_sekolah
        const nameMap = {};
        smpidSekolah.forEach(s => nameMap[s.kod_sekolah] = s.nama_sekolah);

        const combined = delimaSekolah.map(item => ({
            nama_sekolah: nameMap[item.kod_sekolah] || `Sekolah ${item.kod_sekolah}`,
            kod_ou: item.kod_ou
        }));

        return combined.sort((a, b) => a.nama_sekolah.localeCompare(b.nama_sekolah));

    } catch (error) {
        console.error("Ralat fetchSchoolsList:", error);
        return [];
    }
};

/**
 * Peringkat 1: Tarik data pelajar berdasarkan OU (Skop Sekolah).
 * Mengikut skema anda: nama_penuh, emel, ou, nama_sekolah.
 */
export const fetchSchoolData = async (kodOu) => {
    if (!kodOu) return [];

    try {
        // Query menggunakan lajur yang wujud dalam skema 'delima_salinan_admin'
        const endpoint = `/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA}?ou=eq.${encodeURIComponent(kodOu)}&select=nama_penuh,emel,ou,nama_sekolah,kod_sekolah`;
        
        const response = await fetchSupabase(endpoint, { method: 'GET' });

        if (!response.ok) throw new Error(`HTTP ${response.status} pada fetchSchoolData`);

        const data = await response.json();
        return Array.isArray(data) ? data.map(mapToMatcherFormat) : [];

    } catch (error) {
        console.error(`Gagal tarik data untuk OU ${kodOu}:`, error);
        return [];
    }
};

/**
 * Peringkat 2: Carian Global menggunakan Nama Penuh.
 * Menggunakan chunking untuk mengelakkan had panjang URL.
 */
export const fetchGlobalMatch = async (unmatchedNames) => {
    if (!unmatchedNames || unmatchedNames.length === 0) return [];

    try {
        const chunkSize = 50;
        let allResults = [];

        for (let i = 0; i < unmatchedNames.length; i += chunkSize) {
            const chunk = unmatchedNames.slice(i, i + chunkSize);
            const formattedNames = chunk.map(n => `"${n.replace(/"/g, '')}"`).join(',');
            
            // Carian pada lajur 'nama_penuh' (Not Null)
            const endpoint = `/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA}?nama_penuh=in.(${encodeURIComponent(formattedNames)})&select=nama_penuh,emel,ou,nama_sekolah,kod_sekolah`;
            
            const response = await fetchSupabase(endpoint, { method: 'GET' });
            
            if (response.ok) {
                const json = await response.json();
                if (Array.isArray(json)) {
                    allResults = allResults.concat(json.map(mapToMatcherFormat));
                }
            }
        }

        return allResults;

    } catch (error) {
        console.error("Ralat fetchGlobalMatch:", error);
        return [];
    }
};