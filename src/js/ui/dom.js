/**
 * Modul: Manipulasi DOM (UI)
 * Folder: /src/js/ui/dom.js
 * Fungsi: Mengurus interaksi pengguna, kemas kini antaramuka, pemaparan jadual, dan sistem log.
 * Arkitek: Pro Web Caster (Migrasi ke Standalone Client-Side)
 */

// ============================================================================
// ELEMEN CACHE (Pre-fetch DOM elements to improve performance)
// ============================================================================
export const UI = {
    // Badges & Info
    dbBadge: document.getElementById('dbStatusBadge'),
    fileInfo: document.getElementById('fileInfo'),
    fileNameDisplay: document.getElementById('fileNameDisplay'),
    rowCountDisplay: document.getElementById('rowCountDisplay'),
    matchStats: document.getElementById('matchStats'),
    
    // Inputs & Dropzone
    fileInput: document.getElementById('csvFileInput'),
    dropZone: document.getElementById('dropZone'),
    
    // Buttons
    btnProcess: document.getElementById('btnProcess'),
    btnDownload: document.getElementById('btnDownload'),
    btnClearLogs: document.getElementById('btnClearLogs'),
    
    // Progress
    progressSection: document.getElementById('progressSection'),
    progressBar: document.getElementById('progressBar'),
    progressPercentage: document.getElementById('progressPercentage'),
    progressLabel: document.getElementById('progressLabel'),
    
    // Tables & Logs
    logContainer: document.getElementById('logContainer'),
    tableBody: document.getElementById('resultsTableBody')
};

// ============================================================================
// FUNGSI LOG DAN STATUS
// ============================================================================

/**
 * Mencetak mesej ke dalam "Konsol Sistem" di antaramuka.
 * @param {string} message - Teks log.
 * @param {string} type - Jenis log: 'info', 'success', 'error', 'warning'.
 */
export const logMessage = (message, type = 'info') => {
    if (!UI.logContainer) return;

    const entry = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString('ms-MY', { hour12: false });
    
    // Tetapkan warna berdasarkan jenis log
    let colorClass = 'text-slate-300';
    if (type === 'success') colorClass = 'text-emerald-400';
    if (type === 'error') colorClass = 'text-rose-400';
    if (type === 'warning') colorClass = 'text-amber-400';

    entry.className = `${colorClass}`;
    entry.innerHTML = `<span class="text-slate-500">[${timestamp}]</span> ${message}`;
    
    UI.logContainer.appendChild(entry);
    
    // Auto-scroll ke bawah
    UI.logContainer.scrollTop = UI.logContainer.scrollHeight;
};

/**
 * Memadamkan semua log daripada Konsol Sistem.
 */
export const clearLogs = () => {
    if (UI.logContainer) {
        UI.logContainer.innerHTML = '';
        logMessage('Konsol dibersihkan.', 'info');
    }
};

/**
 * Mengemas kini lencana status pangkalan data di Header.
 * @param {boolean} isConnected - True jika bersambung, False jika gagal.
 */
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
// FUNGSI PAPARAN MAKLUMAT FAIL
// ============================================================================

/**
 * Memaparkan nama fail dan bilangan baris selepas CSV dimuat naik.
 * @param {string} fileName - Nama fail CSV.
 * @param {number} count - Jumlah baris.
 */
export const showFileInfo = (fileName, count) => {
    if (UI.fileInfo && UI.fileNameDisplay && UI.rowCountDisplay) {
        UI.fileNameDisplay.textContent = fileName;
        UI.rowCountDisplay.textContent = count;
        UI.fileInfo.classList.remove('hidden');
    }
    
    // Aktifkan butang proses
    if (UI.btnProcess) {
        UI.btnProcess.disabled = false;
    }
};

// ============================================================================
// FUNGSI PROGRESS BAR
// ============================================================================

/**
 * Mengawal paparan bar progres.
 * @param {number} percentage - Nilai peratusan (0-100).
 * @param {string} label - Mesej status.
 */
export const updateProgress = (percentage, label) => {
    if (!UI.progressSection) return;
    
    if (percentage === 0) {
        UI.progressSection.classList.remove('hidden');
    }

    if (UI.progressBar) UI.progressBar.style.width = `${percentage}%`;
    if (UI.progressPercentage) UI.progressPercentage.textContent = `${percentage}%`;
    if (UI.progressLabel && label) UI.progressLabel.textContent = label;
    
    if (percentage === 100) {
        setTimeout(() => {
            // Biarkan ia kelihatan sebentar sebelum disembunyikan (pilihan)
            // UI.progressSection.classList.add('hidden');
        }, 3000);
    }
};

// ============================================================================
// FUNGSI JADUAL PRATONTON & STATISTIK
// ============================================================================

/**
 * Melukis hasil padanan ke dalam jadual HTML.
 * @param {Array} results - Tatasusunan objek dari `executeMatching`.
 */
export const renderTable = (results) => {
    if (!UI.tableBody) return;
    
    UI.tableBody.innerHTML = ''; // Kosongkan jadual sedia ada

    if (results.length === 0) {
        UI.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">
                    Tiada data padanan dijumpai.
                </td>
            </tr>`;
        return;
    }

    // Hadkan paparan kepada 100 rekod pertama sahaja agar pelayar tidak terbeban
    const displayLimit = Math.min(results.length, 100);

    for (let i = 0; i < displayLimit; i++) {
        const row = results[i];
        
        // Logik Pewarnaan Status
        const statusBadgeClass = row.statusFlag 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-800";

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${i + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">${row.originalName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row.dbName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500">${row.email}</td>
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
            <td colspan="5" class="px-6 py-4 text-center text-sm text-brand-600 font-medium bg-brand-50">
                Menunjukkan 100 rekod pertama daripada ${results.length} hasil. Sila muat turun CSV untuk melihat rekod penuh.
            </td>
        `;
        UI.tableBody.appendChild(tr);
    }
};

/**
 * Kemas kini teks statistik di penjuru atas jadual.
 * @param {Object} stats - Objek { success, failed, total }
 */
export const updateStats = (stats) => {
    if (UI.matchStats) {
        UI.matchStats.innerHTML = `Jumlah Semakan: <b>${stats.total}</b> | Berjaya: <b class="text-green-600">${stats.success}</b> | Gagal: <b class="text-red-600">${stats.failed}</b>`;
    }
};