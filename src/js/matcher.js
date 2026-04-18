/**
 * Modul: Enjin Padanan Data (Matcher Engine)
 * Folder: /src/js/matcher.js
 * Fungsi: Memproses logik normalisasi teks, regex pengekstrakan, dan memadankan data fail tempatan dengan data Supabase.
 * Arkitek: Pro Web Caster (Strict SoC Enforced)
 */

/**
 * Menormalisasikan nama untuk memastikan padanan yang jitu dan kalis ralat.
 * Membuang jarak berlebihan, mengubah ke huruf besar, dan membuang watak khas jika perlu.
 * @param {string} name - Nama mentah dari pangkalan data atau Excel
 * @returns {string} - Nama yang telah dinormalisasi (cth: "AHMAD BIN ABU")
 */
export const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    
    let cleaned = name.toUpperCase();
    
    // Buang watak khas yang tidak perlu (contoh: koma, titik) yang mungkin mengganggu padanan
    cleaned = cleaned.replace(/[,.]/g, '');
    
    // Buang jarak berlebihan di antara perkataan dan di hujung/awal (trimming)
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
};

/**
 * Mengekstrak hanya 4 atau 5 digit hujung dari rentetan Kod OU untuk pelaporan.
 * @param {string|number} ouString - Rentetan OU mentah (contoh: "Sekolah 8001" atau 80012)
 * @returns {string} - 4 atau 5 digit terawal yang dijumpai dari hujung (contoh: "8001")
 */
export const extractOU = (ouString) => {
    if (!ouString) return '';
    
    // Regex: Cari 4 ke 5 digit (\d{4,5}) di hujung string ($)
    const match = String(ouString).match(/\d{4,5}$/);
    
    // Jika padanan dijumpai, pulangkan digit tersebut. Jika tidak, pulangkan nilai asal sebagai fallback.
    return match ? match[0] : String(ouString);
};

/**
 * Enjin Padanan Dua Peringkat (Two-Tier Matching Engine)
 * Menggunakan algoritma Hashing (Map Object) untuk kecekapan masa carian O(1).
 * * @param {Array<Object>} excelData - Data mentah dari fail Excel pengguna (Array of Objects)
 * @param {Array<Object>} localDelimaData - Data DELIMa untuk sekolah terpilih (Peringkat 1)
 * @param {Function} fetchGlobalCallback - Fungsi asinkroni dari api.js untuk menarik data global
 * @param {Function} progressCallback - Fungsi callback untuk mengemas kini UI Progres Bar
 * @returns {Promise<Object>} - Mengembalikan objek mengandungi { finalData, stats }
 */
export const runMatchingEngine = async (excelData, localDelimaData, fetchGlobalCallback, progressCallback) => {
    const stats = {
        total: excelData.length,
        successTier1: 0,
        successTier2: 0,
        failed: 0
    };

    const unmatchedRecords = []; // Simpan rujukan pointer kepada rekod excel untuk Peringkat 2
    const unmatchedNames = [];   // Simpan nama unik sahaja untuk dihantar ke carian global API

    // ---------------------------------------------------------
    // PRA-PEMPROSESAN: Bina Hash Map Peringkat 1
    // ---------------------------------------------------------
    const localDataMap = new Map();
    localDelimaData.forEach(item => {
        const normName = normalizeName(item.nama);
        if (normName) {
            localDataMap.set(normName, item);
        }
    });

    // ---------------------------------------------------------
    // PERINGKAT 1: Carian Skop Tempatan (Local Map Lookup)
    // ---------------------------------------------------------
    for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        const rawName = row['NAMA']; // Pastikan lajur bernama NAMA wujud
        
        // Kemas kini UI Progres setiap 50 rekod (menghalang browser freeze)
        if (i % 50 === 0 && typeof progressCallback === 'function') {
            progressCallback(i, excelData.length, "Memproses Padanan Peringkat 1...");
            // Pelepasan thread eksekusi untuk render UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (!rawName) {
            row['EMEL'] = 'TIADA DATA NAMA';
            row['NAMA SEKOLAH'] = '';
            row['KOD OU'] = '';
            row['STATUS PADANAN'] = 'GAGAL (TIADA DATA)';
            stats.failed++;
            continue;
        }

        const searchName = normalizeName(rawName);
        const match = localDataMap.get(searchName);

        if (match) {
            // Berjaya Padanan Peringkat 1 - Masukkan medan data baharu ke dalam objek
            row['EMEL'] = match.emel || '';
            row['NAMA SEKOLAH'] = match.sekolah || '';
            row['KOD OU'] = extractOU(match.ou);
            row['STATUS PADANAN'] = 'BERJAYA (SKOP SEKOLAH)';
            stats.successTier1++;
        } else {
            // Gagal Peringkat 1, asingkan untuk dihantar ke Peringkat 2
            unmatchedRecords.push(row);
            if (!unmatchedNames.includes(searchName)) {
                unmatchedNames.push(searchName);
            }
        }
    }

    // ---------------------------------------------------------
    // PERINGKAT 2: Carian Global (Fallback Supabase Search)
    // ---------------------------------------------------------
    if (unmatchedNames.length > 0) {
        if (typeof progressCallback === 'function') {
            progressCallback(
                excelData.length, 
                excelData.length, 
                `Membuat Carian Global untuk ${unmatchedNames.length} nama yang tiada di sekolah ini...`
            );
        }

        // Tarik data pukal (bulk) dari Supabase (ini akan memanggil chunks di api.js)
        const globalResults = await fetchGlobalCallback(unmatchedNames);

        // Pra-pemprosesan: Bina Hash Map Peringkat 2 dari hasil carian global
        const globalDataMap = new Map();
        globalResults.forEach(item => {
            const normName = normalizeName(item.nama);
            if (normName) {
                globalDataMap.set(normName, item);
            }
        });

        // Semak dan padankan semula rekod yang gagal di Peringkat 1
        for (let i = 0; i < unmatchedRecords.length; i++) {
            const row = unmatchedRecords[i];
            const searchName = normalizeName(row['NAMA']);
            const match = globalDataMap.get(searchName);

            if (match) {
                // Berjaya Padanan Peringkat 2 (Pelajar berpindah/bertukar sekolah)
                row['EMEL'] = match.emel || '';
                row['NAMA SEKOLAH'] = match.sekolah || '';
                row['KOD OU'] = extractOU(match.ou);
                row['STATUS PADANAN'] = 'BERJAYA (CARIAN GLOBAL)';
                stats.successTier2++;
            } else {
                // Gagal Sepenuhnya (Data memang tiada dalam sistem DELIMa Pusat)
                row['EMEL'] = 'TIDAK DIJUMPAI';
                row['NAMA SEKOLAH'] = 'TIDAK DIJUMPAI';
                row['KOD OU'] = '-';
                row['STATUS PADANAN'] = 'GAGAL (TIADA REKOD)';
                stats.failed++;
            }
        }
    }

    // Kembalikan objek data asal yang telah diubah suai dan statistik operasi
    // Struktur data asal seperti TINGKATAN, NAMA KELAS dikekalkan kerana kita memanipulasi rujukan memori (in-place mutation)
    return {
        finalData: excelData, 
        stats: stats
    };
};