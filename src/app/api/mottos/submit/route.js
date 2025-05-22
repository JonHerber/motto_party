import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const projectRoot = process.cwd();
const csvFilePath = path.join(projectRoot, 'motto_submissions.csv');
const CSV_HEADER = 'motto_text,submitter_name\n';

// Helper function to ensure CSV file exists with a header
async function ensureCsvFile() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      fs.writeFileSync(csvFilePath, CSV_HEADER, 'utf8');
    }
  } catch (error) {
    console.error('Error ensuring CSV file exists:', error);
    throw new Error('Could not initialize motto submissions storage.');
  }
}

// Helper function to read all motto submissions
async function getAllMottos() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      fs.writeFileSync(csvFilePath, CSV_HEADER, 'utf8');
      return [];
    }
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const trimmedContent = fileContent.trim();
    if (!trimmedContent || trimmedContent.toLowerCase() === CSV_HEADER.trim().toLowerCase()) {
      return [];
    }
    const result = Papa.parse(trimmedContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim(),
    });
    return Array.isArray(result.data) ? result.data.map(m => ({
      motto_text: m.motto_text ? String(m.motto_text).trim() : '',
      submitter_name: m.submitter_name ? String(m.submitter_name).trim() : ''
    })).filter(m => m.motto_text && m.submitter_name) : [];
  } catch (error) {
    console.error('Error reading mottos from CSV:', error);
    throw new Error('Could not retrieve existing mottos.');
  }
}

// Helper function to save all mottos (overwrites the file)
async function saveAllMottos(mottos) {
  try {
    // Ensure the mottos array contains objects with motto_text and submitter_name
    const csvData = Papa.unparse(mottos.map(m => ({
        motto_text: m.motto_text,
        submitter_name: m.submitter_name
    })), {
      header: true, // Include header row
      columns: ['motto_text', 'submitter_name'] // Explicitly define column order
    });
    fs.writeFileSync(csvFilePath, csvData + '\n', 'utf8'); // Add newline at the end
  } catch (error) {
    console.error('Error writing mottos to CSV file:', error);
    throw new Error('Could not save motto submissions.');
  }
}

export async function POST(request) {
  try {
    const { mottoText, submitterName } = await request.json();

    if (!mottoText || !submitterName) {
      return NextResponse.json({ error: 'Motto text and submitter name are required.' }, { status: 400 });
    }

    if (typeof mottoText !== 'string' || typeof submitterName !== 'string') {
        return NextResponse.json({ error: 'Invalid data format for motto or submitter.' }, { status: 400 });
    }

    const cleanedMottoText = mottoText.trim();
    const cleanedSubmitterName = submitterName.trim().toLowerCase(); // Ensure consistent casing for comparison

    if (!cleanedMottoText || !cleanedSubmitterName) {
        return NextResponse.json({ error: 'Motto text and submitter name cannot be empty after trimming.' }, { status: 400 });
    }

    let mottos = await getAllMottos();
    const existingMottoIndex = mottos.findIndex(m => m.submitter_name.toLowerCase() === cleanedSubmitterName);

    let message;
    if (existingMottoIndex !== -1) {
      // User already submitted a motto, update it
      mottos[existingMottoIndex].motto_text = cleanedMottoText;
      message = 'Motto updated successfully!';
    } else {
      // New submission
      mottos.push({ motto_text: cleanedMottoText, submitter_name: cleanedSubmitterName });
      message = 'Motto submitted successfully!';
    }

    await saveAllMottos(mottos);

    return NextResponse.json({ message, motto: { text: cleanedMottoText, name: cleanedSubmitterName } }, { status: 200 }); // Changed status to 200 for updates, 201 for new
  } catch (error) {
    console.error('[API Motto Submit Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
