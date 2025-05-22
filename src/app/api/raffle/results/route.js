// filepath: /home/yonie/Documents/mottoparty/src/app/api/raffle/results/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const projectRoot = process.cwd();
const raffleResultsCsvFilePath = path.join(projectRoot, 'raffle_results.csv');
const RAFFLE_CSV_HEADER = 'username,assigned_motto_text\\n';

// Helper function to read raffle results
async function getRaffleResults() {
  try {
    if (!fs.existsSync(raffleResultsCsvFilePath)) {
      // If the file doesn't exist, it means raffle hasn't been run or results are not saved.
      return []; 
    }
    const fileContent = fs.readFileSync(raffleResultsCsvFilePath, 'utf8');
    const trimmedContent = fileContent.trim();

    if (!trimmedContent || trimmedContent.toLowerCase() === RAFFLE_CSV_HEADER.trim().toLowerCase()) {
        return []; // File is empty or only contains the header
    }

    const result = Papa.parse(trimmedContent, {
      header: true, 
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim(),
    });

    if (result.errors.length > 0) {
      console.error('Papaparse parsing errors while reading raffle results:', result.errors);
    }
    
    return Array.isArray(result.data) ? result.data.map(item => ({
        username: item.username ? String(item.username).trim() : '',
        assigned_motto_text: item.assigned_motto_text ? String(item.assigned_motto_text).trim() : ''
    })).filter(item => item.username && item.assigned_motto_text) : [];

  } catch (error) {
    console.error('Error reading or parsing raffle_results.csv:', error);
    throw new Error('Could not retrieve raffle results.');
  }
}

export async function GET(request) {
  try {
    const results = await getRaffleResults();
    // Optionally, filter results for a specific user if a query param is provided
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (username) {
      const userResult = results.find(r => r.username.toLowerCase() === username.toLowerCase());
      if (userResult) {
        return NextResponse.json(userResult, { status: 200 });
      } else {
        return NextResponse.json({ message: 'No raffle result found for this user.' }, { status: 404 });
      }
    }
    // If no username query param, return all results (maybe for admin view or if needed)
    // For now, let's assume this endpoint is primarily for fetching a specific user's result or checking if raffle happened.
    // If general GET is not desired, this part can be removed or restricted.
    return NextResponse.json(results, { status: 200 }); // Or return a message if no username is expected without query

  } catch (error) {
    console.error('[API Get Raffle Results Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred while fetching raffle results.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
