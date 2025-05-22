import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse'; // Import papaparse
import bcrypt from 'bcrypt'; // Import bcrypt

const csvFilePath = path.join(process.cwd(), 'user_credentials.csv');
const CSV_HEADER_EXPECTED = 'username,password_hash'; // Expected header

// Helper function to read users from CSV using Papaparse
async function readUsers() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      return []; // File doesn't exist, so no users
    }
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    const trimmedContent = fileContent.trim();

    // Check if the file is empty or effectively empty (e.g., only whitespace or just the header)
    if (!trimmedContent || trimmedContent.toLowerCase() === CSV_HEADER_EXPECTED.toLowerCase()) {
        return [];
    }

    const result = Papa.parse(trimmedContent, {
      header: true, // Treat the first row as headers
      skipEmptyLines: true, // Skip any blank lines
      transformHeader: header => header.toLowerCase().trim(), // Normalize headers
    });

    if (result.errors.length > 0) {
      console.error('Papaparse parsing errors in login:', result.errors);
      // Decide how to handle parsing errors. For now, we'll return what was parsed.
    }
    
    // Ensure data is an array and process usernames and password hashes
    const users = Array.isArray(result.data) ? result.data : [];
    return users.map(user => ({
      username: user.username ? user.username.toLowerCase().trim() : '',
      password_hash: user.password_hash ? user.password_hash.trim() : '' // Read password_hash
    })).filter(user => user.username && user.password_hash); // Filter out users with no username or hash

  } catch (error) {
    console.error('Error reading or parsing CSV file with Papaparse:', error);
    return []; 
  }
}

export async function POST(request) {
  try {
    const { name, password: inputPassword } = await request.json();

    if (!name || !inputPassword) {
      return NextResponse.json({ message: 'Name and password are required' }, { status: 400 });
    }

    const users = await readUsers();
    const lowerCaseName = name.trim().toLowerCase();

    const user = users.find(u => u.username === lowerCaseName);

    if (!user) {
      console.log(`Login attempt: User '${lowerCaseName}' not found.`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Compare the provided password with the stored hash
    const passwordMatches = await bcrypt.compare(inputPassword, user.password_hash);

    if (passwordMatches) {
      return NextResponse.json({ message: 'Login successful', user: { name: user.username } }, { status: 200 });
    } else {
      console.log(`Login attempt: Password mismatch for user '${lowerCaseName}'.`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

  } catch (error) {
    console.error('Login API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
