/**
 * Modul: Pengendali Fail (File Handler)
 * Folder: /src/js/fileHandler.js
 * Fungsi: Membaca fail Excel/CSV muat naik pengguna dan menjana fail CSV hasil padanan untuk muat turun.
 * Arkitek: Pro Web Caster (Strict SoC Enforced)
 */

/**
 * Membaca fail dari input muat naik dan menukarkannya kepada Array of Objects (JSON).
 * Menggunakan FileReader API dan SheetJS (XLSX).
 * @param {File} file - Objek fail yang dipilih oleh pengguna
 * @returns {Promise<Array<Object>>} - Array yang mengandungi data baris demi baris
 */
export const readExcelFile = (file) => {
    return new Promise((resolve, reject) => {
        // Pengesahan asas fail
        if (!file) {
            return reject(new Error("Tiada fail dipilih."));
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                
                // Baca buku kerja (workbook) menggunakan SheetJS
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Ambil helaian (sheet) pertama sahaja
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                
                // Tukar helaian kepada tatasusunan objek JSON (Array of Objects)
                // defval: "" memastikan sel yang kosong dibaca sebagai string kosong, bukan 'undefined'
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                // Pengesahan Integriti Data: Pastikan fail tidak kosong
                if (jsonData.length === 0) {
                    throw new Error("Fail yang dimuat naik adalah kosong atau format tidak disokong.");
                }

                // Pengesahan Integriti Header: Pastikan wujud lajur bernama "NAMA"
                // Mencari kunci "NAMA" tanpa mengambil kira huruf besar/kecil sekiranya tersilap eja
                const headers = Object.keys(jsonData[0]);
                const hasNameColumn = headers.some(header => header.trim().toUpperCase() === 'NAMA');

                if (!hasNameColumn) {
                    throw new Error("Ralat Struktur Data: Sila pastikan fail anda mempunyai lajur bernama 'NAMA'.");
                }

                // Normalisasi nama kunci untuk lajur NAMA (jika ada spasi tersembunyi dsb)
                const normalizedData = jsonData.map(row => {
                    const newRow = { ...row };
                    headers.forEach(header => {
                        if (header.trim().toUpperCase() === 'NAMA' && header !== 'NAMA') {
                            newRow['NAMA'] = newRow[header];
                            delete newRow[header];
                        }
                    });
                    return newRow;
                });

                resolve(normalizedData);
            } catch (error) {
                console.error("Ralat ketika memproses fail Excel:", error);
                reject(error);
            }
        };

        reader.onerror = (error) => {
            console.error("Ralat FileReader:", error);
            reject(new Error("Gagal membaca fail dari storan pelayar."));
        };

        // Mulakan proses bacaan sebagai ArrayBuffer (Sesuai untuk Excel/CSV parsing oleh SheetJS)
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Menerima data akhir (tatasusunan objek) dan mencetuskan muat turun automatik sebagai fail .csv
 * @param {Array<Object>} finalData - Data lengkap yang telah dipadankan
 * @param {string} originalFileName - Nama fail asal (contoh: "Data_Pelajar.xlsx")
 */
export const exportToCSV = (finalData, originalFileName = 'data') => {
    try {
        // Cipta helaian (worksheet) baharu dari tatasusunan objek
        const newWorksheet = XLSX.utils.json_to_sheet(finalData);
        
        // Cipta buku kerja (workbook) baharu
        const newWorkbook = XLSX.utils.book_new();
        
        // Masukkan helaian ke dalam buku kerja
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, "Hasil Padanan");
        
        // Ekstrak nama asas fail tanpa ekstensi (cth: "Data_Pelajar.xlsx" -> "Data_Pelajar")
        const baseName = originalFileName.replace(/\.[^/.]+$/, "");
        const exportFileName = `Padanan_DELIMa_${baseName}.csv`;

        // Tulis dan cetuskan muat turun menggunakan SheetJS (format CSV)
        XLSX.writeFile(newWorkbook, exportFileName, { bookType: 'csv' });
        
    } catch (error) {
        console.error("Ralat ketika menjana fail CSV:", error);
        alert("Berlaku ralat sistem semasa menjana fail muat turun CSV.");
    }
};