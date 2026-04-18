/**
 * Modul: Kawalan Antaramuka Pengguna (UI) V2
 * Folder: /src/js/ui.js
 * Fungsi: Menguruskan kemas kini DOM, manipulasi class CSS Tailwind, dan feedback visual.
 * Arkitek: Pro Web Caster (Aliran V2: Muat Naik -> Pilih Sekolah)
 */

// ============================================================================
// ELEMEN DOM (CACHED)
// ============================================================================
export const UI = {
    // Langkah 1: Muat Naik Fail (Dulu Langkah 2)
    step1Container: document.getElementById('step1Container'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    fileInfoArea: document.getElementById('fileInfoArea'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    recordCountDisplay: document.getElementById('recordCountDisplay'),
    cancelUploadBtn: document.getElementById('cancelUploadBtn'),

    // Langkah 2: Carian Sekolah & Mula (Dulu Langkah 1)
    step2Container: document.getElementById('step2Container'),
    step2LockIcon: document.getElementById('step2LockIcon'),
    schoolSearchInput: document.getElementById('schoolSearchInput'),
    schoolDropdown: document.getElementById('schoolDropdown'),
    schoolList: document.getElementById('schoolList'),
    startMatchBtn: document.getElementById('startMatchBtn'), // Dialih ke sini
    selectedSchoolInfo: document.getElementById('selectedSchoolInfo'),
    displaySchoolName: document.getElementById('displaySchoolName'),
    displaySchoolOu: document.getElementById('displaySchoolOu'),

    // Progress Overlay
    progressOverlay: document.getElementById('progressOverlay'),
    progressTitle: document.getElementById('progressTitle'),
    progressDesc: document.getElementById('progressDesc'),
    progressBar: document.getElementById('progressBar'),
    progressCounter: document.getElementById('progressCounter'),

    // Langkah 3: Hasil Padanan
    resultsContainer: document.getElementById('resultsContainer'),
    statTotal: document.getElementById('statTotal'),
    statSuccess: document.getElementById('statSuccess'),
    statGlobal: document.getElementById('statGlobal'),
    resetSystemBtn: document.getElementById('resetSystemBtn'),
    downloadResultBtn: document.getElementById('downloadResultBtn')
};

// ============================================================================
// KAWALAN FAIL (LANGKAH 1)
// ============================================================================

/**
 * Efek visual ketika drag & drop fail
 */
export const highlightDropzone = () => {
    UI.dropzone.classList.add('bg-blue-50', 'border-secondary', 'border-solid');
    UI.dropzone.classList.remove('border-dashed', 'border-gray-300');
};

export const unhighlightDropzone = () => {
    UI.dropzone.classList.remove('bg-blue-50', 'border-secondary', 'border-solid');
    UI.dropzone.classList.add('border-dashed', 'border-gray-300');
};

/**
 * Papar maklumat fail setelah fail berjaya dibaca dan BUKA Langkah 2
 */
export const showFileInfo = (fileName, recordCount) => {
    // Sembunyikan dropzone asal, tunjuk kawasan info
    UI.dropzone.classList.add('hidden');
    
    UI.fileNameDisplay.textContent = fileName;
    UI.recordCountDisplay.textContent = `(${recordCount} rekod dibaca)`;
    UI.fileInfoArea.classList.remove('hidden');

    // Buka (Unlock) Langkah 2
    unlockStep2();
};

/**
 * Membatalkan muat naik dan mengembalikan UI Langkah 1 ke keadaan asal
 */
export const resetFileUploadUI = () => {
    UI.fileInput.value = ''; // Kosongkan input
    UI.fileInfoArea.classList.add('hidden');
    UI.dropzone.classList.remove('hidden');
    lockStep2();
};

// ============================================================================
// KAWALAN KUNCI & BUKA LANGKAH 2
// ============================================================================

const unlockStep2 = () => {
    UI.step2Container.classList.remove('opacity-50', 'pointer-events-none');
    UI.step2LockIcon.innerHTML = `
        <svg class="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
        </svg>
    `;
};

const lockStep2 = () => {
    UI.step2Container.classList.add('opacity-50', 'pointer-events-none');
    UI.step2LockIcon.innerHTML = `
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
    `;
    
    // Reset carian sekolah jika dilock
    UI.schoolSearchInput.value = '';
    UI.selectedSchoolInfo.classList.add('hidden');
    UI.startMatchBtn.disabled = true;
    UI.startMatchBtn.classList.add('opacity-50', 'cursor-not-allowed');
};

// ============================================================================
// KAWALAN DROPDOWN SEKOLAH (LANGKAH 2)
// ============================================================================

export const renderSchoolDropdown = (schools, filterText, onSelectCallback) => {
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
    UI.schoolDropdown.classList.add('hidden');
};

/**
 * Papar info sekolah yang dipilih dan aktifkan butang Mula Padanan.
 */
export const showSelectedSchool = (schoolName, schoolOu) => {
    UI.displaySchoolName.textContent = schoolName;
    UI.displaySchoolOu.textContent = schoolOu;
    UI.schoolSearchInput.value = schoolName; 
    UI.selectedSchoolInfo.classList.remove('hidden');
    
    // AKTIFKAN BUTANG MULA PADANAN
    UI.startMatchBtn.disabled = false;
    UI.startMatchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    closeSchoolDropdown();
};

// ============================================================================
// KAWALAN OVERLAY PROGRESS BAR
// ============================================================================

export const showProgress = (title, desc) => {
    UI.progressTitle.textContent = title;
    UI.progressDesc.textContent = desc;
    UI.progressBar.style.width = "0%";
    UI.progressCounter.textContent = "";
    UI.progressOverlay.classList.remove('hidden');
};

export const updateProgress = (current, total, customDesc = null) => {
    if (total === 0) return;
    const percentage = Math.round((current / total) * 100);
    UI.progressBar.style.width = `${percentage}%`;
    UI.progressCounter.textContent = `${current} / ${total} diproses (${percentage}%)`;
    
    if (customDesc) {
        UI.progressDesc.textContent = customDesc;
    }
};

export const hideProgress = () => {
    UI.progressOverlay.classList.add('hidden');
};

// ============================================================================
// PAPARAN KEPUTUSAN (LANGKAH 3)
// ============================================================================

export const showResults = (stats) => {
    UI.statTotal.textContent = stats.total;
    UI.statSuccess.textContent = stats.successTier1;
    UI.statGlobal.textContent = `${stats.successTier2} / ${stats.failed}`;
    
    UI.resultsContainer.classList.remove('hidden');
    
    // Kunci langkah di atas supaya tidak diubah semasa keputusan sedang dipapar
    UI.step1Container.classList.add('opacity-50', 'pointer-events-none');
    UI.step2Container.classList.add('opacity-50', 'pointer-events-none');

    // Auto-scroll ke keputusan
    UI.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

/**
 * Reset sistem sepenuhnya (Kembali ke keadaan awal)
 */
export const resetFullSystemUI = () => {
    UI.resultsContainer.classList.add('hidden');
    UI.step1Container.classList.remove('opacity-50', 'pointer-events-none');
    
    resetFileUploadUI(); // Ini akan mengunci Langkah 2 secara automatik
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};