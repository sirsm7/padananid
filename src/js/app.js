/**
 * Modul: Pengawal Aplikasi Utama (Main Controller)
 * Folder: /src/js/app.js
 * Fungsi: Mengurus kitaran hayat aplikasi, state (keadaan) data, dan event listeners DOM.
 * Arkitek: Pro Web Caster (Strict SoC Enforced)
 */

// ============================================================================
// IMPORT MODUL (ES6 Modules)
// ============================================================================
import { fetchSchoolsList, fetchSchoolData, fetchGlobalMatch } from './api.js';
import { UI, renderSchoolDropdown, closeSchoolDropdown, showSelectedSchool, setSchoolDataReadyState, highlightDropzone, unhighlightDropzone, showFileInfo, showProgress, updateProgress, hideProgress, showResults } from './ui.js';
import { runMatchingEngine } from './matcher.js';
import { readExcelFile, exportToCSV } from './fileHandler.js';

// ============================================================================
// KEADAAN SISTEM (APPLICATION STATE)
// ============================================================================
const AppState = {
    allSchools: [],          // Menyimpan senarai sekolah dari API
    selectedSchool: null,    // Menyimpan objek sekolah terpilih
    localDelimaData: [],     // Menyimpan data emel bagi skop Peringkat 1
    uploadedExcelData: [],   // Menyimpan data JSON fail Excel/CSV muat naik
    originalFileName: '',    // Menyimpan nama fail muat naik untuk nama eksport
    finalMatchedData: null   // Menyimpan hasil akhir padanan
};

// ============================================================================
// FUNGSI INIT (BOOTSTRAPPING)
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Pro Web Caster: Memulakan sistem Hibrid...");
    
    // Bind semua event listener
    setupEventListeners();

    // Dapatkan senarai sekolah semasa aplikasi dibuka
    try {
        UI.schoolSearchInput.placeholder = "Memuat turun senarai sekolah...";
        UI.schoolSearchInput.disabled = true;
        
        AppState.allSchools = await fetchSchoolsList();
        
        UI.schoolSearchInput.placeholder = "Taip nama sekolah atau kod sekolah...";
        UI.schoolSearchInput.disabled = false;
        console.log(`Berjaya memuatkan ${AppState.allSchools.length} sekolah.`);
    } catch (error) {
        console.error("Gagal memulakan senarai sekolah:", error);
        UI.schoolSearchInput.placeholder = "Gagal memuat turun data sekolah.";
    }
});

// ============================================================================
// PENGIKATAN PERISTIWA (EVENT LISTENERS)
// ============================================================================
function setupEventListeners() {
    
    // --- LANGKAH 1: DROPDOWN SEKOLAH ---
    UI.schoolSearchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.trim();
        renderSchoolDropdown(AppState.allSchools, searchText, handleSchoolSelection);
    });

    UI.schoolSearchInput.addEventListener('focus', (e) => {
        const searchText = e.target.value.trim();
        if (searchText) renderSchoolDropdown(AppState.allSchools, searchText, handleSchoolSelection);
    });

    // Tutup dropdown jika pengguna klik di luar kawasan
    document.addEventListener('mousedown', (e) => {
        if (!UI.schoolSearchInput.contains(e.target) && !UI.schoolDropdown.contains(e.target)) {
            closeSchoolDropdown();
        }
    });

    // --- LANGKAH 1: FETCH DATA TEMPATAN (PERINGKAT 1) ---
    UI.fetchSchoolDataBtn.addEventListener('click', handleFetchSchoolData);

    // --- LANGKAH 2: DRAG & DROP FAIL ---
    UI.dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        highlightDropzone();
    });

    UI.dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        unhighlightDropzone();
    });

    UI.dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        unhighlightDropzone();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    // --- LANGKAH 2: KLIK MUAT NAIK FAIL ---
    UI.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // --- LANGKAH 2: MULA PADANAN ---
    UI.startMatchBtn.addEventListener('click', handleStartMatching);

    // --- LANGKAH 3: MUAT TURUN HASIL ---
    UI.downloadResultBtn.addEventListener('click', () => {
        if (AppState.finalMatchedData) {
            exportToCSV(AppState.finalMatchedData, AppState.originalFileName);
        }
    });
}

// ============================================================================
// PENGENDALI LOGIK (LOGIC HANDLERS)
// ============================================================================

/**
 * Pengendali apabila pengguna memilih sekolah dari senarai dropdown
 */
function handleSchoolSelection(schoolData) {
    AppState.selectedSchool = schoolData;
    showSelectedSchool(schoolData.nama_sekolah, schoolData.kod_ou);
}

/**
 * Pengendali apabila pengguna menekan butang Muat Turun Data Sekolah
 */
async function handleFetchSchoolData() {
    if (!AppState.selectedSchool) return;

    try {
        showProgress("Mengambil Data Peringkat 1", "Menghubungi pangkalan data DELIMa...");
        
        // Panggil API untuk ambil data berdasarkan kod OU
        const data = await fetchSchoolData(AppState.selectedSchool.kod_ou);
        AppState.localDelimaData = data;
        
        hideProgress();
        setSchoolDataReadyState(data.length);
        
        if (data.length === 0) {
            alert(`Amaran: Tiada data dijumpai untuk Kod OU ${AppState.selectedSchool.kod_ou}. Padanan mungkin menggunakan carian global sepenuhnya.`);
        }
    } catch (error) {
        hideProgress();
        alert(`Ralat mengambil data sekolah: ${error.message}`);
    }
}

/**
 * Pengendali pembacaan fail tempatan ke memori pelayar
 */
async function handleFileUpload(file) {
    try {
        showProgress("Membaca Fail", "Menukar format Excel/CSV kepada data sistem...");
        
        // Guna File Handler untuk parse Excel
        const data = await readExcelFile(file);
        
        AppState.uploadedExcelData = data;
        AppState.originalFileName = file.name;
        
        hideProgress();
        showFileInfo(file.name, data.length);
        
    } catch (error) {
        hideProgress();
        alert(error.message);
        // Reset input file untuk membenarkan muat naik semula
        UI.fileInput.value = '';
    }
}

/**
 * Pengendali apabila enjin padanan dimulakan
 */
async function handleStartMatching() {
    if (AppState.uploadedExcelData.length === 0) {
        alert("Sila muat naik fail yang mengandungi data terlebih dahulu.");
        return;
    }

    try {
        showProgress("Memulakan Enjin Padanan", "Menganalisis data baris demi baris...");
        
        // Jalankan Enjin Padanan Asinkroni (Beri callback fungsi update UI)
        const result = await runMatchingEngine(
            AppState.uploadedExcelData,
            AppState.localDelimaData,
            fetchGlobalMatch, // Pass referensi API Peringkat 2
            updateProgress    // Pass referensi UI Progress
        );

        // Simpan hasil ke state global
        AppState.finalMatchedData = result.finalData;
        
        hideProgress();
        
        // Papar keputusan
        showResults(result.stats);
        
    } catch (error) {
        hideProgress();
        console.error("Ralat fatal Enjin Padanan:", error);
        alert(`Berlaku ralat sistem ketika memadankan data: ${error.message}`);
    }
}