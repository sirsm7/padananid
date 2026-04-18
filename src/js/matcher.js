/**
 * Modul: Enjin Padanan Data (Matcher Engine)
 * Folder: /src/js/matcher.js
 * Fungsi: Memproses logik normalisasi teks mengikut standard GAS, 
 * serta melaksanakan padanan dua peringkat (IC & Nama).
 * Arkitek: Pro Web Caster (Strict SoC - Forensic Update V2)
 */

/**
 * Fungsi utama untuk menormalisasikan nama pelajar bagi membolehkan padanan maya yang tepat.
 * Logik ini disuntik TEPAT dari Salinan Kod.json (Modul Normalisasi.gs) untuk menjamin konsistensi.
 * * @param {string} name - Nama mentah dari pangkalan data atau CSV
 * @returns {string} - Nama yang telah dinormalisasi sepenuhnya.
 */
export const normalizeName = (name) => {
    // Pengesahan integriti data: Kembalikan rentetan kosong jika tiada data atau format tidak sah
    if (!name || typeof name !== 'string') {
        return '';
    }

    // 1. Seragamkan semua aksara kepada huruf besar (Uppercase)
    let cleanName = name.toUpperCase();

    // 2. Pembuangan Nama Alias (Penting untuk DATA_MOEIS)
    // Contoh: "DEVIN A/L MURUGAN @ BALA" -> "DEVIN A/L MURUGAN "
    cleanName = cleanName.split('@')[0];

    // 3. Trim Awal (Membuang ruang kosong di pangkal & hujung selepas split)
    cleanName = cleanName.trim();

    // 4. Gugurkan pelbagai penanda sistem di hujung rentetan (Khas untuk DATA_ID_DELIMa)
    // Ekspresi ini akan menangkap: " MOE", "KPM-MURID", " KPM MURID", "KPM-GURU", dsb.
    cleanName = cleanName.replace(/\s*(MOE|KPM[- ]?MURID|KPM[- ]?GURU)$/g, '');

    // 5. Penyingkiran Aksara Khas (Sanitization)
    // Hanya kekalkan huruf (A-Z), nombor (0-9) dan ruang kosong (space).
    // Kesan: "A'ATHIF AS-SIDDIQ" -> "AATHIF ASSIDDIQ", "A/L" -> "AL"
    cleanName = cleanName.replace(/[^A-Z0-9\s]/g, '');

    // 6. Normalisasi Ruang Kosong (Space Normalization) & Trim Akhir
    // Tukar semua ruang kosong yang berganda kepada satu jarak tunggal
    cleanName = cleanName.replace(/\s+/g, ' ');

    return cleanName.trim();
};

/**
 * Mencuci dan menyeragamkan format Nombor Pengenalan (IC).
 * Membuang sempang (-) dan ruang kosong untuk mengelakkan ralat padanan.
 * * @param {string|number} ic - No IC mentah dari CSV atau API
 * @returns {string} - No IC bersih (hanya digit)
 */
export const normalizeIC = (ic) => {
    if (!ic) return '';
    return String(ic).replace(/[^0-9]/g, '').trim();
};

/**
 * Mengekstrak hanya 4 atau 5 digit hujung dari rentetan Kod OU untuk pelaporan.
 * @param {string|number} ouString - Rentetan OU mentah (contoh: "Sekolah 8001" atau 80012)
 * @returns {string} - 4 atau 5 digit terawal yang dijumpai dari hujung
 */
export const extractOU = (ouString) => {
    if (!ouString) return '';
    const match = String(ouString).match(/\d{4,5}$/);
    return match ? match[0] : String(ouString);
};

/**
 * Enjin Padanan Dua Peringkat (Two-Tier Matching Engine)
 * Menggunakan algoritma Hashing (Map Object) O(1) dengan sokongan Fallback (IC -> Nama).
 * * @param {Array<Object>} excelData - Data mentah dari fail CSV/Excel pengguna
 * @param {Array<Object>} localDelimaData - Data DELIMa sekolah (Peringkat 1)
 * @param {Function} fetchGlobalCallback - Fungsi API untuk carian global (Peringkat 2)
 * @param {Function} progressCallback - Fungsi untuk mengemas kini UI Progres
 * @returns {Promise<Object>} - { finalData, stats }
 */
export const runMatchingEngine = async (excelData, localDelimaData, fetchGlobalCallback, progressCallback) => {
    const stats = {
        total: excelData.length,
        successTier1: 0,
        successTier2: 0,
        failed: 0
    };

    const unmatchedRecords = []; 
    const unmatchedNames = [];   

    // ---------------------------------------------------------
    // PRA-PEMPROSESAN: Bina Hash Maps Peringkat 1 (Lokal)
    // ---------------------------------------------------------
    const localNameMap = new Map();
    const localIcMap = new Map();

    localDelimaData.forEach(item => {
        // Menggunakan kunci dari Supabase: nama_penuh, no_kp (atau emel sebagai fallback)
        const normName = normalizeName(item.nama_penuh || item.nama);
        const normIc = normalizeIC(item.no_kp || item.nokp);

        if (normName) localNameMap.set(normName, item);
        if (normIc) localIcMap.set(normIc, item);
    });

    // ---------------------------------------------------------
    // PERINGKAT 1: Carian Skop Tempatan (IC & Nama)
    // ---------------------------------------------------------
    for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        // Dinamik mapping untuk pengepala CSV (Trim & Case Insensitive)
        const rawName = row['NAMA'] || row['Nama'] || row['NAMA MURID'];
        const rawIc = row['NO. PENGENALAN'] || row['NO KP'] || row['IC'];

        if (i % 50 === 0 && typeof progressCallback === 'function') {
            progressCallback(i, excelData.length, "Memproses Padanan Peringkat 1...");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const searchName = normalizeName(rawName);
        const searchIc = normalizeIC(rawIc);

        // Strategi: Padan IC dahulu, jika gagal baru padan Nama
        let match = null;
        if (searchIc) match = localIcMap.get(searchIc);
        if (!match && searchName) match = localNameMap.get(searchName);

        if (match) {
            row['EMEL'] = match.emel || '';
            row['NAMA SEKOLAH'] = match.nama_sekolah || match.sekolah || '';
            row['KOD OU'] = extractOU(match.ou);
            row['STATUS PADANAN'] = 'BERJAYA (SKOP SEKOLAH)';
            stats.successTier1++;
        } else {
            // Simpan rujukan untuk Peringkat 2
            unmatchedRecords.push({ row, searchName, searchIc });
            if (searchName && !unmatchedNames.includes(searchName)) {
                unmatchedNames.push(searchName);
            }
        }
    }

    // ---------------------------------------------------------
    // PERINGKAT 2: Carian Global (Fallback Supabase Search)
    // ---------------------------------------------------------
    if (unmatchedNames.length > 0) {
        if (typeof progressCallback === 'function') {
            progressCallback(excelData.length, excelData.length, `Membuat Carian Global untuk ${unmatchedNames.length} nama...`);
        }

        const globalResults = await fetchGlobalCallback(unmatchedNames);

        const globalNameMap = new Map();
        const globalIcMap = new Map();

        globalResults.forEach(item => {
            const normName = normalizeName(item.nama_penuh || item.nama);
            const normIc = normalizeIC(item.no_kp || item.nokp);
            if (normName) globalNameMap.set(normName, item);
            if (normIc) globalIcMap.set(normIc, item);
        });

        for (const record of unmatchedRecords) {
            const { row, searchName, searchIc } = record;
            
            let match = null;
            if (searchIc) match = globalIcMap.get(searchIc);
            if (!match && searchName) match = globalNameMap.get(searchName);

            if (match) {
                row['EMEL'] = match.emel || '';
                row['NAMA SEKOLAH'] = match.nama_sekolah || match.sekolah || '';
                row['KOD OU'] = extractOU(match.ou);
                row['STATUS PADANAN'] = 'BERJAYA (CARIAN GLOBAL)';
                stats.successTier2++;
            } else {
                row['EMEL'] = 'TIDAK DIJUMPAI';
                row['NAMA SEKOLAH'] = 'TIDAK DIJUMPAI';
                row['KOD OU'] = '-';
                row['STATUS PADANAN'] = 'GAGAL (TIADA REKOD)';
                stats.failed++;
            }
        }
    }

    return {
        finalData: excelData, 
        stats: stats
    };
};