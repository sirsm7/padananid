/**
 * Modul: Kawalan Antaramuka Pengguna (UI) V3
 * Folder: /src/js/ui.js
 * Fungsi: Menguruskan kemas kini DOM, animasi Tailwind CSS, dan maklum balas visual sistem.
 * Arkitek: Pro Web Caster (Zero-Hallucination UI Architecture)
 */

// ============================================================================\
// ELEMEN DOM (CACHED VIA GETTERS)
// ============================================================================\
export const UI = {
    // Langkah 1: Kontena & Dropzone
    get step1Container() { return document.getElementById('step1Container'); },
    get dropzone() { return document.getElementById('dropzone'); },
    get fileInput() { return document.getElementById('fileInput'); },
    get fileInfoArea() { return document.getElementById('fileInfoArea'); },
    get fileNameDisplay() { return document.getElementById('fileNameDisplay'); },
    get recordCountDisplay() { return document.getElementById('recordCountDisplay'); },
    get cancelUploadBtn() { return document.getElementById('cancelUploadBtn'); },

    // Langkah 2: Pemilihan Sekolah
    get step2Container() { return document.getElementById('step2Container'); },
    get step2LockIcon() { return document.getElementById('step2LockIcon'); },
    get schoolSearchInput() { return document.getElementById('schoolSearchInput'); },
    get schoolDataList() { return document.getElementById('schoolDataList'); },
    get selectedSchoolDisplay() { return document.getElementById('selectedSchoolDisplay'); },
    get startMatchingBtn() { return document.getElementById('startMatchingBtn'); },

    // Langkah 3: Hasil & Statistik
    get resultsContainer() { return document.getElementById('resultsContainer'); },
    get statTotal() { return document.getElementById('statTotal'); },
    get statSuccess() { return document.getElementById('statSuccess'); },
    get statGlobal() { return document.getElementById('statGlobal'); },
    get downloadResultBtn() { return document.getElementById('downloadResultBtn'); },
    get resetAppBtn() { return document.getElementById('resetAppBtn'); },

    // Overlay Kemajuan (Progress)
    get progressOverlay() { return document.getElementById('progressOverlay'); },
    get progressBar() { return document.getElementById('progressBar'); },
    get progressText() { return document.getElementById('progressText'); },
    get progressCounter() { return document.getElementById('progressCounter'); },
    get progressDesc() { return document.getElementById('progressDesc'); }
};

// ============================================================================\
// FUNGSI UTILITI UI
// ============================================================================\

/**
 * Mengisi <datalist> dengan senarai sekolah dari API
 */
export const populateSchoolDataList = (schools) => {
    if (!UI.schoolDataList) return;
    
    UI.schoolDataList.innerHTML = ''; // Kosongkan senarai lama
    
    const fragment = document.createDocumentFragment();
    schools.forEach(school => {
        const option = document.createElement('option');
        option.value = school.nama_sekolah;
        fragment.appendChild(option);
    });
    
    UI.schoolDataList.appendChild(fragment);
};

/**
 * Papar maklum balas visual apabila sekolah dipilih
 */
export const showSelectedSchool = (name, ou) => {
    if (UI.selectedSchoolDisplay) {
        UI.selectedSchoolDisplay.innerHTML = `
            <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p class="text-sm font-semibold text-blue-800">${name}</p>
                <p class="text-xs text-blue-600">Kod OU: ${ou}</p>
            </div>
        `;
    }
    UI.startMatchingBtn?.removeAttribute('disabled');
    UI.startMatchingBtn?.classList.remove('opacity-50', 'cursor-not-allowed');
};

/**
 * Pengurusan Dropzone (Drag & Drop)
 */
export const highlightDropzone = () => {
    UI.dropzone?.classList.add('border-primary', 'bg-blue-50');
};

export const unhighlightDropzone = () => {
    UI.dropzone?.classList.remove('border-primary', 'bg-blue-50');
};

/**
 * Papar maklumat fail selepas muat naik
 */
export const showFileInfo = (name, count) => {
    if (UI.fileInfoArea) UI.fileInfoArea.classList.remove('hidden');
    if (UI.fileNameDisplay) UI.fileNameDisplay.textContent = name;
    if (UI.recordCountDisplay) UI.recordCountDisplay.textContent = `${count} rekod dijumpai`;
    
    // Buka kunci Langkah 2
    UI.step2Container?.classList.remove('opacity-50', 'pointer-events-none');
    UI.step2LockIcon?.classList.add('hidden');
};

/**
 * Pengurusan Progress Overlay
 */
export const showProgress = (title, description) => {
    if (UI.progressOverlay) UI.progressOverlay.classList.remove('hidden');
    if (UI.progressText) UI.progressText.textContent = title;
    if (UI.progressDesc) UI.progressDesc.textContent = description;
    if (UI.progressBar) UI.progressBar.style.width = '0%';
};

export const updateProgress = (current, total, customDesc = null) => {
    const percentage = Math.round((current / total) * 100);
    if (UI.progressBar) UI.progressBar.style.width = `${percentage}%`;
    if (UI.progressCounter) UI.progressCounter.textContent = `${current} / ${total} diproses (${percentage}%)`;
    if (customDesc && UI.progressDesc) UI.progressDesc.textContent = customDesc;
};

export const hideProgress = () => {
    if (UI.progressOverlay) UI.progressOverlay.classList.add('hidden');
};

/**
 * Paparan Hasil Akhir (Langkah 3)
 */
export const showResults = (stats) => {
    if (UI.statTotal) UI.statTotal.textContent = stats.total;
    if (UI.statSuccess) UI.statSuccess.textContent = stats.successTier1;
    // Papar Tier 2 (Global) dan Gagal
    if (UI.statGlobal) UI.statGlobal.textContent = `${stats.successTier2} (Global) / ${stats.failed} (Gagal)`;
    
    if (UI.resultsContainer) UI.resultsContainer.classList.remove('hidden');
    
    // Kunci langkah-langkah sebelumnya untuk fokus pada hasil
    UI.step1Container?.classList.add('opacity-50', 'pointer-events-none');
    UI.step2Container?.classList.add('opacity-50', 'pointer-events-none');

    UI.resultsContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * Reset UI Fail Sahaja
 */
export const resetFileUploadUI = () => {
    if (UI.fileInput) UI.fileInput.value = '';
    if (UI.fileInfoArea) UI.fileInfoArea.classList.add('hidden');
    UI.step2Container?.classList.add('opacity-50', 'pointer-events-none');
    UI.step2LockIcon?.classList.remove('hidden');
};

/**
 * Reset Sistem Sepenuhnya
 */
export const resetFullSystemUI = () => {
    resetFileUploadUI();
    if (UI.schoolSearchInput) UI.schoolSearchInput.value = '';
    if (UI.selectedSchoolDisplay) UI.selectedSchoolDisplay.innerHTML = '';
    if (UI.resultsContainer) UI.resultsContainer.classList.add('hidden');
    
    UI.step1Container?.classList.remove('opacity-50', 'pointer-events-none');
    UI.startMatchingBtn?.setAttribute('disabled', 'true');
    UI.startMatchingBtn?.classList.add('opacity-50', 'cursor-not-allowed');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};