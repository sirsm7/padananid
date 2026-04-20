/**
 * Modul: Enjin Padanan Utama (Core)
 * Folder: /src/js/core/matcher.js
 * Fungsi: Logik Two-Pass Matching untuk membandingkan CSV dengan data Supabase.
 * Arkitek: Pro Web Caster (Carian Berperingkat, Ekstraksi Dinamik & Pengesanan Duplikasi)
 */

import { normalizeName, formatOU } from '../utils/normalizer.js';

/**
 * [NAIK TARAF] buildLookupDictionary kini menyimpan data dalam bentuk Array.
 * Ini membolehkan sistem mengesan jika terdapat lebih dari satu rekod untuk nama yang sama.
 */
const buildLookupDictionary = (supabaseData) => {
    const dictionary = new Map();
    supabaseData.forEach(row => {
        if (row.nama_penuh) {
            const cleanName = normalizeName(row.nama_penuh);
            if (dictionary.has(cleanName)) {
                // Jika nama sudah ada, tambah (push) ke dalam array sedia ada
                dictionary.get(cleanName).push(row);
            } else {
                // Jika belum ada, mulakan array baharu
                dictionary.set(cleanName, [row]);
            }
        }
    });
    return dictionary;
};

// Fungsi utiliti am untuk mencari indeks lajur berdasarkan nama pengepala (header)
const findColumnIndex = (headers, columnName) => {
    return headers.findIndex(header => 
        header && header.toString().trim().toUpperCase() === columnName.toUpperCase()
    );
};

/**
 * [FASA 1] Pemadanan Peringkat Pertama (Berdasarkan Kod Sekolah / OU yang dipilih).
 * Asingkan senarai yang padan, duplikasi, dan senarai yang gagal untuk carian global (Fallback).
 * @param {Array} csvData - Data CSV (2D Array).
 * @param {Array} primaryData - Data rujukan dari Supabase (Khusus untuk sekolah).
 * @returns {Object} Objek mengandungi keputusan berjaya dan senarai untuk Fasa 2.
 */
export const executePhase1 = (csvData, primaryData) => {
    if (!csvData || csvData.length < 2) throw new Error("Data mentah tidak sah.");
    
    const headers = csvData[0];
    const nameColIndex = findColumnIndex(headers, 'NAMA');
    const yearColIndex = findColumnIndex(headers, 'TAHUN / TINGKATAN');
    const classColIndex = findColumnIndex(headers, 'NAMA KELAS');

    if (nameColIndex === -1) throw new Error("Lajur 'NAMA' tidak dijumpai dalam fail yang dimuat naik.");

    const lookupMap = buildLookupDictionary(primaryData);
    
    const matchedResults = [];
    const unmatchedNames = []; // Array string (nama normalisasi untuk query IN clause)
    const unmatchedRows = [];  // Array objek (menyimpan baris CSV asal untuk Fasa 2)
    
    let stats = { total: 0, successPhase1: 0, failedPhase1: 0, duplicatePhase1: 0 };

    for (let i = 1; i < csvData.length; i++) {
        const row = csvData[i];
        if (!row || row.length <= nameColIndex || !row[nameColIndex]) continue;

        stats.total++;
        const rawName = row[nameColIndex];
        const rawYear = yearColIndex !== -1 && row[yearColIndex] ? row[yearColIndex] : '-';
        const rawClass = classColIndex !== -1 && row[classColIndex] ? row[classColIndex] : '-';
        
        const searchName = normalizeName(rawName);
        const matchedRecords = lookupMap.get(searchName);

        if (matchedRecords) {
            if (matchedRecords.length === 1) {
                // Padanan Tepat (Hanya 1 nama wujud di sekolah ini)
                stats.successPhase1++;
                const matchedRecord = matchedRecords[0];
                matchedResults.push({
                    originalName: rawName,
                    tahunTingkatan: rawYear,
                    namaKelas: rawClass,
                    dbName: matchedRecord.nama_penuh,
                    email: matchedRecord.emel,
                    ou: formatOU(matchedRecord.ou), // Menggunakan penapis Regex OU
                    namaSekolah: matchedRecord.nama_sekolah || '-', // Tambahan Lajur Nama Sekolah
                    kategori: matchedRecord.kategori || '-',
                    status: 'PADANAN DITEMUI (SEKOLAH)',
                    statusFlag: true
                });
            } else {
                // Padanan Duplikasi (Lebih dari 1 nama yang sama di sekolah yang sama)
                stats.duplicatePhase1++;
                matchedResults.push({
                    originalName: rawName,
                    tahunTingkatan: rawYear,
                    namaKelas: rawClass,
                    dbName: 'DUPLIKASI REKOD',
                    email: '-',
                    ou: '-',
                    namaSekolah: `Terdapat ${matchedRecords.length} rekod nama yang sama`,
                    kategori: '-',
                    status: 'DATA DUPLICATE, Sila buat carian di delima.tech4ag.my untuk pengesahan',
                    statusFlag: false
                });
            }
        } else {
            stats.failedPhase1++;
            // Simpan ke dalam array khas untuk carian Fallback kelak
            // Menapis 'searchName' yang mungkin kosong akibat normalisasi tak sah
            if (searchName) unmatchedNames.push(searchName);
            unmatchedRows.push({ rawName, rawYear, rawClass, searchName, originalRow: row });
        }
    }

    return { matchedResults, unmatchedNames, unmatchedRows, headers, nameColIndex, stats };
};

/**
 * [FASA 2] Pemadanan Fallback (Carian merentasi seluruh negeri tanpa OU Sekolah yang dipilih).
 * @param {Array} unmatchedRows - Data yang gagal dari Fasa 1.
 * @param {Array} fallbackData - Data rujukan Supabase hasil dari IN clause query.
 * @param {Array} currentResults - Keputusan yang telah berjaya/duplikasi dari Fasa 1.
 * @param {Object} currentStats - Statistik dari Fasa 1.
 * @returns {Object} Keputusan penuh (Fasa 1 + Fasa 2 gabungan).
 */
export const executePhase2 = (unmatchedRows, fallbackData, currentResults, currentStats) => {
    const lookupMap = buildLookupDictionary(fallbackData);
    
    const finalResults = [...currentResults];
    let stats = { ...currentStats, successPhase2: 0, failedTotal: 0 };

    for (const item of unmatchedRows) {
        const matchedRecords = lookupMap.get(item.searchName);

        if (matchedRecords) {
            if (matchedRecords.length === 1) {
                // Padanan Tepat Peringkat Global
                stats.successPhase2++;
                const matchedRecord = matchedRecords[0];
                finalResults.push({
                    originalName: item.rawName,
                    tahunTingkatan: item.rawYear,
                    namaKelas: item.rawClass,
                    dbName: matchedRecord.nama_penuh,
                    email: matchedRecord.emel,
                    ou: formatOU(matchedRecord.ou),
                    namaSekolah: matchedRecord.nama_sekolah || '-',
                    kategori: matchedRecord.kategori || '-',
                    status: 'PADANAN DITEMUI (GLOBAL)',
                    statusFlag: true
                });
            } else {
                // Padanan Duplikasi Peringkat Global
                stats.failedTotal++;
                finalResults.push({
                    originalName: item.rawName,
                    tahunTingkatan: item.rawYear,
                    namaKelas: item.rawClass,
                    dbName: 'DUPLIKASI REKOD',
                    email: '-',
                    ou: '-',
                    namaSekolah: `Terdapat ${matchedRecords.length} rekod nama yang sama di peringkat negeri`,
                    kategori: '-',
                    status: 'DATA DUPLICATE, Sila buat carian di delima.tech4ag.my untuk pengesahan',
                    statusFlag: false
                });
            }
        } else {
            // Gagal Mutlak (Tiada data dijumpai di Melaka)
            stats.failedTotal++;
            finalResults.push({
                originalName: item.rawName,
                tahunTingkatan: item.rawYear,
                namaKelas: item.rawClass,
                // [MODIFIKASI] Tukar 'TIDAK JUMPA' kepada 'TIADA DATA'
                dbName: 'TIADA DATA',
                email: '-',
                ou: '-',
                namaSekolah: '-',
                kategori: '-',
                // [MODIFIKASI] Selaraskan status padanan
                status: 'TIADA DATA, data tiada di OU JPN Melaka',
                statusFlag: false
            });
        }
    }

    // [NAIK TARAF PENGIRAAN STATISTIK]
    // Berjaya = Berjaya Fasa 1 + Berjaya Fasa 2
    // Gagal = Semua (Total) - Semua Berjaya. Ini merangkumi rekod duplikasi dan tidak jumpa.
    stats.success = stats.successPhase1 + stats.successPhase2;
    stats.failed = stats.total - stats.success;

    return { results: finalResults, stats };
};