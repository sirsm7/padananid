/**
 * Modul: Enjin Padanan Data (Name-Only Edition)
 * Folder: /src/js/matcher.js
 * Fungsi: Logik padanan berdasarkan NAMA sahaja mengikut skema Supabase terkini.
 * Arkitek: Pro Web Caster (Zero-Hallucination V3.1)
 * Nota: Lajur IC dibuang kerana tidak wujud dalam skema pangkalan data.
 */

/**
 * Normalisasi Nama (Standard GAS / DELIMa)
 * Memastikan perbandingan string adalah kalis ralat (case-insensitive & clean).
 */
export const normalizeName = (name) => {
    if (!name || typeof name !== 'string') return '';
    let cleanName = name.toUpperCase();
    
    // Buang bahagian emel jika ada (cth: AHMAD@moe-dl.edu.my)
    cleanName = cleanName.split('@')[0];
    cleanName = cleanName.trim();
    
    // Buang suffix kategori DELIMa yang biasa
    cleanName = cleanName.replace(/\s*(MOE|KPM[- ]?MURID|KPM[- ]?GURU)$/g, '');
    
    // Buang simbol khas kecuali ruang kosong
    cleanName = cleanName.replace(/[^A-Z0-9\s]/g, '');
    
    // Buang ruang kosong berlebihan
    cleanName = cleanName.replace(/\s+/g, ' ');
    
    return cleanName.trim();
};

/**
 * Ekstrak Kod OU
 * Memastikan kod OU yang dipulangkan adalah format angka bersih (jika perlu).
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
        const targetKey = rowKeys.find(rKey => 
            rKey.trim().toUpperCase() === pKey.toUpperCase()
        );
        if (targetKey) return row[targetKey];
    }
    return null;
};

/**
 * Enjin Padanan Utama (Skop Nama Sahaja)
 */
export const runMatchingEngine = async (excelData, localDelimaData, fetchGlobalCallback, progressCallback) => {
    console.group("🔍 PROSES AUDIT PADANAN (NAME-ONLY) BERMULA");
    console.log("📊 Data CSV Diterima:", excelData.length, "rekod");
    console.log("📊 Data API Sekolah (Lokal):", localDelimaData.length, "rekod");

    const stats = {
        total: excelData.length,
        successTier1: 0, // Padanan sekolah
        successTier2: 0, // Padanan global
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
    // PRA-PEMPROSESAN: Bina Hash Map Nama Lokal
    // ---------------------------------------------------------
    const localNameMap = new Map();

    localDelimaData.forEach((item) => {
        // Skema Supabase: menggunakan 'nama_penuh'
        const name = item.nama_penuh || item.nama;
        const normName = normalizeName(name);

        if (normName) {
            // Jika ada nama bertindih, kita ambil yang pertama (boleh ditambah logik keutamaan jika perlu)
            if (!localNameMap.has(normName)) {
                localNameMap.set(normName, item);
            }
        }
    });

    console.log("🛠️ Map Lokal Dibina (Nama Unik):", localNameMap.size);

    // ---------------------------------------------------------
    // PERINGKAT 1: Carian Lokal (Skop Sekolah/OU)
    // ---------------------------------------------------------
    for (let i = 0; i < excelData.length; i++) {
        const row = excelData[i];
        
        // Pengecam lajur dinamik untuk lajur NAMA
        const rawName = findValueByKeys(row, ['NAMA', 'NAMA MURID', 'NAME', 'NAMA PENUH']);

        if (i % 50 === 0 && typeof progressCallback === 'function') {
            progressCallback(i, excelData.length, "Memproses Peringkat 1 (Carian Sekolah)...");
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const searchName = normalizeName(rawName);
        let match = null;

        if (searchName) {
            match = localNameMap.get(searchName);
        }

        if (match) {
            // Kemaskini baris Excel dengan data dari Supabase
            row['EMEL'] = match.emel || '';
            row['NAMA SEKOLAH'] = match.nama_sekolah || '';
            row['KOD OU'] = extractOU(match.ou);
            row['STATUS PADANAN'] = 'BERJAYA (SKOP SEKOLAH)';
            stats.successTier1++;
        } else {
            // Simpan untuk carian global peringkat 2
            unmatchedRecords.push({ row, searchName });
            if (searchName && !unmatchedNames.includes(searchName)) {
                unmatchedNames.push(searchName);
            }
        }
    }

    console.log("✅ Peringkat 1 Selesai. Gagal Padan Lokal:", unmatchedRecords.length);

    // ---------------------------------------------------------
    // PERINGKAT 2: Carian Global (Jika Peringkat 1 Gagal)
    // ---------------------------------------------------------
    if (unmatchedNames.length > 0) {
        console.log("🌐 Memulakan Carian Global untuk:", unmatchedNames.length, "nama unik.");
        
        try {
            const globalResults = await fetchGlobalCallback(unmatchedNames);
            
            const globalNameMap = new Map();
            globalResults.forEach(item => {
                const normName = normalizeName(item.nama_penuh || item.nama);
                if (normName && !globalNameMap.has(normName)) {
                    globalNameMap.set(normName, item);
                }
            });

            for (const record of unmatchedRecords) {
                const { row, searchName } = record;
                const match = globalNameMap.get(searchName);

                if (match) {
                    row['EMEL'] = match.emel || '';
                    row['NAMA SEKOLAH'] = match.nama_sekolah || '';
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
            unmatchedRecords.forEach(record => {
                record.row['EMEL'] = 'RALAT API';
                record.row['STATUS PADANAN'] = 'GAGAL (RALAT SISTEM)';
                stats.failed++;
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