/**
 * Modul: Kawalan API (Application Programming Interface)
 * Folder: /src/js/api.js
 * Fungsi: Menguruskan semua komunikasi (HTTP requests) secara terus dengan Supabase REST API.
 * Arkitek: Pro Web Caster (Pure Client-to-Supabase Architecture)
 * Kemas kini: Pelaksanaan Senibina Adapter (Column Mapping) bagi menyelesaikan Ralat HTTP 400.
 */

// ============================================================================
// KONFIGURASI SUPABASE & PEMETAAN LAJUR
// ============================================================================
const SUPABASE_CONFIG = {
    URL: "https://app.tech4ag.my",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzYzMzczNjQ1LCJleHAiOjIwNzg3MzM2NDV9.vZOedqJzUn01PjwfaQp7VvRzSm4aRMr21QblPDK8AoY",
    
    // Nama jadual utama yang menyimpan data DELIMa
    TABLE_DELIMA: "delima_salinan_admin",
    
    // Nama jadual gabungan untuk senarai unik sekolah
    TABLE_SMPID: "smpid_sekolah_data",
    TABLE_DELIMA_SEKOLAH: "delima_data_sekolah",
    TIMEOUT_MS: 30000 
};

/**
 * ADAPTER CORAK STRUKTUR (Structural Pattern Adapter)
 * Menukar JSON yang ditarik dari pangkalan data kepada format standard 
 * yang difahami oleh enjin matcher.js tanpa merosakkan prinsip SoC.
 * @param {Object} dbItem - Objek baris dari Supabase
 * @returns {Object} - Objek yang telah dipetakan
 */
const mapToMatcherFormat = (dbItem) => {
    return {
        nama: dbItem.nama_penuh || '',      // Pangkalan data = nama_penuh -> Enjin = nama
        sekolah: dbItem.nama_sekolah || '', // Pangkalan data = nama_sekolah -> Enjin = sekolah
        emel: dbItem.emel || '',            // Kekal sama
        ou: dbItem.ou || ''                 // Kekal sama
    };
};

/**
 * Utility: Wrapper fetch dengan timeout dan header Supabase secara automatik.
 * @param {string} endpoint - Path endpoint (contoh: '/rest/v1/table_name')
 * @param {object} options - Objek konfigurasi fetch tambahan
 * @returns {Promise<Response>}
 */
const fetchSupabase = async (endpoint, options = {}) => {
    const { timeout = SUPABASE_CONFIG.TIMEOUT_MS, ...fetchOptions } = options;
    const url = `${SUPABASE_CONFIG.URL}${endpoint}`;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    // Tetapan wajib Header Supabase (Anon Key)
    const defaultHeaders = {
        'apikey': SUPABASE_CONFIG.ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_CONFIG.ANON_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Preferences': 'return=representation'
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
 * Panggil senarai semua sekolah dengan mencantum (join) data SMPID dan DELIMA secara asinkroni.
 * Menggunakan Supabase REST API dengan Promise.all untuk kepantasan maksimum.
 * @returns {Promise<Array>} - Tatasusunan objek sekolah [{nama_sekolah: "SMK A", kod_ou: "12345"}, ...]
 */
export const fetchSchoolsList = async () => {
    try {
        const endpointSmpid = `/rest/v1/${SUPABASE_CONFIG.TABLE_SMPID}?select=kod_sekolah,nama_sekolah`;
        const endpointDelimaSekolah = `/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA_SEKOLAH}?select=kod_sekolah,kod_ou`;
        
        const [resSmpid, resDelimaSekolah] = await Promise.all([
            fetchSupabase(endpointSmpid, { method: 'GET' }),
            fetchSupabase(endpointDelimaSekolah, { method: 'GET' })
        ]);

        if (!resSmpid.ok || !resDelimaSekolah.ok) {
            throw new Error(`Ralat HTTP Supabase: SMPID (${resSmpid.status}), DELIMA (${resDelimaSekolah.status})`);
        }

        const dataSmpid = await resSmpid.json();
        const dataDelimaSekolah = await resDelimaSekolah.json();

        const smpidNameMap = {};
        if (Array.isArray(dataSmpid)) {
            dataSmpid.forEach(school => {
                if (school.kod_sekolah) {
                    smpidNameMap[school.kod_sekolah.trim()] = school.nama_sekolah;
                }
            });
        }

        const combinedList = [];
        if (Array.isArray(dataDelimaSekolah)) {
            dataDelimaSekolah.forEach(item => {
                if (item.kod_sekolah && item.kod_ou) {
                    const kodSek = item.kod_sekolah.trim();
                    combinedList.push({
                        nama_sekolah: smpidNameMap[kodSek] || "NAMA SEKOLAH TIDAK DIJUMPAI",
                        kod_ou: item.kod_ou.trim()
                    });
                }
            });
        }

        return combinedList.sort((a, b) => a.nama_sekolah.localeCompare(b.nama_sekolah));

    } catch (error) {
        console.error("Gagal menarik dan menggabungkan senarai sekolah dari Supabase:", error);
        return mockSchoolsData(); 
    }
};

/**
 * Panggil semua data emel DELIMa khusus untuk SATU sekolah (Berdasarkan Kod OU).
 * Digunakan untuk Padanan Peringkat 1 (Local Matching).
 * @param {string} kodOu - Kod organisasi unit sekolah (contoh: "8001")
 * @returns {Promise<Array>} - Tatasusunan data pelajar format standard
 */
export const fetchSchoolData = async (kodOu) => {
    if (!kodOu) throw new Error("Kod OU diperlukan untuk carian peringkat 1.");

    try {
        // Menggunakan nama lajur pangkalan data sebenar: nama_penuh, nama_sekolah
        const endpoint = `/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA}?ou=eq.${encodeURIComponent(kodOu)}&select=nama_penuh,emel,ou,nama_sekolah`;
        
        const response = await fetchSupabase(endpoint, { method: 'GET' });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Ralat 404: Jadual '${SUPABASE_CONFIG.TABLE_DELIMA}' tidak wujud di dalam Supabase.`);
            } else if (response.status === 400) {
                throw new Error(`Ralat 400: Ralat sintaks atau nama lajur tidak wujud di dalam jadual.`);
            }
            throw new Error(`Ralat HTTP Supabase (School Data): ${response.status}`);
        }

        const data = await response.json();
        
        // Kembalikan data yang telah dipetakan (Mapped Array)
        return Array.isArray(data) ? data.map(mapToMatcherFormat) : [];

    } catch (error) {
        console.error(`Gagal menarik data untuk OU ${kodOu}:`, error);
        return mockSchoolStudentsData(kodOu); 
    }
};

/**
 * Panggil enjin pangkalan data Supabase untuk memadankan senarai nama yang gagal dijumpai di Peringkat 1.
 * Menggunakan kaedah 'Chunking' untuk mengelakkan URL terlampau panjang (URL Length Limit).
 * @param {Array<string>} unmatchedNames - Tatasusunan nama ["AHMAD BIN ABU", "SITI BINTI ALI"]
 * @returns {Promise<Array>} - Tatasusunan hasil padanan global format standard
 */
export const fetchGlobalMatch = async (unmatchedNames) => {
    if (!unmatchedNames || !Array.isArray(unmatchedNames) || unmatchedNames.length === 0) {
        return [];
    }

    try {
        const chunkSize = 50;
        const chunks = [];
        for (let i = 0; i < unmatchedNames.length; i += chunkSize) {
            chunks.push(unmatchedNames.slice(i, i + chunkSize));
        }

        let allGlobalResults = [];

        const fetchPromises = chunks.map(async (nameChunk) => {
            const formattedNames = nameChunk.map(n => `"${n.replace(/"/g, '')}"`).join(',');
            
            // KEMAS KINI KRITIKAL: Carian menggunakan lajur 'nama_penuh'
            const endpoint = `/rest/v1/${SUPABASE_CONFIG.TABLE_DELIMA}?nama_penuh=in.(${encodeURIComponent(formattedNames)})&select=nama_penuh,emel,ou,nama_sekolah`;
            
            const response = await fetchSupabase(endpoint, { method: 'GET' });
            
            if (response.ok) {
                const json = await response.json();
                // Kembalikan data yang telah dipetakan (Mapped Array)
                return Array.isArray(json) ? json.map(mapToMatcherFormat) : [];
            } else {
                if (response.status === 404) {
                    console.error(`Ralat 404 Carian Global: Jadual '${SUPABASE_CONFIG.TABLE_DELIMA}' tiada.`);
                } else if (response.status === 400) {
                    console.error(`Ralat 400 Carian Global: Ketidakpadanan nama lajur.`);
                } else {
                    console.warn(`Chunk gagal diproses (HTTP ${response.status})`);
                }
                return [];
            }
        });

        const resultsArrays = await Promise.all(fetchPromises);
        
        resultsArrays.forEach(arr => {
            if (Array.isArray(arr)) {
                allGlobalResults = allGlobalResults.concat(arr);
            }
        });

        return allGlobalResults;

    } catch (error) {
        console.error("Gagal melakukan carian global di Supabase:", error);
        return [];
    }
};


// ============================================================================
// FUNGSI MOCK DATA (Untuk kegunaan pembangunan/demo UI tanpa Supabase)
// ============================================================================

function mockSchoolsData() {
    console.log("Amaran: Menggunakan data simulasi (Mock) untuk Senarai Sekolah.");
    return [
        { nama_sekolah: "SMK ALOR GAJAH", kod_ou: "2013" },
        { nama_sekolah: "SMK DATO DOL SAID", kod_ou: "2014" },
        { nama_sekolah: "SK BELIMBING DALAM", kod_ou: "2015" },
        { nama_sekolah: "SMK SERI PENGKALAN", kod_ou: "2016" }
    ];
}

function mockSchoolStudentsData(ou) {
    console.log(`Amaran: Menggunakan data simulasi (Mock) pelajar untuk OU: ${ou}`);
    return new Promise(resolve => {
        setTimeout(() => {
            resolve([
                { nama: "AFIQ BIN MAHMUD", emel: "m-1001@moe-dl.edu.my", ou: ou, sekolah: "Sekolah " + ou },
                { nama: "RAUDHATUL JANNAH BINTI ZAKARIA", emel: "m-1002@moe-dl.edu.my", ou: ou, sekolah: "Sekolah " + ou },
                { nama: "CHONG WEI MING", emel: "m-1003@moe-dl.edu.my", ou: ou, sekolah: "Sekolah " + ou }
            ]);
        }, 800);
    });
}