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
let processedUploadData = null; // Tambahan: Simpan data yang telah diproses dari fail Excel/CSV

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

    const fileName = file.name.toLowerCase();
    
    // Pengesahan Format (Dikemas kini untuk Excel)
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        logMessage(`Penolakan Fail: "${file.name}" tidak disokong. Sila gunakan format .CSV atau Excel (.XLSX/.XLS)`, 'error');
        return;
    }

    currentCsvFile = file;

    // Logik Pemprosesan Berdasarkan Jenis Fail
    if (fileName.endsWith('.csv')) {
        // Gunakan PapaParse untuk fail CSV
        window.Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const rowCount = results.data.length;
                processedUploadData = results.data; // Simpan ke pembolehubah global
                showFileInfo(file.name, rowCount);
                logMessage(`Fail CSV "${file.name}" dimuat naik (${rowCount} baris dikesan). Sedia untuk proses.`, 'info');
            },
            error: (err) => {
                logMessage(`Ralat membaca fail CSV: ${err.message}`, 'error');
            }
        });
    } else {
        // Gunakan SheetJS untuk fail Excel (.xlsx, .xls)
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // Baca buku kerja Excel
                const workbook = window.XLSX.read(data, { type: 'array' });
                
                // Ambil helaian (worksheet) pertama
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Tukar kepada format matriks 2D (Sama seperti PapaParse)
                // { header: 1 } memaksa output menjadi Array of Arrays
                const jsonArray = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
                
                const rowCount = jsonArray.length;
                processedUploadData = jsonArray; // Simpan ke pembolehubah global
                showFileInfo(file.name, rowCount);
                logMessage(`Fail Excel "${file.name}" dimuat naik (${rowCount} baris dikesan pada helaian "${firstSheetName}"). Sedia untuk proses.`, 'info');
                
            } catch (err) {
                logMessage(`Ralat membaca fail Excel: Sila pastikan fail tidak rosak. Mesej: ${err.message}`, 'error');
            }
        };
        
        reader.onerror = () => {
            logMessage("Ralat semasa membaca fail dari sistem.", 'error');
        };
        
        reader.readAsArrayBuffer(file);
    }
};

// ============================================================================
// LOGIK TERAS: PROSES PADANAN (MATCHING)
// ============================================================================
const handleDataProcessing = async () => {
    if (!currentCsvFile || !processedUploadData) {
        logMessage('Tiada fail sah dipilih untuk diproses.', 'warning');
        return;
    }

    try {
        // Kunci UI
        UI.btnProcess.disabled = true;
        UI.btnDownload.disabled = true;
        logMessage('Memulakan sesi padanan data...', 'info');
        
        // Fasa 1: Baca data dari memori (Sudah dibaca semasa 'processFileSelection')
        updateProgress(10, `Membaca data tempatan dari fail ${currentCsvFile.name}...`);
        const uploadData = processedUploadData;

        // Fasa 2: Tarik Data dari Supabase
        updateProgress(40, 'Menarik data dari Supabase (Sila tunggu)...');
        logMessage('Menjalankan API Request ke Supabase...', 'info');
        const supabaseData = await fetchDelimaData();
        logMessage(`Berjaya menarik ${supabaseData.length} rekod rujukan dari pangkalan data.`, 'success');

        // Fasa 3: Laksanakan Enjin Padanan
        updateProgress(70, 'Melaksanakan logik padanan nama...');
        const { results, stats } = executeMatching(uploadData, supabaseData); // Tukar csvData ke uploadData
        
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