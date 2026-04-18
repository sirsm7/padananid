/**
 * Module: Main Application Flow (Orchestrator)
 * Folder: /src/js/app.js
 * Function: Handles DOM events, coordinates data between UI, API, FileHandler, and Matcher modules.
 * Architect: Pro Web Caster
 * Note: Adheres strictly to Separation of Concerns (SoC).
 */

import { handleFileUpload } from './fileHandler.js';
import { fetchOrgUnits } from './api.js';
import { matchData } from './matcher.js';
import { renderTable, toggleLoading, updateStats } from './ui.js';

// DOM Elements Initialization
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultsArea = document.getElementById('resultsArea');
const btnExport = document.getElementById('btnExport');

// State Management (Variables to hold the data in memory)
let parsedCsvData = [];
let fetchedDbData = [];
let finalMatchedResults = null;

/**
 * Initializes Event Listeners for the application.
 * Called immediately upon script execution.
 */
function init() {
    console.info('App Orchestrator: System Initialized.');

    // 1. Drag and Drop Events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('border-blue-500', 'bg-blue-50');
    });

    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('border-blue-500', 'bg-blue-50');
        const file = e.dataTransfer.files[0];
        if (file) {
            processFile(file);
        }
    });

    // 2. Click to Upload Event
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    });

    // 3. Export Button Event
    btnExport.addEventListener('click', () => {
        if (finalMatchedResults && finalMatchedResults.matches.length > 0) {
            exportToCSV(finalMatchedResults.matches);
        } else {
            alert('Tiada data padanan untuk dieksport.');
        }
    });
}

/**
 * Main execution pipeline. Triggers when a file is dropped or selected.
 * Coordinates File Reading -> API Fetching -> Matching -> UI Rendering.
 * * @param {File} file - The CSV file object from the user's input.
 */
async function processFile(file) {
    try {
        console.group('--- Pipeline Execution Started ---');
        
        // Step 1: UI Update - Show Loading State
        toggleLoading(true, uploadArea, loadingSpinner, resultsArea);

        // Step 2: Parse the CSV File
        console.log(`Step 2: Parsing CSV file: ${file.name}`);
        parsedCsvData = await handleFileUpload(file);
        
        // Debugging: Log the first row of CSV to verify Header mapping (e.g., 'NAMA')
        console.log(`CSV Parsing Complete. Rows detected: ${parsedCsvData.length}`);
        if(parsedCsvData.length > 0) {
            console.dir('CSV First Row Sample:', parsedCsvData[0]);
            if(parsedCsvData[0]['NAMA'] === undefined) {
                 console.warn("WARNING: CSV Column 'NAMA' is missing. Matcher will fail. Please check CSV headers.");
            }
        }

        // Step 3: Fetch Data from Supabase
        console.log('Step 3: Fetching Data from Supabase API...');
        fetchedDbData = await fetchOrgUnits();
        
        // Debugging: Log the first row of DB to verify schema mapping (e.g., 'name')
        console.log(`DB Fetch Complete. Records received: ${fetchedDbData.length}`);
        if(fetchedDbData.length > 0) {
             console.dir('DB First Row Sample:', fetchedDbData[0]);
             if(fetchedDbData[0].name === undefined) {
                 console.warn("WARNING: DB Column 'name' is missing. Matcher will fail. Please check API payload.");
             }
        }

        // Step 4: Execute Matching Engine
        console.log('Step 4: Executing Core Matcher Engine...');
        finalMatchedResults = matchData(parsedCsvData, fetchedDbData);
        console.log('Matching Complete.', finalMatchedResults);

        // Step 5: Render Results to UI
        console.log('Step 5: Pushing results to UI Engine...');
        updateStats(finalMatchedResults);
        renderTable(finalMatchedResults.matches);

        // Step 6: UI Update - Show Results State
        toggleLoading(false, uploadArea, loadingSpinner, resultsArea);
        
        console.groupEnd();

    } catch (error) {
        console.error('Pipeline Execution Failed:', error);
        alert(`Ralat semasa memproses data: ${error.message}`);
        toggleLoading(false, uploadArea, loadingSpinner, resultsArea);
        console.groupEnd();
    }
}

/**
 * Utility function to export matched data back to a CSV format.
 * Currently builds a basic CSV string and triggers a browser download.
 * * @param {Array<Object>} matchedData - Array of matched objects containing both CSV and DB data.
 */
function exportToCSV(matchedData) {
    if (!matchedData || matchedData.length === 0) return;

    // Define the headers for the export file
    const headers = ['NAMA (CSV)', 'ID MURID (CSV)', 'NAMA (DB)', 'EMAIL (DB)', 'ORG_UNIT_PATH (DB)'];
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n";

    // Map the merged data to the export columns
    matchedData.forEach(item => {
        // Safe access in case fields are missing or have commas
        const csvName = `"${(item.csvData['NAMA'] || '').replace(/"/g, '""')}"`;
        const csvId = `"${(item.csvData['ID MURID'] || '').replace(/"/g, '""')}"`;
        const dbName = `"${(item.dbData.name || '').replace(/"/g, '""')}"`;
        const dbEmail = `"${(item.dbData.email || '').replace(/"/g, '""')}"`;
        const dbOrgUnit = `"${(item.dbData.orgUnitPath || '').replace(/"/g, '""')}"`;

        const row = [csvName, csvId, dbName, dbEmail, dbOrgUnit];
        csvContent += row.join(",") + "\n";
    });

    // Create a hidden link and trigger the download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Padanan_Berjaya.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Bootstrap the application
init();