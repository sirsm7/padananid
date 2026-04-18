/**
 * Modul: Normalisasi Nama (Utility)
 * Folder: /src/js/utils/normalizer.js
 * Fungsi: Membersihkan dan menormalisasi teks/nama untuk meningkatkan ketepatan padanan data.
 * Arkitek: Pro Web Caster (Migrasi daripada Normalisasi.gs ke ES6 Module)
 */

/**
 * Fungsi utama untuk menormalisasikan nama pelajar bagi membolehkan padanan yang tepat.
 * Logik ini membuang alias (@), tag KPM (KPM-MURID, dll), dan ruang kosong berlebihan.
 * * @param {string} name - Nama mentah dari CSV atau Pangkalan Data.
 * @returns {string} - Nama yang telah dinormalisasi sepenuhnya.
 */
export const normalizeName = (name) => {
    // Pengesahan integriti data: Kembalikan rentetan kosong jika tiada data atau format tidak sah
    if (!name || typeof name !== 'string') {
        return '';
    }

    // 1. Tukar semua aksara kepada Huruf Besar (Uppercase)
    let normalized = name.toUpperCase();

    // 2. Buang sebarang tag '@' (Contoh: "MOHD @ MOHAMMAD" menjadi "MOHD ")
    // Juga berfungsi membuang sambungan emel jika data termasuk alamat emel secara tidak sengaja
    normalized = normalized.split('@')[0];

    // 3. Senarai Corak Regex untuk menggugurkan akhiran sistem pelik
    const tagsToRemove = [
        /\(KPM-MURID\)/g,
        /KPM-MURID/g,
        /\(KPM-GURU\)/g,
        /KPM-GURU/g,
        /\(KPM-PPD\)/g,
        /KPM-PPD/g,
        /\(MOE\)/g,
        /MOE/g
    ];

    // Laksana pembuangan tag secara iteratif
    tagsToRemove.forEach(tag => {
        normalized = normalized.replace(tag, '');
    });

    // 4. Bersihkan ruang kosong (spaces)
    // - Tukar pelbagai ruang kosong berturut-turut menjadi satu ruang kosong sahaja
    // - Trim ruang kosong di permulaan dan pengakhiran rentetan
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
};