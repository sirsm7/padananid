/**
 * Modul: Kawalan Antaramuka Pengguna (UI) V2
 * Folder: /src/js/ui.js
 * Fungsi: Menguruskan kemas kini DOM, manipulasi class CSS Tailwind, dan feedback visual.
 * Arkitek: Pro Web Caster (Aliran V2: Muat Naik -> Pilih Sekolah)
 * Kemas kini: Menggunakan corak Getter untuk Lazy DOM Evaluation bagi mengelakkan ralat 'null'.
 */

// ============================================================================
// ELEMEN DOM (CACHED VIA GETTERS)
// ============================================================================
export const UI = {
    // Langkah 1: Muat Naik Fail (Dulu Langkah 2)
    get step1Container() { return document.getElementById('step1Container'); },
    get dropzone() { return document.getElementById('dropzone'); },
    get fileInput() { return document.getElementById('fileInput'); },
    get fileInfoArea() { return document.getElementById('fileInfoArea'); },
    get fileNameDisplay() { return document.getElementById('fileNameDisplay'); },
    get recordCountDisplay() { return document.getElementById('recordCountDisplay'); },
    get cancelUploadBtn() { return document.getElementById('cancelUploadBtn'); },

    // Langkah 2: Carian Sekolah & Mula (Dulu Langkah 1)
    get step2Container() { return document.getElementById('step2Container'); },
    get step2LockIcon() { return document.getElementById('step2LockIcon'); },
    get schoolSearchInput() { return document.getElementById('schoolSearchInput'); },
    get schoolDropdown() { return document.getElementById('schoolDropdown'); },
    get schoolList() { return document.getElementById('schoolList'); },
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

/**
 * Efek visual ketika drag & drop fail
 */
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

/**
 * Papar maklumat fail setelah fail berjaya dibaca dan BUKA Langkah 2
 */
export const showFileInfo = (fileName, recordCount) => {
    // Sembunyikan dropzone asal, tunjuk kawasan info
    if(UI.dropzone) UI.dropzone.classList.add('hidden');
    
    if(UI.fileNameDisplay) UI.fileNameDisplay.textContent = fileName;
    if(UI.recordCountDisplay) UI.recordCountDisplay.textContent = `(${recordCount} rekod dibaca)`;
    if(UI.fileInfoArea) UI.fileInfoArea.classList.remove('hidden');

    // Buka (Unlock) Langkah 2
    unlockStep2();
};

/**
 * Membatalkan muat naik dan mengembalikan UI Langkah 1 ke keadaan asal
 */
export const resetFileUploadUI = () => {
    if(UI.fileInput) UI.fileInput.value = ''; // Kosongkan input
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
    
    // Reset carian sekolah jika dilock
    if(UI.schoolSearchInput) UI.schoolSearchInput.value = '';
    if(UI.selectedSchoolInfo) UI.selectedSchoolInfo.classList.add('hidden');
    if(UI.startMatchBtn) {
        UI.startMatchBtn.disabled = true;
        UI.startMatchBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
};

// ============================================================================
// KAWALAN DROPDOWN SEKOLAH (LANGKAH 2)
// ============================================================================

export const renderSchoolDropdown = (schools, filterText, onSelectCallback) => {
    if(!UI.schoolList || !UI.schoolDropdown) return;

    UI.schoolList.innerHTML = '';
    
    if (!filterText) {
        UI.schoolDropdown.classList.add('hidden');
        return;
    }

    const filteredSchools = schools.filter(school => {
        const searchText = filterText.toLowerCase();
        return school.nama_sekolah.toLowerCase().includes(searchText) || 
               school.kod_ou.toString().includes(searchText);
    });

    if (filteredSchools.length === 0) {
        UI.schoolList.innerHTML = `<li class="cursor-default select-none px-4 py-2 text-gray-500">Tiada sekolah dijumpai.</li>`;
        UI.schoolDropdown.classList.remove('hidden');
        return;
    }

    filteredSchools.slice(0, 50).forEach(school => {
        const li = document.createElement('li');
        li.className = "cursor-pointer select-none px-4 py-2 hover:bg-blue-50 text-gray-900";
        li.innerHTML = `<div class="font-medium">${school.nama_sekolah}</div><div class="text-xs text-gray-500">KOD OU: ${school.kod_ou}</div>`;
        
        li.addEventListener('mousedown', () => {
            onSelectCallback(school);
        });
        
        UI.schoolList.appendChild(li);
    });

    UI.schoolDropdown.classList.remove('hidden');
};

export const closeSchoolDropdown = () => {
    if(UI.schoolDropdown) UI.schoolDropdown.classList.add('hidden');
};

/**
 * Papar info sekolah yang dipilih dan aktifkan butang Mula Padanan.
 */
export const showSelectedSchool = (schoolName, schoolOu) => {
    if(UI.displaySchoolName) UI.displaySchoolName.textContent = schoolName;
    if(UI.displaySchoolOu) UI.displaySchoolOu.textContent = schoolOu;
    if(UI.schoolSearchInput) UI.schoolSearchInput.value = schoolName; 
    if(UI.selectedSchoolInfo) UI.selectedSchoolInfo.classList.remove('hidden');
    
    // AKTIFKAN BUTANG MULA PADANAN
    if(UI.startMatchBtn) {
        UI.startMatchBtn.disabled = false;
        UI.startMatchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    closeSchoolDropdown();
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
    
    // Kunci langkah di atas supaya tidak diubah semasa keputusan sedang dipapar
    if(UI.step1Container) UI.step1Container.classList.add('opacity-50', 'pointer-events-none');
    if(UI.step2Container) UI.step2Container.classList.add('opacity-50', 'pointer-events-none');

    // Auto-scroll ke keputusan
    if(UI.resultsContainer) UI.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * Reset sistem sepenuhnya (Kembali ke keadaan awal)
 */
export const resetFullSystemUI = () => {
    if(UI.resultsContainer) UI.resultsContainer.classList.add('hidden');
    if(UI.step1Container) UI.step1Container.classList.remove('opacity-50', 'pointer-events-none');
    
    resetFileUploadUI(); // Ini akan mengunci Langkah 2 secara automatik
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};