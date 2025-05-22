import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const projectRoot = process.cwd();
const csvFilePath = path.join(projectRoot, 'motto_submissions.csv');
const CSV_HEADER = 'motto_text,submitter_name\\n'; // Ensure newline

// Helper function to read mottos from CSV using Papaparse
async function getMottoSubmissions() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      // If the file doesn't exist, create it with a header
      fs.writeFileSync(csvFilePath, CSV_HEADER, 'utf8');
      return []; // No submissions yet
    }

    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const trimmedContent = fileContent.trim();

    // Check if the file is empty or only contains the header
    if (!trimmedContent || trimmedContent.toLowerCase() === CSV_HEADER.trim().toLowerCase()) {
        return [];
    }

    const result = Papa.parse(trimmedContent, {
      header: true, // First row is the header
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim(), // Normalize headers
    });

    if (result.errors.length > 0) {
      console.error('Papaparse parsing errors while reading mottos:', result.errors);
      // Optionally, handle errors more gracefully, e.g., by returning only successfully parsed rows
    }

    // Ensure data is an array and objects have the expected properties
    const submissions = Array.isArray(result.data) ? result.data : [];
    return submissions.map((item, index) => ({
      id: Date.now() + index, // Generate a unique ID for client-side key prop
      text: item.motto_text ? String(item.motto_text).trim() : '',
      name: item.submitter_name ? String(item.submitter_name).trim() : ''
    })).filter(item => item.text && item.name); // Filter out any incomplete entries

  } catch (error) {
    console.error('Error reading or parsing motto_submissions.csv:', error);
    // In case of a critical error, re-throw or return a structured error response
    throw new Error('Could not retrieve motto submissions.');
  }
}

export async function GET(request) {
  try {
    const mottos = await getMottoSubmissions();
    return NextResponse.json(mottos, { status: 200 });
  } catch (error) {
    console.error('[API Get Mottos Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred while fetching mottos.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
