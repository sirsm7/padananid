/**
 * Modul: Pengawal Utama Sistem (App Controller)
 * Folder: /src/js/app.js
 * Fungsi: Mengkoordinasi Aliran Data Berperingkat (Two-Pass) yang telah dipertingkatkan.
 * Arkitek: Pro Web Caster (Resolusi Pepijat Memori / Susunan Data / Eksport Dinamik V2)
 */

import { 
    UI, logMessage, clearLogs, updateDbStatus, showFileInfo, 
    updateProgress, renderTable, updateStats, populateSchoolDropdown,
    getSelectedSchoolOU
} from './ui/dom.js';

import { 
    checkSupabaseConnection, fetchSchoolsList, fetchDelimaDataByOU, fetchFallbackData 
} from './services/supabase.js';

import { executePhase1, executePhase2 } from './core/matcher.js';

// ============================================================================
// PENGURUSAN KEADAAN (STATE MANAGEMENT)
// ============================================================================
let currentCsvFile = null;
let finalMatchResults = [];
let processedUploadData = null; 

// ============================================================================
// INISIALISASI SISTEM
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
    logMessage('Sistem memulakan proses inisialisasi...', 'info');
    
    const isDbConnected = await checkSupabaseConnection();
    updateDbStatus(isDbConnected);
    
    if (isDbConnected) {
        logMessage('Pangkalan data Supabase berjaya disambungkan.', 'success');
        
        try {
            logMessage('Memuat turun senarai sekolah...', 'info');
            const schools = await fetchSchoolsList();
            populateSchoolDropdown(schools);
            logMessage(`${schools.length} sekolah sedia untuk dipilih.`, 'success');
        } catch (err) {
            logMessage('Gagal memuat turun senarai sekolah: ' + err.message, 'error');
        }
    } else {
        logMessage('Gagal menyambung ke pangkalan data Supabase. Sila semak konfigurasi.', 'error');
    }

    setupEventListeners();
});

// ============================================================================
// PENGENDALIAN PERISTIWA (EVENT LISTENERS)
// ============================================================================
const setupEventListeners = () => {
    UI.btnClearLogs.addEventListener('click', clearLogs);
    UI.btnProcess.addEventListener('click', handleDataProcessing);
    UI.btnDownload.addEventListener('click', handleDownloadResults);
    UI.fileInput.addEventListener('change', (e) => processFileSelection(e.target.files[0]));

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
    
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
        logMessage(`Penolakan Fail: "${file.name}" tidak disokong. Sila gunakan format .CSV atau Excel.`, 'error');
        return;
    }

    currentCsvFile = file;

    if (fileName.endsWith('.csv')) {
        window.Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                const rowCount = results.data.length;
                processedUploadData = results.data; 
                showFileInfo(file.name, rowCount);
                logMessage(`Fail CSV "${file.name}" sedia diproses.`, 'info');
            },
            error: (err) => logMessage(`Ralat CSV: ${err.message}`, 'error')
        });
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = window.XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                const jsonArray = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false });
                
                processedUploadData = jsonArray;
                showFileInfo(file.name, jsonArray.length);
                logMessage(`Fail Excel "${file.name}" sedia diproses.`, 'info');
                
            } catch (err) {
                logMessage(`Ralat Excel: ${err.message}`, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    }
};

// ============================================================================
// LOGIK TERAS: PROSES PADANAN (TWO-PASS BERKEMBANG)
// ============================================================================
const handleDataProcessing = async () => {
    if (!currentCsvFile || !processedUploadData) {
        logMessage('Tiada fail sah dipilih untuk diproses.', 'warning');
        return;
    }

    const selectedOU = getSelectedSchoolOU();
    if (!selectedOU) {
        logMessage('Sila cari dan pilih sekolah dari senarai Dropdown sebelum memulakan padanan.', 'warning');
        if (UI.schoolSearchInput) UI.schoolSearchInput.focus();
        return;
    }

    try {
        UI.btnProcess.disabled = true;
        UI.btnDownload.disabled = true;
        if (UI.schoolSearchInput) UI.schoolSearchInput.disabled = true;
        if (UI.btnClearSchool) UI.btnClearSchool.classList.add('hidden'); 
        
        logMessage('Memulakan sesi padanan berperingkat...', 'info');
        
        // TAHAP 1: Padanan Kod Sekolah (OU)
        updateProgress(20, 'Menarik data sekolah dari Supabase...');
        const primaryData = await fetchDelimaDataByOU(selectedOU);
        logMessage(`Berjaya menarik ${primaryData.length} rekod rujukan khusus untuk sekolah ini.`, 'success');

        updateProgress(40, 'Melaksanakan Padanan Peringkat 1...');
        const phase1Data = executePhase1(processedUploadData, primaryData);
        logMessage(`Fasa 1 Selesai. ${phase1Data.stats.successPhase1} padanan tepat dijumpai. ${phase1Data.stats.failedPhase1} rekod akan dicari di peringkat global.`, 'info');

        let finalData = { results: phase1Data.matchedResults, stats: phase1Data.stats };

        // TAHAP 2: Carian Global (Fallback) jika ada nama yang gagal
        // [RESOLUSI MEMORI] Menghantar parameter unmatchedNames ke fungsi fetchFallbackData
        if (phase1Data.unmatchedNames.length > 0) {
            updateProgress(60, 'Melaksanakan carian spesifik (Wildcard) untuk rekod yang gagal...');
            logMessage(`Menghantar ${phase1Data.unmatchedNames.length} nama untuk carian Fallback global...`, 'info');
            
            const fallbackData = await fetchFallbackData(phase1Data.unmatchedNames);
            logMessage(`Berjaya menjumpai ${fallbackData.length} kemungkinan padanan dari carian global.`, 'success');
            
            updateProgress(80, 'Melaksanakan Padanan Peringkat 2...');
            finalData = executePhase2(phase1Data.unmatchedRows, fallbackData, phase1Data.matchedResults, phase1Data.stats);
        }

        // [MODIFIKASI] Algoritma Susunan (Sorting)
        // Susun hasil supaya yang berjaya (true) berada di atas dan gagal (false) diletakkan di bawah.
        finalData.results.sort((a, b) => {
            if (a.statusFlag === b.statusFlag) return 0;
            return a.statusFlag ? -1 : 1;
        });

        finalMatchResults = finalData.results;

        // KEMAS KINI UI
        updateProgress(90, 'Mengemas kini antaramuka...');
        renderTable(finalData.results);
        updateStats(finalData.stats);

        updateProgress(100, 'Proses selesai sepenuhnya');
        logMessage(`Padanan Selesai! Berjaya: ${finalData.stats.success} | Gagal: ${finalData.stats.failed}`, 'success');
        
        UI.btnDownload.disabled = false;

    } catch (error) {
        logMessage(`[RALAT KRITIKAL] Operasi dihentikan: ${error.message}`, 'error');
        updateProgress(0, 'Ralat Berlaku');
    } finally {
        UI.btnProcess.disabled = false;
        if (UI.schoolSearchInput) UI.schoolSearchInput.disabled = false;
        if (UI.selectedSchoolOU && UI.selectedSchoolOU.value && UI.btnClearSchool) {
             UI.btnClearSchool.classList.remove('hidden'); 
        }
    }
};

// ============================================================================
// LOGIK MUAT TURUN HASIL PADANAN (EXPORT DENGAN NAMA FAIL DINAMIK)
// ============================================================================
const handleDownloadResults = () => {
    if (!finalMatchResults || finalMatchResults.length === 0) return;

    logMessage('Menjana fail CSV hasil padanan...', 'info');

    // [MODIFIKASI] Pertukaran Pengepala "Nama MOEIS (Asal)" & penambahan lajur dinamik
    const exportFormat = finalMatchResults.map((row, index) => ({
        'Bil': index + 1,
        'Nama MOEIS (Asal)': row.originalName,
        'Tahun / Tingkatan': row.tahunTingkatan || '-',
        'Nama Kelas': row.namaKelas || '-',
        'Nama DELIMa': row.dbName,
        'Emel DELIMa': row.email,
        'Kod OU (ID Sekolah)': row.ou,
        'Nama Sekolah': row.namaSekolah,
        'Kategori': row.kategori,
        'Status Padanan': row.status
    }));

    const csvString = window.Papa.unparse(exportFormat);
    const blob = new Blob(["\ufeff", csvString], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob);
    
    // [MODIFIKASI] Penjanaan Nama Fail Dinamik (SEKOLAH + TIMESTAMP)
    let rawSchoolName = UI.schoolSearchInput ? UI.schoolSearchInput.value : '';
    if (!rawSchoolName.trim()) rawSchoolName = 'SEKOLAH';
    
    // Tapis nama sekolah dari sebarang karakter yang tidak sah untuk nama fail Windows/Mac
    const safeSchoolName = rawSchoolName.replace(/[\\/:*?"<>|]/g, '').trim();

    // Format masa: YYYYMMDD HHmm
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    
    const formattedTimestamp = `${yyyy}${mm}${dd} ${hh}${min}`;
    const dynamicFileName = `${safeSchoolName} ${formattedTimestamp}.csv`;

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = dynamicFileName;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    logMessage(`Fail "${dynamicFileName}" berjaya dimuat turun.`, 'success');
};