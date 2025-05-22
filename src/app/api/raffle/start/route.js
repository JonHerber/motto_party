import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const projectRoot = process.cwd();
const usersCsvFilePath = path.join(projectRoot, 'user_credentials.csv');
const mottosCsvFilePath = path.join(projectRoot, 'motto_submissions.csv');
const raffleResultsCsvFilePath = path.join(projectRoot, 'raffle_results.csv');

const USERS_CSV_HEADER = 'username,password\\n';
const MOTTOS_CSV_HEADER = 'motto_text,submitter_name\\n';
const RAFFLE_CSV_HEADER = 'username,assigned_motto_text\\n';

// Helper function to read users from user_credentials.csv
async function getRegisteredUsers() {
  try {
    if (!fs.existsSync(usersCsvFilePath)) {
      // If file doesn't exist, it implies no users or an issue.
      // For raffle purposes, if no users file, no raffle can happen.
      console.warn('user_credentials.csv not found. Cannot get users.');
      return [];
    }
    const fileContent = fs.readFileSync(usersCsvFilePath, 'utf8');
    const trimmedContent = fileContent.trim();
    if (!trimmedContent || trimmedContent.toLowerCase() === USERS_CSV_HEADER.trim().toLowerCase()) {
      return []; // File is empty or only contains the header
    }
    const result = Papa.parse(trimmedContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim(),
    });
    return Array.isArray(result.data) ? result.data.map(user => user.username?.trim()).filter(Boolean) : [];
  } catch (error) {
    console.error('Error reading users for raffle:', error);
    throw new Error('Could not retrieve registered users.');
  }
}

// Helper function to read mottos from motto_submissions.csv
async function getSubmittedMottos() {
  try {
    if (!fs.existsSync(mottosCsvFilePath)) {
      console.warn('motto_submissions.csv not found. Cannot get mottos.');
      return [];
    }
    const fileContent = fs.readFileSync(mottosCsvFilePath, 'utf8');
    const trimmedContent = fileContent.trim();
    // Check if the file is empty or contains only the header
    if (!trimmedContent || trimmedContent.toLowerCase() === MOTTOS_CSV_HEADER.trim().toLowerCase().replace(/\\\\n$/, '')) {
      return [];
    }
    const result = Papa.parse(trimmedContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: header => header.toLowerCase().trim(), // Ensures keys like 'motto_text', 'submitter_name'
    });

    if (result.errors.length > 0) {
        console.error('Papaparse errors in getSubmittedMottos:', result.errors);
        // Potentially throw an error or return successfully parsed data if any
    }

    // Map to the desired structure { text, submitter }
    return Array.isArray(result.data) 
      ? result.data
          .map(motto => ({
            text: motto.motto_text?.trim(), 
            submitter: motto.submitter_name?.trim().toLowerCase() 
          }))
          .filter(m => m.text && m.submitter) // Ensure both fields are present and valid
      : [];
  } catch (error) {
    console.error('Error reading mottos for raffle:', error);
    throw new Error('Could not retrieve submitted mottos.');
  }
}

// Fisher-Yates (aka Knuth) Shuffle algorithm
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

export async function POST(request) {
  try {
    const { initiatingUser } = await request.json();

    // Authorization: Only 'antonia' can start the raffle
    if (initiatingUser?.toLowerCase() !== 'antonia') {
      return NextResponse.json({ error: 'Unauthorized: Only user "antonia" can start the raffle.' }, { status: 403 });
    }

    const users = await getRegisteredUsers(); // Array of username strings
    const allMottos = await getSubmittedMottos(); // Array of {text, submitter}

    if (users.length === 0) {
      return NextResponse.json({ error: 'No registered users to conduct a raffle for.' }, { status: 400 });
    }
    if (allMottos.length === 0) {
      return NextResponse.json({ error: 'No mottos submitted to be raffled.' }, { status: 400 });
    }

    const raffleAssignments = users.map((username, userIndex) => {
      // Filter mottos to get those not submitted by the current user
      let candidateMottosForThisUser = allMottos.filter(
        motto => motto.submitter && motto.submitter.toLowerCase() !== username.toLowerCase()
      );

      let poolToUse;
      if (candidateMottosForThisUser.length > 0) {
        // If there are mottos from others, shuffle and use them
        poolToUse = shuffleArray([...candidateMottosForThisUser]);
      } else {
        // Fallback: if no "other" mottos (e.g., user submitted the only one, or all others are "taken" by their submitters)
        // use the full list of mottos, shuffled. The user might get their own motto in this case.
        poolToUse = shuffleArray([...allMottos]); 
      }
      
      // Assign a motto, cycling through the chosen pool for this user.
      // userIndex % poolToUse.length ensures we pick an item from the pool, cycling if necessary.
      const assignedMottoObject = poolToUse[userIndex % poolToUse.length]; 
      
      return { username, assigned_motto_text: assignedMottoObject.text };
    });

    // Save raffle results to CSV (overwrites previous results)
    const csvData = Papa.unparse(raffleAssignments, {
        header: true,
        columns: ['username', 'assigned_motto_text']
    });
    fs.writeFileSync(raffleResultsCsvFilePath, csvData + '\\n', 'utf8');

    return NextResponse.json({ message: 'Raffle conducted successfully! Results saved.', assignments: raffleAssignments }, { status: 200 });

  } catch (error) {
    console.error('[API Raffle Start Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred during the raffle.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
