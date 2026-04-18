/**
 * Modul: Enjin Padanan Utama (Core)
 * Folder: /src/js/core/matcher.js
 * Fungsi: Logik Two-Pass Matching untuk membandingkan CSV dengan data Supabase.
 * Arkitek: Pro Web Caster (Carian Berperingkat)
 */

import { normalizeName, formatOU } from '../utils/normalizer.js';

const buildLookupDictionary = (supabaseData) => {
    const dictionary = new Map();
    supabaseData.forEach(row => {
        if (row.nama_penuh) {
            const cleanName = normalizeName(row.nama_penuh);
            dictionary.set(cleanName, row);
        }
    });
    return dictionary;
};

const findNameColumnIndex = (headers) => {
    return headers.findIndex(header => 
        header && header.toString().trim().toUpperCase() === 'NAMA'
    );
};

/**
 * [FASA 1] Pemadanan Peringkat Pertama (Berdasarkan Kod Sekolah / OU yang dipilih).
 * Asingkan senarai yang padan dan senarai yang gagal untuk carian global (Fallback).
 * @param {Array} csvData - Data CSV (2D Array).
 * @param {Array} primaryData - Data rujukan dari Supabase (Khusus untuk sekolah).
 * @returns {Object} Objek mengandungi keputusan berjaya dan senarai untuk Fasa 2.
 */
export const executePhase1 = (csvData, primaryData) => {
    if (!csvData || csvData.length < 2) throw new Error("Data mentah tidak sah.");
    
    const headers = csvData[0];
    const nameColIndex = findNameColumnIndex(headers);

    if (nameColIndex === -1) throw new Error("Lajur 'NAMA' tidak dijumpai.");

    const lookupMap = buildLookupDictionary(primaryData);
    
    const matchedResults = [];
    const unmatchedNames = []; // Array string (nama normalisasi untuk query IN clause)
    const unmatchedRows = [];  // Array objek (menyimpan baris CSV asal untuk Fasa 2)
    
    let stats = { total: 0, successPhase1: 0, failedPhase1: 0 };

    for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i];
        if (!row || row.length <= nameColIndex || !row[nameColIndex]) continue;

        stats.total++;
        const rawName = row[nameColIndex];
        const searchName = normalizeName(rawName);
        const matchedRecord = lookupMap.get(searchName);

        if (matchedRecord) {
            stats.successPhase1++;
            matchedResults.push({
                originalName: rawName,
                dbName: matchedRecord.nama_penuh,
                email: matchedRecord.emel,
                ou: formatOU(matchedRecord.ou), // Menggunakan penapis Regex OU
                namaSekolah: matchedRecord.nama_sekolah || '-', // Tambahan Lajur Nama Sekolah
                kategori: matchedRecord.kategori || '-',
                status: 'PADANAN DITEMUI (SEKOLAH)',
                statusFlag: true
            });
        } else {
            stats.failedPhase1++;
            // Simpan ke dalam array khas untuk carian Fallback kelak
            // Menapis 'searchName' yang mungkin kosong akibat normalisasi tak sah
            if (searchName) unmatchedNames.push(searchName);
            unmatchedRows.push({ rawName, searchName, originalRow: row });
        }
    }

    return { matchedResults, unmatchedNames, unmatchedRows, headers, nameColIndex, stats };
};

/**
 * [FASA 2] Pemadanan Fallback (Carian merentasi seluruh negeri/negara).
 * @param {Array} unmatchedRows - Data yang gagal dari Fasa 1.
 * @param {Array} fallbackData - Data rujukan Supabase hasil dari IN clause query.
 * @param {Array} currentResults - Keputusan yang telah berjaya dari Fasa 1.
 * @param {Object} currentStats - Statistik dari Fasa 1.
 * @returns {Object} Keputusan penuh (Fasa 1 + Fasa 2 gabungan).
 */
export const executePhase2 = (unmatchedRows, fallbackData, currentResults, currentStats) => {
    const lookupMap = buildLookupDictionary(fallbackData);
    
    const finalResults = [...currentResults];
    let stats = { ...currentStats, successPhase2: 0, failedTotal: 0 };

    for (const item of unmatchedRows) {
        const matchedRecord = lookupMap.get(item.searchName);

        if (matchedRecord) {
            stats.successPhase2++;
            finalResults.push({
                originalName: item.rawName,
                dbName: matchedRecord.nama_penuh,
                email: matchedRecord.emel,
                ou: formatOU(matchedRecord.ou),
                namaSekolah: matchedRecord.nama_sekolah || '-',
                kategori: matchedRecord.kategori || '-',
                status: 'PADANAN DITEMUI (GLOBAL)',
                statusFlag: true
            });
        } else {
            stats.failedTotal++;
            finalResults.push({
                originalName: item.rawName,
                dbName: 'TIDAK JUMPA',
                email: '-',
                ou: '-',
                namaSekolah: '-',
                kategori: '-',
                status: 'TIADA DALAM SISTEM',
                statusFlag: false
            });
        }
    }

    // Kira jumlah akhir untuk UI
    stats.success = stats.successPhase1 + stats.successPhase2;
    stats.failed = stats.failedTotal;

    return { results: finalResults, stats };
};