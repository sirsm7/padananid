/**
 * Modul: Kawalan Antaramuka Pengguna (UI) V2
 * Folder: /src/js/ui.js
 * Fungsi: Menguruskan kemas kini DOM, manipulasi class CSS Tailwind, dan feedback visual.
 * Arkitek: Pro Web Caster (Aliran V2: Muat Naik -> Pilih Sekolah)
 * Kemas kini: Menggunakan corak Getter untuk Lazy DOM Evaluation. Pelaksanaan <datalist> natif.
 */

// ============================================================================
// ELEMEN DOM (CACHED VIA GETTERS)
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