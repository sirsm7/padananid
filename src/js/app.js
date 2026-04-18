/**
 * Modul: Pengawal Aplikasi Utama (Main Controller) V3
 * Folder: /src/js/app.js
 * Fungsi: Menguruskan kitaran hayat aplikasi, penyelarasan data antara modul, dan tindak balas DOM.
 * Arkitek: Pro Web Caster (Zero-Hallucination Architecture)
 */

// ============================================================================\
// IMPORT MODUL (Standard ES6 Modules)
// ============================================================================\
import { 
    fetchSchoolsList, 
    fetchSchoolData, 
    fetchGlobalMatch 
} from './api.js';

import { 
    UI, 
    populateSchoolDataList, 
    showSelectedSchool, 
    highlightDropzone, 
    unhighlightDropzone, 
    showFileInfo, 
    showProgress, 
    updateProgress, 
    hideProgress, 
    showResults,
    resetFullSystemUI,
    resetFileUploadUI
} from './ui.js';

import { runMatchingEngine } from './matcher.js';
import { readExcelFile, exportToCSV } from './fileHandler.js';

// ============================================================================\
// KEADAAN SISTEM (APPLICATION STATE)
// ============================================================================\
const AppState = {
    allSchools: [],          // Senarai lengkap sekolah (kod_ou, nama_sekolah)
    selectedSchool: null,    // Sekolah yang dipilih pengguna dari datalist
    uploadedExcelData: [],   // Data mentah dari CSV/Excel
    finalMatchedData: [],    // Data yang telah siap diproses (Result)
    isProcessing: false,
    originalFileName: ''
};

// ============================================================================\
// FUNGSI UTAMA (LOGIK PERNIAGAAN)
// ============================================================================\

/**
 * Inisialisasi Aplikasi
 * Memuatkan senarai sekolah dari API Supabase semasa halaman dimuatkan.
 */
async function initApp() {
    console.log("🚀 Inisialisasi Sistem Padanan ID V3...");
    try {
        const schools = await fetchSchoolsList();
        if (schools && schools.length > 0) {
            AppState.allSchools = schools;
            populateSchoolDataList(schools);
            console.log(`✅ ${schools.length} sekolah berjaya dimuatkan.`);
        }
    } catch (error) {
        console.error("❌ Kegagalan inisialisasi:", error);
    }
}

/**
 * Pengendali Muat Naik Fail
 */
async function handleFileUpload(file) {
    if (!file) return;

    try {
        AppState.originalFileName = file.name;
        const data = await readExcelFile(file);
        
        if (data && data.length > 0) {
            AppState.uploadedExcelData = data;
            showFileInfo(file.name, data.length);
            console.log(`📂 Fail diterima: ${file.name} (${data.length} baris)`);
        }
    } catch (error) {
        console.error("❌ Ralat membaca fail:", error);
        alert(`Gagal membaca fail: ${error.message}`);
    }
}

/**
 * Logik Enjin Padanan (Triggered by Button)
 */
async function startMatchingProcess() {
    if (AppState.isProcessing) return;
    
    // Validasi input
    if (AppState.uploadedExcelData.length === 0) {
        alert("Sila muat naik fail data terlebih dahulu.");
        return;
    }

    if (!AppState.selectedSchool) {
        alert("Sila pilih nama sekolah yang sah dari senarai.");
        return;
    }

    try {
        AppState.isProcessing = true;
        
        // FASA 1: Tarik Data Skop Sekolah (Tier 1)
        showProgress("Mengambil Data Skop Sekolah", `Menghubungi Supabase untuk OU: ${AppState.selectedSchool.kod_ou}...`);
        const localDbData = await fetchSchoolData(AppState.selectedSchool.kod_ou);

        // FASA 2: Jalankan Enjin Padanan (Tier 1 & Tier 2)
        showProgress("Menjalankan Padanan", "Menganalisis data baris demi baris...");
        
        const result = await runMatchingEngine(
            AppState.uploadedExcelData,
            localDbData,
            fetchGlobalMatch, // Callback untuk carian global
            updateProgress    // Callback untuk kemas kini UI
        );

        // Simpan hasil akhir
        AppState.finalMatchedData = result.finalData;
        
        // Papar keputusan di UI
        hideProgress();
        showResults(result.stats);
        
        console.log("✅ Proses padanan selesai sepenuhnya.");

    } catch (error) {
        hideProgress();
        console.error("❌ Ralat semasa proses padanan:", error);
        alert("Terjadi ralat kritikal semasa proses padanan. Sila semak konsol.");
    } finally {
        AppState.isProcessing = false;
    }
}

// ============================================================================\
// PENGENDALI EVENT (EVENT LISTENERS)
// ============================================================================\

document.addEventListener('DOMContentLoaded', () => {
    // 1. Jalankan Init
    initApp();

    // 2. Drag & Drop Events
    UI.dropzone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        highlightDropzone();
    });

    UI.dropzone?.addEventListener('dragleave', unhighlightDropzone);

    UI.dropzone?.addEventListener('drop', (e) => {
        e.preventDefault();
        unhighlightDropzone();
        const file = e.dataTransfer.files[0];
        handleFileUpload(file);
    });

    // 3. File Input Click
    UI.fileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        handleFileUpload(file);
    });

    // 4. Batalkan Muat Naik
    UI.cancelUploadBtn?.addEventListener('click', () => {
        AppState.uploadedExcelData = [];
        resetFileUploadUI();
    });

    // 5. Pemilihan Sekolah (Input + Datalist Logic)
    UI.schoolSearchInput?.addEventListener('input', (e) => {
        const value = e.target.value;
        // Cari objek sekolah yang tepat dari senarai
        const found = AppState.allSchools.find(s => s.nama_sekolah === value);
        
        if (found) {
            AppState.selectedSchool = found;
            showSelectedSchool(found.nama_sekolah, found.kod_ou);
        } else {
            AppState.selectedSchool = null;
        }
    });

    // 6. Butang Mula Padanan
    UI.startMatchingBtn?.addEventListener('click', startMatchingProcess);

    // 7. Butang Muat Turun CSV
    UI.downloadResultBtn?.addEventListener('click', () => {
        if (AppState.finalMatchedData.length > 0) {
            exportToCSV(AppState.finalMatchedData, AppState.originalFileName);
        }
    });

    // 8. Butang Reset Sistem
    UI.resetAppBtn?.addEventListener('click', () => {
        if (confirm("Adakah anda pasti untuk mengosongkan semua data dan memulakan padanan baru?")) {
            AppState.uploadedExcelData = [];
            AppState.finalMatchedData = [];
            AppState.selectedSchool = null;
            resetFullSystemUI();
        }
    });
});