/**
 * Modul: Normalisasi (Utility)
 * Folder: /src/js/utils/normalizer.js
 * Fungsi: Membersihkan teks/nama dan memformat data khusus (seperti Kod OU).
 * Arkitek: Pro Web Caster (Two-Pass Matching Update)
 */

/**
 * Fungsi utama untuk menormalisasikan nama pelajar bagi membolehkan padanan yang tepat.
 * @param {string} name - Nama mentah dari CSV atau Pangkalan Data.
 * @returns {string} - Nama yang telah dinormalisasi sepenuhnya.
 */
export const normalizeName = (name) => {
    if (!name || typeof name !== 'string') {
        return '';
    }

    let normalized = name.toUpperCase();
    normalized = normalized.split('@')[0];

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

    tagsToRemove.forEach(tag => {
        normalized = normalized.replace(tag, '');
    });

    normalized = normalized.replace(/\s+/g, ' ').trim();
    return normalized;
};

/**
 * [BARU] Memformat kod OU untuk hanya memulangkan siri nombor di penghujung.
 * Contoh: "/JPN/MELAKA/M020/SEKOLAH-1234" -> "1234"
 * @param {string} rawOu - Kod OU mentah dari pangkalan data.
 * @returns {string} - Kod OU yang telah diekstrak nombornya sahaja.
 */
export const formatOU = (rawOu) => {
    if (!rawOu || typeof rawOu !== 'string') return '-';
    
    // Cari rentetan nombor yang berada di penghujung teks ($)
    const match = rawOu.match(/\d+$/);
    
    // Pulangkan nombor jika dijumpai, jika tidak pulangkan nilai asal sebagai sandaran (fallback)
    return match ? match[0] : rawOu;
};