/**
 * Module: Matcher Engine (Core)
 * Folder: /src/js/matcher.js
 * Function: Processes arrays of CSV data and Database data to find exact and normalized matches.
 * Architect: Pro Web Caster (Forensic Normalization V2.0)
 * Note: Strictly enforces Separation of Concerns (SoC).
 */

/**
 * Normalizes a given name string by removing whitespace, standardizing case, 
 * and stripping out common Malaysian naming artifacts (BIN, BINTI, A/L, A/P, aliases).
 * Translated and enhanced from original GAS 'Normalisasi.gs'.
 * * @param {string} name - The raw name string from CSV or DB.
 * @returns {string} - The fully normalized, comparable name string.
 */
export function normalizeName(name) {
    // Data Integrity Check: Return empty string if data is null, undefined, or not a string
    if (!name || typeof name !== 'string') {
        return '';
    }

    // 1. Convert to uppercase for baseline standardization
    let cleaned = name.toUpperCase();

    // 2. Handle Aliases: If an '@' exists, take the primary name (before the '@')
    if (cleaned.includes('@')) {
        cleaned = cleaned.split('@')[0];
    }

    // 3. Remove system suffixes/prefixes (e.g., from MOE/KPM systems) if any
    cleaned = cleaned.replace(/-MOE/g, '').replace(/-KPM/g, '');

    // 4. Strip out common patronymic/matronymic terms strictly as distinct words
    // Using word boundaries (\b) to prevent stripping 'BIN' from 'BINTANG'
    const artifactsToRemove = ['BIN', 'BINTI', 'BT', 'B', 'A/L', 'A/P', 'AL', 'AP', 'ANAK'];
    
    artifactsToRemove.forEach(artifact => {
        // Create regex for exact word match, handling potential surrounding spaces
        const regex = new RegExp(`\\b${artifact}\\b`, 'g');
        cleaned = cleaned.replace(regex, ' ');
    });

    // 5. Remove all remaining punctuation and special characters, leaving only letters and numbers
    cleaned = cleaned.replace(/[^\w\s]/g, '');

    // 6. Collapse multiple spaces into a single space and trim trailing/leading spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * Executes the core matching algorithm between parsed CSV data and fetched DB data.
 * * @param {Array<Object>} csvData - Array of objects from Papa.parse (Headers must match CSV exactly).
 * @param {Array<Object>} dbData - Array of objects from Supabase (Schema columns).
 * @returns {Object} - An object containing arrays of matched data, unmatched CSV data, and unmatched DB data.
 */
export function matchData(csvData, dbData) {
    const results = {
        matches: [],
        unmatchedCsv: [],
        unmatchedDb: [...dbData] // Clone DB array to mutate as we find matches
    };

    // Failsafe: Ensure arrays are valid
    if (!Array.isArray(csvData) || !Array.isArray(dbData)) {
        console.error('Matcher Engine Error: Invalid data structures passed to matchData().');
        return results;
    }

    // Iterate through every row in the uploaded CSV
    csvData.forEach((csvRow, index) => {
        // Data Handling Failsafe: CSV keys are strictly case-sensitive based on the CSV header.
        // We target 'NAMA' explicitly.
        const rawCsvName = csvRow['NAMA'];

        // Skip completely empty rows
        if (!rawCsvName) {
            return; 
        }

        const normalizedCsvName = normalizeName(rawCsvName);

        // Scan the unmatched DB pool for a normalized match
        const matchIndex = results.unmatchedDb.findIndex(dbRow => {
            // Data Handling Failsafe: Target 'name' column from Supabase schema
            const rawDbName = dbRow.name; 
            
            if (!rawDbName) {
                return false;
            }

            return normalizeName(rawDbName) === normalizedCsvName;
        });

        // Evaluate match results
        if (matchIndex !== -1) {
            // Match successfully found
            const matchedDbRecord = results.unmatchedDb[matchIndex];
            
            // Build the merged entity
            results.matches.push({
                csvData: csvRow,
                dbData: matchedDbRecord,
                normalizedKey: normalizedCsvName
            });

            // Remove the matched record from the pool to prevent duplicate mapping
            results.unmatchedDb.splice(matchIndex, 1);
        } else {
            // No match found in the database pool
            results.unmatchedCsv.push(csvRow);
        }
    });

    console.info(`Matcher Engine Report: Processed ${csvData.length} CSV rows against ${dbData.length} DB records.`);
    console.info(`Results -> Matched: ${results.matches.length} | Unmatched CSV: ${results.unmatchedCsv.length} | Unmatched DB: ${results.unmatchedDb.length}`);

    return results;
}