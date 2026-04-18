/**
 * Modul: Pengawal Utama Sistem (App Controller)
 * Folder: /src/js/app.js
 * Fungsi: Mengkoordinasi antara UI, Data, dan Enjin Padanan. Menangani kitaran logik sistem.
 * Arkitek: Pro Web Caster (Migrasi ke Standalone Client-Side)
 */

import { 
    UI, 
    logMessage, 
    clearLogs, 
    updateDbStatus, 
    showFileInfo, 
    updateProgress, 
    renderTable, 
    updateStats 
} from './ui/dom.js';

import { checkSupabaseConnection, fetchDelimaData } from './services/supabase.js';
import { executeMatching } from './core/matcher.js';

// ============================================================================
// PENGURUSAN KEADAAN (STATE MANAGEMENT)
// ============================================================================
let currentCsvFile = null;
let finalMatchResults = [];

// ============================================================================
// INISIALISASI SISTEM
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    logMessage('Sistem memulakan proses inisialisasi...', 'info');
    
    // 1. Semak Ketersambungan Pangkalan Data Supabase
    const isDbConnected = await checkSupabaseConnection();
    updateDbStatus(isDbConnected);
    
    if (isDbConnected) {
        logMessage('Pangkalan data Supabase berjaya disambungkan.', 'success');
    } else {
        logMessage('Gagal menyambung ke pangkalan data Supabase. Sila semak konfigurasi (URL/Key).', 'error');
    }

    // 2. Pasang Pendengar Peristiwa (Event Listeners)
    setupEventListeners();
});

// ============================================================================
// PENGENDALIAN PERISTIWA (EVENT LISTENERS)
// ============================================================================
const setupEventListeners = () => {
    // A. Pengendalian Log
    UI.btnClearLogs.addEventListener('click', clearLogs);

    // B. Pengendalian Butang Tindakan
    UI.btnProcess.addEventListener('click', handleDataProcessing);
    UI.btnDownload.addEventListener('click', handleDownloadResults);

    // C. Pengendalian Muat Naik Fail (Input Biasa)
    UI.fileInput.addEventListener('change', (e) => processFileSelection(e.target.files[0]));

    // D. Pengendalian Seret & Lepas (Drag and Drop)
    UI.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        UI.dropZone.classList.add('border-brand-500', 'bg-brand-50');
    });

    UI.dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        UI.dropZone.classList.remove('border-brand-500', 'bg-brand-50');
    });

    UI.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        UI.dropZone.classList.remove('border-brand-500', 'bg-brand-50');
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFileSelection(e.dataTransfer.files[0]);
        }
    });
};

// ============================================================================
// LOGIK PEMPROSESAN FAIL TEMPATAN
// ============================================================================
const processFileSelection = (file) => {
    if (!file) return;

    // Pengesahan Format
    if (!file.name.toLowerCase().endsWith('.csv')) {
        logMessage(`Penolakan Fail: "${file.name}" bukan berformat .CSV`, 'error');
        return;
    }

    currentCsvFile = file;

    // Gunakan PapaParse untuk membaca secara pantas jumlah baris
    window.Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
            const rowCount = results.data.length;
            showFileInfo(file.name, rowCount);
            logMessage(`Fail "${file.name}" dimuat naik (${rowCount} baris dikesan). Sedia untuk proses.`, 'info');
        },
        error: (err) => {
            logMessage(`Ralat membaca fail: ${err.message}`, 'error');
        }
    });
};

// ============================================================================
// LOGIK TERAS: PROSES PADANAN (MATCHING)
// ============================================================================
const handleDataProcessing = async () => {
    if (!currentCsvFile) {
        logMessage('Tiada fail CSV dipilih untuk diproses.', 'warning');
        return;
    }

    try {
        // Kunci UI
        UI.btnProcess.disabled = true;
        UI.btnDownload.disabled = true;
        logMessage('Memulakan sesi padanan data...', 'info');
        
        // Fasa 1: Baca CSV ke dalam memory pelayar
        updateProgress(10, 'Membaca fail CSV tempatan...');
        const csvData = await new Promise((resolve, reject) => {
            window.Papa.parse(currentCsvFile, {
                header: false, // Kita guna array 2D untuk pencarian baris dinamik dalam matcher
                skipEmptyLines: true,
                complete: (results) => resolve(results.data),
                error: (err) => reject(err)
            });
        });

        // Fasa 2: Tarik Data dari Supabase
        updateProgress(40, 'Menarik data dari Supabase (Sila tunggu)...');
        logMessage('Menjalankan API Request ke Supabase...', 'info');
        const supabaseData = await fetchDelimaData();
        logMessage(`Berjaya menarik ${supabaseData.length} rekod rujukan dari pangkalan data.`, 'success');

        // Fasa 3: Laksanakan Enjin Padanan
        updateProgress(70, 'Melaksanakan logik padanan nama...');
        const { results, stats } = executeMatching(csvData, supabaseData);
        
        // Simpan hasil ke memori global untuk muat turun
        finalMatchResults = results;

        // Fasa 4: Render UI
        updateProgress(90, 'Mengemas kini antaramuka dan jadual...');
        renderTable(results);
        updateStats(stats);

        // Tamat
        updateProgress(100, 'Proses selesai sepenuhnya');
        logMessage(`Padanan Selesai! Berjaya: ${stats.success} | Gagal: ${stats.failed}`, 'success');
        
        // Buka butang muat turun
        UI.btnDownload.disabled = false;

    } catch (error) {
        logMessage(`[RALAT KRITIKAL] Operasi dihentikan: ${error.message}`, 'error');
        updateProgress(0, 'Ralat Berlaku');
    } finally {
        // Buka semula butang proses
        UI.btnProcess.disabled = false;
    }
};

// ============================================================================
// LOGIK MUAT TURUN HASIL PADANAN (EXPORT)
// ============================================================================
const handleDownloadResults = () => {
    if (!finalMatchResults || finalMatchResults.length === 0) {
        logMessage('Tiada hasil padanan untuk dimuat turun.', 'warning');
        return;
    }

    logMessage('Menjana fail CSV hasil padanan...', 'info');

    // Menukar format struktur untuk eksport CSV
    const exportFormat = finalMatchResults.map((row, index) => ({
        'Bil': index + 1,
        'Nama APDM (Asal)': row.originalName,
        'Nama DELIMa (Pangkalan Data)': row.dbName,
        'Emel DELIMa': row.email,
        'Kod Sekolah / OU': row.ou,
        'Kategori': row.kategori,
        'Status Padanan': row.status
    }));

    // Generate teks CSV menggunakan PapaParse
    const csvString = window.Papa.unparse(exportFormat);
    
    // Cipta objek Blob untuk memulakan muat turun di pelayar pengguna
    const blob = new Blob(["\ufeff", csvString], { type: 'text/csv;charset=utf-8;' }); // Menambah BOM (\ufeff) untuk sokongan Excel UTF-8
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadLink.href = url;
    downloadLink.download = `Hasil_Padanan_DELIMa_${timestamp}.csv`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    logMessage('Fail CSV berjaya dimuat turun.', 'success');
};