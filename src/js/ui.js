/**
 * Modul: Kawalan Antaramuka Pengguna (UI)
 * Folder: /src/js/ui.js
 * Fungsi: Menguruskan kemas kini DOM, manipulasi class CSS Tailwind, dan feedback visual.
 * Arkitek: Pro Web Caster (Strict SoC Enforced)
 */

// ============================================================================
// ELEMEN DOM (CACHED)
// ============================================================================
export const UI = {
    // Langkah 1: Carian Sekolah
    schoolSearchInput: document.getElementById('schoolSearchInput'),
    schoolDropdown: document.getElementById('schoolDropdown'),
    schoolList: document.getElementById('schoolList'),
    fetchSchoolDataBtn: document.getElementById('fetchSchoolDataBtn'),
    selectedSchoolInfo: document.getElementById('selectedSchoolInfo'),
    displaySchoolName: document.getElementById('displaySchoolName'),
    displaySchoolOu: document.getElementById('displaySchoolOu'),
    dataStatusBadge: document.getElementById('dataStatusBadge'),

    // Langkah 2: Muat Naik Fail
    step2Container: document.getElementById('step2Container'),
    dropzone: document.getElementById('dropzone'),
    fileInput: document.getElementById('fileInput'),
    fileInfoArea: document.getElementById('fileInfoArea'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    recordCountDisplay: document.getElementById('recordCountDisplay'),
    startMatchBtn: document.getElementById('startMatchBtn'),

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
    downloadResultBtn: document.getElementById('downloadResultBtn')
};

// ============================================================================
// KAWALAN DROPDOWN SEKOLAH
// ============================================================================

/**
 * Paparkan senarai sekolah di dalam dropdown yang sepadan dengan teks input pengguna.
 * @param {Array} schools - Array data sekolah [{nama_sekolah, kod_ou}]
 * @param {string} filterText - Teks dari input carian
 * @param {Function} onSelectCallback - Fungsi yang akan dipanggil jika sekolah ditekan
 */
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
        
        li.addEventListener('mousedown', () => { // Guna mousedown untuk elak onBlur input cancel klik
            onSelectCallback(school);
        });
        
        UI.schoolList.appendChild(li);
    });

    UI.schoolDropdown.classList.remove('hidden');
};

/**
 * Tutup dropdown sekolah
 */
export const closeSchoolDropdown = () => {
    UI.schoolDropdown.classList.add('hidden');
};

// ============================================================================
// KEMAS KINI STATUS LANGKAH 1
// ============================================================================

/**
 * Papar info sekolah yang telah dipilih dan aktifkan butang muat turun data.
 */
export const showSelectedSchool = (schoolName, schoolOu) => {
    UI.displaySchoolName.textContent = schoolName;
    UI.displaySchoolOu.textContent = schoolOu;
    UI.schoolSearchInput.value = schoolName; // Kemas kini input dengan nama penuh
    UI.selectedSchoolInfo.classList.remove('hidden');
    UI.fetchSchoolDataBtn.disabled = false;
    UI.fetchSchoolDataBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    closeSchoolDropdown();
};

/**
 * Ubah lencana (badge) status selepas data sekolah berjaya dimuat turun dari API.
 * Seterusnya buka (unlock) kad Langkah 2.
 */
export const setSchoolDataReadyState = (recordCount) => {
    UI.dataStatusBadge.textContent = `${recordCount} data sedia`;
    UI.dataStatusBadge.classList.replace('bg-gray-100', 'bg-green-100');
    UI.dataStatusBadge.classList.replace('text-gray-800', 'text-green-800');
    
    UI.fetchSchoolDataBtn.textContent = "Data Dimuat Turun";
    UI.fetchSchoolDataBtn.disabled = true;
    UI.fetchSchoolDataBtn.classList.replace('bg-primary', 'bg-green-600');

    // Buka Langkah 2
    UI.step2Container.classList.remove('opacity-50', 'pointer-events-none');
};

// ============================================================================
// KAWALAN FAIL (LANGKAH 2)
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
 * Papar maklumat fail setelah fail berjaya dibaca ke memori
 */
export const showFileInfo = (fileName, recordCount) => {
    UI.fileNameDisplay.textContent = fileName;
    UI.recordCountDisplay.textContent = `(${recordCount} rekod dibaca)`;
    UI.fileInfoArea.classList.remove('hidden');
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
    
    // Auto-scroll ke keputusan
    UI.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
};