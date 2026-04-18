/**
 * Modul: Enjin Padanan Data (Forensic Debug Edition)
 * Folder: /src/js/matcher.js
 * Fungsi: Logik padanan dengan sistem audit log dan pengesan lajur dinamik.
 * Arkitek: Pro Web Caster (Zero-Hallucination V3)
 */

/**
 * Normalisasi Nama (Standard GAS)
 * Memastikan perbandingan string adalah kalis ralat.
 */
export const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    let cleanName = name.toUpperCase();
    cleanName = cleanName.split('@')[0];
    cleanName = cleanName.trim();
    cleanName = cleanName.replace(/\s*(MOE|KPM[- ]?MURID|KPM[- ]?GURU)$/g, '');
    cleanName = cleanName.replace(/[^A-Z0-9\s]/g, '');
    cleanName = cleanName.replace(/\s+/g, ' ');
    return cleanName.trim();
};

/**
 * Normalisasi IC
 * Membuang sempang dan ruang kosong.
 */
export const normalizeIC = (ic) => {
    if (!ic) return '';
    return String(ic).replace(/[^0-9]/g, '').trim();
};

/**
 * Ekstrak Kod OU
 */
export const extractOU = (ouString) => {
    if (!ouString) return '';
    const match = String(ouString).match(/\d{4,5}$/);
    return match ? match[0] : String(ouString);
};

/**
 * Fungsi Pembantu: Mencari nilai dalam objek berdasarkan senarai kunci yang mungkin.
 * Mengatasi isu lajur CSV yang berbeza-beza (NAMA vs Nama vs NAMA MURID).
 */
const findValueByKeys = (row, possibleKeys) => {
    const rowKeys = Object.keys(row);
    for (const pKey of possibleKeys) {
        // Cari padanan kunci secara case-insensitive dan tanpa ruang kosong
        const targetKey = rowKeys.find(rKey => 
            rKey.trim().toUpperCase() === pKey.toUpperCase()
        );
        if (targetKey) return row[targetKey];
    }
    return null;
};

/**
 * Enjin Padanan Utama
 */
export const runMatchingEngine = async (excelData, localDelimaData, fetchGlobalCallback, progressCallback) => {
    console.group("🔍 PROSES AUDIT PADANAN BERMULA");
    console.log("📊 Data CSV Diterima:", excelData.length, "rekod");
    console.log("📊 Data API Sekolah:", localDelimaData.length, "rekod");

    const stats = {
        total: excelData.length,
        successTier1: 0,
        successTier2: 0,
        failed: 0
    };

    if (!excelData || excelData.length === 0) {
        console.error("❌ Ralat: Data CSV kosong.");
        console.groupEnd();
        return { finalData: excelData, stats };
    }

    const unmatchedRecords = [];
    const unmatchedNames = [];

    // ---------------------------------------------------------
    // PRA-PEMPROSESAN: Bina Hash Maps
    // ---------------------------------------------------------
    const localNameMap = new Map();
    const localIcMap = new Map();

    localDelimaData.forEach((item, index) => {
        // Log sampel pertama untuk pengesahan kunci API
        if (index === 0) {
            console.log("🧪 Sampel Kunci API Supabase:", Object.keys(item));
        }
        
        const name = item.nama_penuh || item.nama;
        const ic = item.no_kp || item.nokp;
        
        const normName = normalizeName(name);
        const normIc = normalizeIC(ic);

        if (normName) localNameMap.set(normName, item);
        if (normIc) localIcMap.set(normIc, item);
    });

    console.log("🛠️ Map Lokal Dibina:", { 
        Nama: localNameMap.size, 
        IC: localIcMap.size 
    });

    // ---------------------------------------------------------
    // PERINGKAT 1: Carian Lokal
    // ---------------------------------------------------------
    for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        // Cari nilai menggunakan pelbagai kemungkinan kunci pengepala
        const rawName = findValueByKeys(row, ['NAMA', 'NAMA MURID', 'NAME']);
        const rawIc = findValueByKeys(row, ['NO. PENGENALAN', 'NO PENGENALAN', 'NO KP', 'IC', 'IDENTIFICATION NO']);

        if (i === 0) {
            console.log("📌 Pengecam Lajur (Baris 1):", {
                "Nama Dikesan": rawName,
                "IC Dikesan": rawIc,
                "Kunci CSV": Object.keys(row)
            });
        }

        if (i % 50 === 0 && typeof progressCallback === 'function') {
            progressCallback(i, excelData.length, "Memproses Peringkat 1...");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const searchName = normalizeName(rawName);
        const searchIc = normalizeIC(rawIc);

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
            unmatchedRecords.push({ row, searchName, searchIc });
            if (searchName && !unmatchedNames.includes(searchName)) {
                unmatchedNames.push(searchName);
            }
        }
    }

    console.log("✅ Peringkat 1 Selesai. Gagal Padan Lokal:", unmatchedRecords.length);

    // ---------------------------------------------------------
    // PERINGKAT 2: Carian Global
    // ---------------------------------------------------------
    if (unmatchedNames.length > 0) {
        console.log("🌐 Memulakan Carian Global untuk:", unmatchedNames.length, "nama unik.");
        
        try {
            const globalResults = await fetchGlobalCallback(unmatchedNames);
            console.log("📥 Data Global Diterima:", globalResults.length, "rekod");

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
        } catch (error) {
            console.error("❌ Ralat Carian Global:", error);
            // Tandakan baki sebagai gagal jika API global ralat
            unmatchedRecords.forEach(record => {
                if (!record.row['STATUS PADANAN']) {
                    record.row['EMEL'] = 'RALAT API';
                    record.row['STATUS PADANAN'] = 'GAGAL (RALAT SISTEM)';
                    stats.failed++;
                }
            });
        }
    }

    console.log("📊 Statistik Akhir:", stats);
    console.groupEnd();

    return {
        finalData: excelData, 
        stats: stats
    };
};