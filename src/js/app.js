/**
 * Modul: Pengawal Aplikasi Utama (Main Controller) V2
 * Folder: /src/js/app.js
 * Fungsi: Mengurus kitaran hayat aplikasi, state (keadaan) data, dan event listeners DOM.
 * Arkitek: Pro Web Caster (Aliran V2: Muat Naik -> Pilih Sekolah -> Padan)
 * Kemas kini: Penyatuan elemen native <datalist> (Seni Bina SoC).
 */

// ============================================================================
// IMPORT MODUL (ES6 Modules)
// ============================================================================
import { fetchSchoolsList, fetchSchoolData, fetchGlobalMatch } from './api.js';
import { 
    UI, 
    populateSchoolDataList, // Diimport baharu dari ui.js 
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

// ============================================================================
// KEADAAN SISTEM (APPLICATION STATE)
// ============================================================================
const AppState = {
    allSchools: [],          // Menyimpan senarai sekolah dari API
    selectedSchool: null,    // Menyimpan objek sekolah terpilih
    uploadedExcelData: [],   // Menyimpan data JSON fail Excel/CSV muat naik (Langkah 1)
    originalFileName: '',    // Menyimpan nama fail muat naik untuk nama eksport
    finalMatchedData: null   // Menyimpan hasil akhir padanan
};

// ============================================================================
// FUNGSI INIT (BOOTSTRAPPING)
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Pro Web Caster: Memulakan sistem Hibrid V2...");
    
    // Bind semua event listener
    setupEventListeners();

    // Dapatkan senarai sekolah semasa aplikasi dibuka (di belakang tabir)
    try {
        UI.schoolSearchInput.placeholder = "Memuat turun senarai sekolah...";
        UI.schoolSearchInput.disabled = true;
        
        AppState.allSchools = await fetchSchoolsList();
        
        // Isikan terus ke dalam <datalist> secara pukal (Native DOM)
        populateSchoolDataList(AppState.allSchools);
        
        UI.schoolSearchInput.placeholder = "Taip nama sekolah atau kod sekolah...";
        UI.schoolSearchInput.disabled = false;
        console.log(`Berjaya memuatkan ${AppState.allSchools.length} sekolah ke dalam Datalist.`);
    } catch (error) {
        console.error("Gagal memulakan senarai sekolah:", error);
        UI.schoolSearchInput.placeholder = "Gagal memuat turun data sekolah.";
    }
});

// ============================================================================
// PENGIKATAN PERISTIWA (EVENT LISTENERS)
// ============================================================================
function setupEventListeners() {
    
    // --- LANGKAH 1: DRAG & DROP FAIL ---
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

    // --- LANGKAH 1: KLIK MUAT NAIK FAIL ---
    UI.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // --- LANGKAH 1: BATAL MUAT NAIK ---
    UI.cancelUploadBtn.addEventListener('click', () => {
        AppState.uploadedExcelData = [];
        AppState.originalFileName = '';
        resetFileUploadUI();
    });

    // --- LANGKAH 2: PILIHAN SEKOLAH DARI DATALIST ---
    // Menggunakan 'change' untuk menangkap pilihan dari Datalist secara natif
    UI.schoolSearchInput.addEventListener('change', handleSchoolSelection);

    // --- LANGKAH 2: MULA PADANAN (Cetus API -> Matcher) ---
    UI.startMatchBtn.addEventListener('click', handleStartMatchingProcess);

    // --- LANGKAH 3: MUAT TURUN HASIL ---
    UI.downloadResultBtn.addEventListener('click', () => {
        if (AppState.finalMatchedData) {
            exportToCSV(AppState.finalMatchedData, AppState.originalFileName);
        }
    });

    // --- LANGKAH 3: RESET SISTEM ---
    UI.resetSystemBtn.addEventListener('click', () => {
        AppState.uploadedExcelData = [];
        AppState.originalFileName = '';
        AppState.selectedSchool = null;
        AppState.finalMatchedData = null;
        resetFullSystemUI();
    });
}

// ============================================================================
// PENGENDALI LOGIK (LOGIC HANDLERS)
// ============================================================================

/**
 * PENGENDALI LANGKAH 1: Pembacaan fail tempatan ke memori pelayar
 */
async function handleFileUpload(file) {
    try {
        showProgress("Membaca Fail", "Menukar format Excel/CSV kepada data sistem...");
        
        // Guna File Handler untuk parse Excel
        const data = await readExcelFile(file);
        
        AppState.uploadedExcelData = data;
        AppState.originalFileName = file.name;
        
        hideProgress();
        showFileInfo(file.name, data.length); // Ini akan unlock Langkah 2 dalam ui.js
        
    } catch (error) {
        hideProgress();
        alert(error.message);
        resetFileUploadUI();
    }
}

/**
 * Pengendali apabila pengguna memilih atau menaip nama sekolah di Datalist Input
 */
function handleSchoolSelection(e) {
    const selectedValue = e.target.value.trim();

    // Jika pengguna memadam teks
    if (!selectedValue) {
        AppState.selectedSchool = null;
        if(UI.startMatchBtn) {
            UI.startMatchBtn.disabled = true;
            UI.startMatchBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if(UI.selectedSchoolInfo) UI.selectedSchoolInfo.classList.add('hidden');
        return;
    }

    const options = UI.schoolDataList.options;
    let matchedOption = null;

    // Padankan input teks dengan nilai di dalam <option> Datalist
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === selectedValue) {
            matchedOption = options[i];
            break;
        }
    }

    if (matchedOption) {
        // Ekstrak data sebenar dari atribut tersembunyi (data-nama, data-ou)
        const schoolName = matchedOption.getAttribute('data-nama');
        const schoolOu = matchedOption.getAttribute('data-ou');

        AppState.selectedSchool = {
            nama_sekolah: schoolName,
            kod_ou: schoolOu
        };

        showSelectedSchool(schoolName, schoolOu);
    } else {
        // Jika input ditaip secara manual tapi tiada dalam senarai
        AppState.selectedSchool = null;
        if(UI.startMatchBtn) {
            UI.startMatchBtn.disabled = true;
            UI.startMatchBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        if(UI.selectedSchoolInfo) UI.selectedSchoolInfo.classList.add('hidden');
    }
}

/**
 * PENGENDALI LANGKAH 2 & 3: Orkestrasi Fetch Data Sekolah -> Enjin Padanan
 * Ini adalah fungsi kritikal yang menggabungkan aliran V2.
 */
async function handleStartMatchingProcess() {
    if (AppState.uploadedExcelData.length === 0) {
        alert("Ralat: Sila muat naik fail data terlebih dahulu.");
        return;
    }

    if (!AppState.selectedSchool) {
        alert("Ralat: Sila pilih nama sekolah yang sah dari senarai.");
        return;
    }

    try {
        // FASA 1: Tarik Data Sekolah (Peringkat 1)
        showProgress("Mengambil Data Skop Sekolah", `Memuat turun data DELIMa untuk OU: ${AppState.selectedSchool.kod_ou}...`);
        const localDelimaData = await fetchSchoolData(AppState.selectedSchool.kod_ou);

        if (localDelimaData.length === 0) {
            console.warn(`Tiada rekod dijumpai untuk OU ${AppState.selectedSchool.kod_ou}. Sistem akan bergantung sepenuhnya pada carian global.`);
        }

        // FASA 2: Jalankan Enjin Padanan
        showProgress("Memulakan Enjin Padanan", "Menganalisis data baris demi baris...");
        
        const result = await runMatchingEngine(
            AppState.uploadedExcelData,
            localDelimaData,
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
        console.error("Ralat fatal Sistem Padanan V2:", error);
        alert(`Berlaku ralat ketika memproses data: ${error.message}`);
    }
}