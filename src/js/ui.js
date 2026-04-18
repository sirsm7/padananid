/**
 * Modul: Kawalan Antaramuka Pengguna (UI) V2
 * Folder: /src/js/ui.js
 * Fungsi: Menguruskan kemas kini DOM, manipulasi class CSS Tailwind, dan feedback visual.
 * Arkitek: Pro Web Caster (Aliran V2: Muat Naik -> Pilih Sekolah)
 * Kemas kini: Menggunakan corak Getter untuk Lazy DOM Evaluation. Pelaksanaan <datalist> natif.
 */

// ============================================================================
// ELEMEN DOM (CACHED VIA GETTERS)/**
 * Module: UI & DOM Controller
 * Folder: /src/js/ui.js
 * Function: Handles all visual updates, DOM manipulations, and table rendering.
 * Architect: Pro Web Caster
 * Note: Strictly enforces Separation of Concerns (SoC). No business logic here.
 */

// UI Configuration State
const UI_STATE = {
    resultsContainerId: 'resultsContainer',
    tableBodyId: 'resultsTableBody',
    statsTotalId: 'statsTotal',
    statsMatchedId: 'statsMatched',
    statsUnmatchedCsvId: 'statsUnmatchedCsv',
    statsUnmatchedDbId: 'statsUnmatchedDb'
};

/**
 * Toggles the loading state of the application.
 * @param {boolean} isLoading - True to show spinner, false to show results.
 * @param {HTMLElement} uploadArea - The drag-and-drop container.
 * @param {HTMLElement} loadingSpinner - The loading animation element.
 * @param {HTMLElement} resultsArea - The container for the results table.
 */
export function toggleLoading(isLoading, uploadArea, loadingSpinner, resultsArea) {
    if (isLoading) {
        // Hide upload and results, show spinner
        uploadArea.classList.add('hidden');
        if(resultsArea) resultsArea.classList.add('hidden');
        if(loadingSpinner) loadingSpinner.classList.remove('hidden');
    } else {
        // Hide spinner, hide upload, show results
        if(loadingSpinner) loadingSpinner.classList.add('hidden');
        uploadArea.classList.add('hidden');
        if(resultsArea) resultsArea.classList.remove('hidden');
    }
}

/**
 * Updates the summary statistics badges above the results table.
 * @param {Object} matchResults - The result object from matcher.js
 */
export function updateStats(matchResults) {
    const elTotal = document.getElementById(UI_STATE.statsTotalId);
    const elMatched = document.getElementById(UI_STATE.statsMatchedId);
    const elUnmatchedCsv = document.getElementById(UI_STATE.statsUnmatchedCsvId);
    const elUnmatchedDb = document.getElementById(UI_STATE.statsUnmatchedDbId);

    if (!matchResults) return;

    // Calculate total rows processed from CSV
    const totalCsvRows = matchResults.matches.length + matchResults.unmatchedCsv.length;

    // Update the DOM text content securely
    if(elTotal) elTotal.textContent = totalCsvRows;
    if(elMatched) elMatched.textContent = matchResults.matches.length;
    if(elUnmatchedCsv) elUnmatchedCsv.textContent = matchResults.unmatchedCsv.length;
    if(elUnmatchedDb) elUnmatchedDb.textContent = matchResults.unmatchedDb.length;
}

/**
 * Renders the matched results into an HTML table securely.
 * @param {Array<Object>} matchedData - Array of matched objects from matcher.js
 */
export function renderTable(matchedData) {
    const tbody = document.getElementById(UI_STATE.tableBodyId);
    if (!tbody) {
        console.error('UI Engine Error: Table body element not found in DOM.');
        return;
    }

    // Clear existing rows
    tbody.innerHTML = '';

    if (!matchedData || matchedData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-500">Tiada padanan data dijumpai.</td></tr>`;
        return;
    }

    // Build the table rows dynamically
    matchedData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100';

        // Safe extraction of values with fallbacks to avoid 'undefined' string printing
        const csvName = item.csvData['NAMA'] || '-';
        const csvId = item.csvData['ID MURID'] || '-';
        const dbName = item.dbData.name || '-';
        const dbEmail = item.dbData.email || '-';
        const dbOrgUnit = item.dbData.orgUnitPath || '-';

        // Construction using secure innerText (via textContent injection) to prevent XSS
        const cellsData = [
            csvName,
            csvId,
            dbName,
            dbEmail,
            dbOrgUnit
        ];

        cellsData.forEach(cellText => {
            const td = document.createElement('td');
            td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-700';
            td.textContent = cellText; // Using textContent defends against XSS if data is malformed
            row.appendChild(td);
        });

        tbody.appendChild(row);
    });
}
// ============================================================================
export const UI = {
    // Langkah 1: Muat Naik Fail
    get step1Container() { return document.getElementById('step1Container'); },
    get dropzone() { return document.getElementById('dropzone'); },
    get fileInput() { return document.getElementById('fileInput'); },
    get fileInfoArea() { return document.getElementById('fileInfoArea'); },
    get fileNameDisplay() { return document.getElementById('fileNameDisplay'); },
    get recordCountDisplay() { return document.getElementById('recordCountDisplay'); },
    get cancelUploadBtn() { return document.getElementById('cancelUploadBtn'); },

    // Langkah 2: Carian Sekolah & Mula
    get step2Container() { return document.getElementById('step2Container'); },
    get step2LockIcon() { return document.getElementById('step2LockIcon'); },
    get schoolSearchInput() { return document.getElementById('schoolSearchInput'); },
    get schoolDataList() { return document.getElementById('schoolDataList'); }, // DIKEMAS KINI
    get startMatchBtn() { return document.getElementById('startMatchBtn'); },
    get selectedSchoolInfo() { return document.getElementById('selectedSchoolInfo'); },
    get displaySchoolName() { return document.getElementById('displaySchoolName'); },
    get displaySchoolOu() { return document.getElementById('displaySchoolOu'); },

    // Progress Overlay
    get progressOverlay() { return document.getElementById('progressOverlay'); },
    get progressTitle() { return document.getElementById('progressTitle'); },
    get progressDesc() { return document.getElementById('progressDesc'); },
    get progressBar() { return document.getElementById('progressBar'); },
    get progressCounter() { return document.getElementById('progressCounter'); },

    // Langkah 3: Hasil Padanan
    get resultsContainer() { return document.getElementById('resultsContainer'); },
    get statTotal() { return document.getElementById('statTotal'); },
    get statSuccess() { return document.getElementById('statSuccess'); },
    get statGlobal() { return document.getElementById('statGlobal'); },
    get resetSystemBtn() { return document.getElementById('resetSystemBtn'); },
    get downloadResultBtn() { return document.getElementById('downloadResultBtn'); }
};

// ============================================================================
// KAWALAN FAIL (LANGKAH 1)
// ============================================================================

export const highlightDropzone = () => {
    if(UI.dropzone) {
        UI.dropzone.classList.add('bg-blue-50', 'border-secondary', 'border-solid');
        UI.dropzone.classList.remove('border-dashed', 'border-gray-300');
    }
};

export const unhighlightDropzone = () => {
    if(UI.dropzone) {
        UI.dropzone.classList.remove('bg-blue-50', 'border-secondary', 'border-solid');
        UI.dropzone.classList.add('border-dashed', 'border-gray-300');
    }
};

export const showFileInfo = (fileName, recordCount) => {
    if(UI.dropzone) UI.dropzone.classList.add('hidden');
    if(UI.fileNameDisplay) UI.fileNameDisplay.textContent = fileName;
    if(UI.recordCountDisplay) UI.recordCountDisplay.textContent = `(${recordCount} rekod dibaca)`;
    if(UI.fileInfoArea) UI.fileInfoArea.classList.remove('hidden');
    unlockStep2();
};

export const resetFileUploadUI = () => {
    if(UI.fileInput) UI.fileInput.value = '';
    if(UI.fileInfoArea) UI.fileInfoArea.classList.add('hidden');
    if(UI.dropzone) UI.dropzone.classList.remove('hidden');
    lockStep2();
};

// ============================================================================
// KAWALAN KUNCI & BUKA LANGKAH 2
// ============================================================================

const unlockStep2 = () => {
    if(UI.step2Container) UI.step2Container.classList.remove('opacity-50', 'pointer-events-none');
    if(UI.step2LockIcon) {
        UI.step2LockIcon.innerHTML = `
            <svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
            </svg>
        `;
    }
};

const lockStep2 = () => {
    if(UI.step2Container) UI.step2Container.classList.add('opacity-50', 'pointer-events-none');
    if(UI.step2LockIcon) {
        UI.step2LockIcon.innerHTML = `
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
        `;
    }
    
    if(UI.schoolSearchInput) UI.schoolSearchInput.value = '';
    if(UI.selectedSchoolInfo) UI.selectedSchoolInfo.classList.add('hidden');
    if(UI.startMatchBtn) {
        UI.startMatchBtn.disabled = true;
        UI.startMatchBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
};

// ============================================================================
// KAWALAN DATALIST SEKOLAH (LANGKAH 2) - DIKEMAS KINI
// ============================================================================

/**
 * Mengisi HTML <datalist> dengan senarai pilihan sekolah
 * @param {Array} schools - Tatasusunan objek sekolah dari API
 */
export const populateSchoolDataList = (schools) => {
    if(!UI.schoolDataList) return;

    UI.schoolDataList.innerHTML = '';
    
    schools.forEach(school => {
        const option = document.createElement('option');
        // Gabungkan nama dan kod untuk paparan input / carian pantas
        option.value = `${school.nama_sekolah} (KOD OU: ${school.kod_ou})`;
        // Simpan data sebenar secara berasingan menggunakan data attributes
        option.setAttribute('data-nama', school.nama_sekolah);
        option.setAttribute('data-ou', school.kod_ou);
        
        UI.schoolDataList.appendChild(option);
    });
};

/**
 * Papar info sekolah yang dipilih dan aktifkan butang Mula Padanan.
 */
export const showSelectedSchool = (schoolName, schoolOu) => {
    if(UI.displaySchoolName) UI.displaySchoolName.textContent = schoolName;
    if(UI.displaySchoolOu) UI.displaySchoolOu.textContent = schoolOu;
    if(UI.selectedSchoolInfo) UI.selectedSchoolInfo.classList.remove('hidden');
    
    // AKTIFKAN BUTANG MULA PADANAN
    if(UI.startMatchBtn) {
        UI.startMatchBtn.disabled = false;
        UI.startMatchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
};

// ============================================================================
// KAWALAN OVERLAY PROGRESS BAR
// ============================================================================

export const showProgress = (title, desc) => {
    if(UI.progressTitle) UI.progressTitle.textContent = title;
    if(UI.progressDesc) UI.progressDesc.textContent = desc;
    if(UI.progressBar) UI.progressBar.style.width = "0%";
    if(UI.progressCounter) UI.progressCounter.textContent = "";
    if(UI.progressOverlay) UI.progressOverlay.classList.remove('hidden');
};

export const updateProgress = (current, total, customDesc = null) => {
    if (total === 0) return;
    const percentage = Math.round((current / total) * 100);
    if(UI.progressBar) UI.progressBar.style.width = `${percentage}%`;
    if(UI.progressCounter) UI.progressCounter.textContent = `${current} / ${total} diproses (${percentage}%)`;
    
    if (customDesc && UI.progressDesc) {
        UI.progressDesc.textContent = customDesc;
    }
};

export const hideProgress = () => {
    if(UI.progressOverlay) UI.progressOverlay.classList.add('hidden');
};

// ============================================================================
// PAPARAN KEPUTUSAN (LANGKAH 3)
// ============================================================================

export const showResults = (stats) => {
    if(UI.statTotal) UI.statTotal.textContent = stats.total;
    if(UI.statSuccess) UI.statSuccess.textContent = stats.successTier1;
    if(UI.statGlobal) UI.statGlobal.textContent = `${stats.successTier2} / ${stats.failed}`;
    
    if(UI.resultsContainer) UI.resultsContainer.classList.remove('hidden');
    
    if(UI.step1Container) UI.step1Container.classList.add('opacity-50', 'pointer-events-none');
    if(UI.step2Container) UI.step2Container.classList.add('opacity-50', 'pointer-events-none');

    if(UI.resultsContainer) UI.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const resetFullSystemUI = () => {
    if(UI.resultsContainer) UI.resultsContainer.classList.add('hidden');
    if(UI.step1Container) UI.step1Container.classList.remove('opacity-50', 'pointer-events-none');
    
    resetFileUploadUI(); 
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};