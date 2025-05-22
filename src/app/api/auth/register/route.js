import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import bcrypt from 'bcrypt';

// Define the path to the CSV file
const projectRoot = process.cwd(); // Gets the root directory of your Next.js project
const csvFilePath = path.join(projectRoot, 'user_credentials.csv');
const CSV_HEADER = 'username,password_hash\n'; // Changed password to password_hash
const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

// Helper function to read users from CSV using Papaparse
async function getUsers() {
  try {
    if (!fs.existsSync(csvFilePath)) {
      // Create the file with a header if it doesn't exist
      fs.writeFileSync(csvFilePath, CSV_HEADER, 'utf8');
      return [];
    }
    const fileContent = fs.readFileSync(csvFilePath, 'utf8');
    // Trim content to remove leading/trailing whitespace that might interfere with parsing
    const trimmedContent = fileContent.trim();

    if (!trimmedContent || trimmedContent === CSV_HEADER.trim()) {
        return []; // File is empty or only contains the header
    }

    const result = Papa.parse(trimmedContent, {
      header: true, // First row is the header
      skipEmptyLines: true,
    });

    if (result.errors.length > 0) {
      console.error('Papaparse parsing errors:', result.errors);
      // Depending on the severity, you might want to throw an error or return partial data
      // For now, let's try to return data if any was parsed successfully
    }
    // Ensure username is treated as it was (lowercase)
    return result.data.map(user => ({ ...user, username: user.username ? user.username.toLowerCase().trim() : '' }));

  } catch (error) {
    console.error('Error reading or parsing CSV file:', error);
    throw new Error('Could not read user data.');
  }
}

// Helper function to save a new user to CSV
async function saveUser(newUser) {
  try {
    // Papaparse.unparse typically expects an array of objects for the whole dataset.
    // For appending a single line, direct fs.appendFileSync is simpler and more efficient.
    // Ensure the new user object matches the CSV header fields: username,password_hash
    const line = `${newUser.username},${newUser.password_hash}\n`; // Ensure newline character
    fs.appendFileSync(csvFilePath, line, 'utf8');
  } catch (error) {
    console.error('Error writing to CSV file:', error);
    throw new Error('Could not save user data.');
  }
}

export async function POST(request) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Name and password are required.' }, { status: 400 });
    }

    const lowercaseName = name.trim().toLowerCase();
    if (!lowercaseName) {
        return NextResponse.json({ error: 'Name cannot be empty.' }, { status: 400 });
    }

    const users = await getUsers();
    const nameExists = users.some(user => user.username === lowercaseName);

    if (nameExists) {
      return NextResponse.json({ error: 'This name is already taken. Please choose another.' }, { status: 409 }); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    await saveUser({ username: lowercaseName, password_hash: hashedPassword }); // Save hashed password

    return NextResponse.json({ message: 'Profile created successfully!' }, { status: 201 });
  } catch (error) {
    console.error('[API Register Error]:', error);
    // If the error is from getUsers or saveUser, it might already be a generic message.
    // Consider if more specific error messages are needed for the client.
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
