/**
 * Modul: Manipulasi DOM (UI)
 * Folder: /src/js/ui/dom.js
 * Fungsi: Mengurus interaksi, kemas kini UI, logik dropdown carian sekolah, dan jadual.
 * Arkitek: Pro Web Caster
 */

// ============================================================================
// ELEMEN CACHE & STATE GLOBAL UI
// ============================================================================
export const UI = {
    dbBadge: document.getElementById('dbStatusBadge'),
    fileInfo: document.getElementById('fileInfo'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    rowCountDisplay: document.getElementById('rowCountDisplay'),
    matchStats: document.getElementById('matchStats'),
    
    fileInput: document.getElementById('csvFileInput'),
    dropZone: document.getElementById('dropZone'),
    
    // Elemen Dropdown Kustom
    schoolSearchInput: document.getElementById('schoolSearchInput'),
    selectedSchoolOU: document.getElementById('selectedSchoolOU'),
    schoolDropdownList: document.getElementById('schoolDropdownList'),
    btnClearSchool: document.getElementById('btnClearSchool'),
    iconDropdown: document.getElementById('iconDropdown'),
    schoolDropdownContainer: document.getElementById('schoolDropdownContainer'),
    
    btnProcess: document.getElementById('btnProcess'),
    btnDownload: document.getElementById('btnDownload'),
    btnClearLogs: document.getElementById('btnClearLogs'),
    
    progressSection: document.getElementById('progressSection'),
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    progressLabel: document.getElementById('progressLabel'),
    
    logContainer: document.getElementById('logContainer'),
    tableBody: document.getElementById('resultsTableBody')
};

// Simpanan memori senarai sekolah untuk carian pantas
let globalSchoolsList = [];

// ============================================================================
// FUNGSI LOG DAN STATUS
// ============================================================================
export const logMessage = (message, type = 'info') => {
    if (!UI.logContainer) return;
    const entry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString('ms-MY', { hour12: false });
    
    let colorClass = 'text-slate-300';
    if (type === 'success') colorClass = 'text-emerald-400';
    if (type === 'error') colorClass = 'text-rose-400';
    if (type === 'warning') colorClass = 'text-amber-400';

    entry.className = `${colorClass}`;
    entry.innerHTML = `<span class="text-slate-500">[${timestamp}]</span> ${message}`;
    UI.logContainer.appendChild(entry);
    UI.logContainer.scrollTop = UI.logContainer.scrollHeight;
};

export const clearLogs = () => {
    if (UI.logContainer) {
        UI.logContainer.innerHTML = '';
        logMessage('Konsol dibersihkan.', 'info');
    }
};

export const updateDbStatus = (isConnected) => {
    if (!UI.dbBadge) return;
    if (isConnected) {
        UI.dbBadge.className = "inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20";
        UI.dbBadge.textContent = "Supabase: Bersambung (Aktif)";
    } else {
        UI.dbBadge.className = "inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20";
        UI.dbBadge.textContent = "Supabase: Terputus Hubungan";
    }
};

// ============================================================================
// FUNGSI DROPDOWN CARIAN SEKOLAH (CUSTOM AUTOCOMPLETE)
// ============================================================================
export const populateSchoolDropdown = (schools) => {
    globalSchoolsList = schools;
    
    if (UI.schoolSearchInput) {
        UI.schoolSearchInput.disabled = false;
        UI.schoolSearchInput.placeholder = "Cari nama sekolah atau kod...";
    }
    
    renderDropdownOptions(globalSchoolsList);
    setupDropdownListeners();
};

const renderDropdownOptions = (schoolsToRender) => {
    if (!UI.schoolDropdownList) return;
    
    UI.schoolDropdownList.innerHTML = '';
    
    if (schoolsToRender.length === 0) {
        UI.schoolDropdownList.innerHTML = `<li class="relative cursor-default select-none py-2 pl-3 pr-9 text-slate-500">Tiada sekolah dijumpai</li>`;
        return;
    }

    schoolsToRender.forEach(school => {
        if (school.kod_ou && school.nama_sekolah) {
            const li = document.createElement('li');
            li.className = 'relative cursor-pointer select-none py-2 pl-3 pr-9 text-slate-900 hover:bg-brand-50 hover:text-brand-600';
            li.innerHTML = `<span class="block truncate">${school.nama_sekolah} <span class="text-xs text-slate-400">(${school.kod_ou})</span></span>`;
            
            // Peristiwa klik untuk memilih sekolah
            li.addEventListener('mousedown', () => {
                selectSchool(school.nama_sekolah, school.kod_ou);
            });
            
            UI.schoolDropdownList.appendChild(li);
        }
    });
};

const selectSchool = (namaSekolah, kodOU) => {
    UI.schoolSearchInput.value = namaSekolah;
    UI.selectedSchoolOU.value = kodOU;
    UI.schoolDropdownList.classList.add('hidden');
    
    // Tunjuk butang pangkah (clear)
    UI.btnClearSchool.classList.remove('hidden');
    UI.iconDropdown.classList.add('hidden');
};

const setupDropdownListeners = () => {
    // 1. Carian bila menaip (Filter)
    UI.schoolSearchInput.addEventListener('input', (e) => {
        const searchText = e.target.value.toLowerCase();
        
        // Reset nilai rahsia jika pengguna menaip semula
        UI.selectedSchoolOU.value = '';
        UI.btnClearSchool.classList.add('hidden');
        UI.iconDropdown.classList.remove('hidden');

        const filtered = globalSchoolsList.filter(s => 
            (s.nama_sekolah && s.nama_sekolah.toLowerCase().includes(searchText)) ||
            (s.kod_ou && s.kod_ou.toLowerCase().includes(searchText))
        );
        
        renderDropdownOptions(filtered);
        UI.schoolDropdownList.classList.remove('hidden');
    });

    // 2. Papar senarai bila kotak carian ditekan (Focus)
    UI.schoolSearchInput.addEventListener('focus', () => {
        const searchText = UI.schoolSearchInput.value.toLowerCase();
        if (!searchText) {
            renderDropdownOptions(globalSchoolsList); // Papar semua jika kosong
        }
        UI.schoolDropdownList.classList.remove('hidden');
    });

    // 3. Sembunyi senarai bila hilang fokus (Blur)
    UI.schoolSearchInput.addEventListener('blur', () => {
        // Guna setTimeout agar event 'mousedown' pada <li> sempat berjalan
        setTimeout(() => {
            UI.schoolDropdownList.classList.add('hidden');
        }, 150);
    });

    // 4. Butang pangkah (Clear)
    UI.btnClearSchool.addEventListener('click', () => {
        UI.schoolSearchInput.value = '';
        UI.selectedSchoolOU.value = '';
        UI.btnClearSchool.classList.add('hidden');
        UI.iconDropdown.classList.remove('hidden');
        renderDropdownOptions(globalSchoolsList);
        UI.schoolSearchInput.focus();
    });
};

// Fungsi bantuan (Getter) untuk App.js
export const getSelectedSchoolOU = () => {
    return UI.selectedSchoolOU ? UI.selectedSchoolOU.value : '';
};

// ============================================================================
// FUNGSI LAIN-LAIN
// ============================================================================
export const showFileInfo = (fileName, count) => {
    if (UI.fileInfo && UI.fileNameDisplay && UI.rowCountDisplay) {
        UI.fileNameDisplay.textContent = fileName;
        UI.rowCountDisplay.textContent = count;
        UI.fileInfo.classList.remove('hidden');
    }
    if (UI.btnProcess) {
        UI.btnProcess.disabled = false;
    }
};

export const updateProgress = (percentage, label) => {
    if (!UI.progressSection) return;
    if (percentage === 0) UI.progressSection.classList.remove('hidden');
    if (UI.progressBar) UI.progressBar.style.width = `${percentage}%`;
    if (UI.progressPercentage) UI.progressPercentage.textContent = `${percentage}%`;
    if (UI.progressLabel && label) UI.progressLabel.textContent = label;
};

export const renderTable = (results) => {
    if (!UI.tableBody) return;
    UI.tableBody.innerHTML = ''; 

    if (results.length === 0) {
        UI.tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-10 text-center text-sm text-slate-500">
                    Tiada data padanan dijumpai.
                </td>
            </tr>`;
        return;
    }

    const displayLimit = Math.min(results.length, 100);

    for (let i = 0; i < displayLimit; i++) {
        const row = results[i];
        
        const statusBadgeClass = row.statusFlag 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${i + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${row.originalName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row.dbName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row.namaSekolah}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadgeClass}">
                    ${row.status}
                </span>
            </td>
        `;
        UI.tableBody.appendChild(tr);
    }

    if (results.length > 100) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="6" class="px-6 py-4 text-center text-sm text-brand-600 font-medium bg-brand-50">
                Menunjukkan 100 rekod pertama daripada ${results.length} hasil. Sila muat turun CSV untuk melihat rekod penuh.
            </td>
        `;
        UI.tableBody.appendChild(tr);
    }
};

export const updateStats = (stats) => {
    if (UI.matchStats) {
        UI.matchStats.innerHTML = `Jumlah Semakan: <b>${stats.total}</b> | Berjaya: <b class="text-green-600">${stats.success}</b> | Gagal: <b class="text-red-600">${stats.failed}</b>`;
    }
};