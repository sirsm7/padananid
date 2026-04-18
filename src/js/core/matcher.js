/**
 * Modul: Enjin Padanan Utama (Core)
 * Folder: /src/js/core/matcher.js
 * Fungsi: Membandingkan data CSV APDM dengan data Supabase menggunakan nama dinormalisasi.
 * Arkitek: Pro Web Caster (Migrasi ke Standalone Client-Side)
 */

import { normalizeName } from '../utils/normalizer.js';

/**
 * Membina kamus carian pantas (Hash Map) daripada data Supabase.
 * Kunci (Key) adalah Nama Normalisasi, Nilai (Value) adalah data penuh pelajar.
 * * @param {Array} supabaseData - Tatasusunan data mentah dari pangkalan data.
 * @returns {Map} - Kamus carian O(1) untuk pemadanan pantas.
 */
const buildLookupDictionary = (supabaseData) => {
    const dictionary = new Map();
    
    supabaseData.forEach(row => {
        // Ambil nama penuh dan normalisasikannya
        if (row.nama_penuh) {
            const cleanName = normalizeName(row.nama_penuh);
            
            // Simpan ke dalam Map. Jika ada nama pendua (kemungkinan jarang), 
            // data terakhir yang ditarik akan menimpa data awal.
            // Dalam sistem yang lebih kompleks, kita mungkin perlu menyimpan Array
            // untuk menangani nama yang 100% serupa (kes pendua).
            dictionary.set(cleanName, row);
        }
    });

    return dictionary;
};

/**
 * Mencari indeks lajur "NAMA" secara dinamik dari baris pengepala (header) CSV.
 * Berfungsi sebagai sandaran (fallback) jika format CSV APDM berubah posisi lajur.
 * * @param {Array} headers - Baris pertama dari data CSV (Senarai lajur).
 * @returns {number} - Indeks sifar-berasaskan lajur "NAMA", atau -1 jika tidak dijumpai.
 */
const findNameColumnIndex = (headers) => {
    // Memandangkan CSV APDM mempunyai pengepala spesifik "NAMA"
    return headers.findIndex(header => 
        header && header.toString().trim().toUpperCase() === 'NAMA'
    );
};

/**
 * Proses Teras: Menjalankan padanan (cross-match) antara data CSV dan Supabase.
 * * @param {Array} csvData - Data matriks 2D daripada PapaParse (termasuk baris header).
 * @param {Array} supabaseData - Data JSON Array dari panggilan fetch Supabase.
 * @returns {Object} - Objek mengandungi 'results' (Array untuk jadual pratonton) dan 'stats'.
 */
export const executeMatching = (csvData, supabaseData) => {
    
    // Semakan Integriti: Memastikan kedua-dua sumber wujud dan bukan kosong
    if (!csvData || csvData.length < 2) {
        throw new Error("Data CSV tidak sah atau tiada baris untuk diproses.");
    }
    if (!supabaseData || supabaseData.length === 0) {
        throw new Error("Tiada data rujukan dari Supabase untuk dibuat padanan.");
    }

    // Ekstrak baris pertama sebagai Header
    const headers = csvData[0];
    const nameColIndex = findNameColumnIndex(headers);

    if (nameColIndex === -1) {
        throw new Error("Gagal mencari lajur yang berlabel 'NAMA' di dalam baris pertama CSV.");
    }

    // Bina kamus O(1) Lookup
    console.log(`[MATCHER] Membina kamus daripada ${supabaseData.length} rekod rujukan...`);
    const lookupMap = buildLookupDictionary(supabaseData);

    // Pembolehubah untuk memegang keputusan
    const matchResults = [];
    let stats = { success: 0, failed: 0, total: 0 };

    // Proses lelaran bermula dari baris ke-2 (Index 1) memandangkan baris 0 adalah Header
    for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i];
        
        // Langkau baris kosong di penghujung fail CSV
        if (!row || row.length <= nameColIndex || !row[nameColIndex]) {
            continue; 
        }

        stats.total++;
        const rawApdmName = row[nameColIndex];
        const searchName = normalizeName(rawApdmName);

        // Pelaksanaan Carian Pantas
        const matchedRecord = lookupMap.get(searchName);

        if (matchedRecord) {
            // Padanan Berjaya
            stats.success++;
            matchResults.push({
                originalName: rawApdmName,
                dbName: matchedRecord.nama_penuh,
                email: matchedRecord.emel,
                ou: matchedRecord.ou || '-',
                kategori: matchedRecord.kategori || '-',
                status: 'PADANAN DITEMUI',
                statusFlag: true // Flag Boolean untuk pengurusan UI (contohnya warna hijau)
            });
        } else {
            // Padanan Gagal
            stats.failed++;
            matchResults.push({
                originalName: rawApdmName,
                dbName: 'TIDAK JUMPA',
                email: '-',
                ou: '-',
                kategori: '-',
                status: 'TIADA DALAM SISTEM',
                statusFlag: false // Flag Boolean untuk pengurusan UI (contohnya warna merah)
            });
        }
    }

    console.log(`[MATCHER] Selesai. Disemak: ${stats.total} | Berjaya: ${stats.success} | Gagal: ${stats.failed}`);
    
    return {
        results: matchResults,
        stats: stats
    };
};