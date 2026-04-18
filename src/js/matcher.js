/**
 * Modul: Enjin Padanan Data (Zero-Hallucination V3)
 * Folder: /src/js/matcher.js
 * Fungsi: Logik padanan antara CSV (NAMA/IC) dan Supabase (nama_penuh).
 * Arkitek: Pro Web Caster
 */

/**
 * Normalisasi Nama (Heuristic Cleaning)
 * Memastikan perbandingan string adalah kalis ralat walaupun terdapat perbezaan kecil.
 */
export const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    
    let cleanName = name.toUpperCase();
    
    // 1. Buang bahagian emel jika ada (cth: m-123@moe-dl)
    cleanName = cleanName.split('@')[0];
    
    // 2. Buang rujukan KPM/MOE yang sering ada di hujung nama dalam DELIMa
    cleanName = cleanName.replace(/\s*(MOE|KPM[- ]?MURID|KPM[- ]?GURU|G-.*|M-.*)$/g, '');
    
    // 3. Buang aksara khas kecuali ruang (Standard Database Safety)
    cleanName = cleanName.replace(/[^A-Z\s]/g, '');
    
    // 4. Tukar berbilang ruang kosong kepada satu ruang sahaja
    cleanName = cleanName.replace(/\s+/g, ' ');
    
    return cleanName.trim();
};

/**
 * Normalisasi IC
 * Membuang sempang dan memastikan hanya digit sahaja diproses.
 */
export const normalizeIC = (ic) => {
    if (!ic) return '';
    return String(ic).replace(/[^0-9]/g, '').trim();
};

/**
 * Ekstrak Kod OU dari String
 * Mengesan 4-7 digit kod sekolah dalam string OU (cth: "1234 - SMK ABC").
 */
export const extractOU = (ouString) => {
    if (!ouString) return '';
    const match = String(ouString).match(/\d+/);
    return match ? match[0] : ouString;
};

/**
 * ENJIN UTAMA: runMatchingEngine
 * Memproses padanan baris-demi-baris dengan sistem Tier (Local -> Global).
 */
export const runMatchingEngine = async (csvData, localDbData, fetchGlobalMatch, updateProgress) => {
    const stats = {
        total: csvData.length,
        successTier1: 0, // Padanan sekolah terpilih
        successTier2: 0, // Padanan carian global
        failed: 0
    };

    // 1. Bina Map untuk Data Tempatan (Optimization: O(1) Lookup)
    // Berdasarkan skema Supabase: Menggunakan 'nama_penuh'
    const localNameMap = new Map();
    localDbData.forEach(item => {
        const normName = normalizeName(item.nama_penuh);
        if (normName) localNameMap.set(normName, item);
    });

    const finalData = [];
    const unmatchedRecords = [];

    // 2. TIER 1: Padanan Skop Sekolah (Local Matching)
    csvData.forEach((row, index) => {
        // Pengesanan Lajur Dinamik dari CSV
        const rawName = row['NAMA'] || row['Nama'] || row['nama_penuh'] || '';
        const rawIc = row['NO. PENGENALAN'] || row['IC'] || row['NO. KP'] || '';
        
        const searchName = normalizeName(rawName);
        const searchIc = normalizeIC(rawIc);

        // Cuba padan nama dalam skop sekolah sedia ada
        const localMatch = localNameMap.get(searchName);

        if (localMatch) {
            row['EMEL'] = localMatch.emel || '';
            row['NAMA SEKOLAH'] = localMatch.nama_sekolah || '';
            row['KOD OU'] = extractOU(localMatch.ou);
            row['STATUS PADANAN'] = 'BERJAYA (SKOP SEKOLAH)';
            stats.successTier1++;
            finalData.push(row);
        } else {
            // Jika gagal Tier 1, simpan untuk Tier 2 (Carian Global)
            unmatchedRecords.push({ row, searchName, searchIc });
        }
    });

    // 3. TIER 2: Padanan Carian Global (Supabase Search)
    if (unmatchedRecords.length > 0) {
        try {
            // Ambil senarai nama sahaja untuk carian global (Batch Processing)
            const namesToSearch = unmatchedRecords.map(item => item.searchName).filter(n => n !== '');
            
            // Panggil API Global Match (Akan dijana dalam api.js nanti)
            const globalResults = await fetchGlobalMatch(namesToSearch);
            
            // Bina Map hasil global
            const globalNameMap = new Map();
            globalResults.forEach(item => {
                const normName = normalizeName(item.nama_penuh);
                if (normName) globalNameMap.set(normName, item);
            });

            // Proses rekod yang gagal tadi
            unmatchedRecords.forEach(({ row, searchName }) => {
                const globalMatch = globalNameMap.get(searchName);

                if (globalMatch) {
                    row['EMEL'] = globalMatch.emel || '';
                    row['NAMA SEKOLAH'] = globalMatch.nama_sekolah || '';
                    row['KOD OU'] = extractOU(globalMatch.ou);
                    row['STATUS PADANAN'] = 'BERJAYA (GLOBAL)';
                    stats.successTier2++;
                } else {
                    row['EMEL'] = 'TIDAK DIJUMPAI';
                    row['NAMA SEKOLAH'] = 'TIDAK DIJUMPAI';
                    row['KOD OU'] = '-';
                    row['STATUS PADANAN'] = 'GAGAL (TIADA REKOD)';
                    stats.failed++;
                }
                finalData.push(row);
            });

        } catch (error) {
            console.error("❌ Ralat Tier 2 (Global):", error);
            // Jika API global gagal, tandakan baki sebagai ralat
            unmatchedRecords.forEach(({ row }) => {
                row['EMEL'] = 'RALAT API';
                row['STATUS PADANAN'] = 'GAGAL (RALAT SISTEM)';
                stats.failed++;
                finalData.push(row);
            });
        }
    }

    return { finalData, stats };
};