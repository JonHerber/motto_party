import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt'; // Import bcrypt
import redis from '../../../../lib/redis'; // Import Redis client

// CSV_HEADER_EXPECTED and readUsers function are no longer needed and can be removed.

export async function POST(request) {
  try {
    const { name, password: inputPassword } = await request.json();

    if (!name || !inputPassword) {
      return NextResponse.json({ message: 'Name and password are required' }, { status: 400 });
    }

    const lowerCaseName = name.trim().toLowerCase();

    // Check if username exists in the 'usernames' set
    const userExists = await redis.sismember('usernames', lowerCaseName);
    if (!userExists) {
      console.log(`Login attempt: User '${lowerCaseName}' not found in Redis set.`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Retrieve user data (which includes the password hash) from Redis
    const userData = await redis.hgetall(`user:${lowerCaseName}`);

    if (!userData || !userData.password_hash) {
      // This case should ideally not be reached if sismember check passes and data is consistent
      console.log(`Login attempt: User '${lowerCaseName}' found in set but no hash found in Redis.`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // Compare the provided password with the stored hash
    const passwordMatches = await bcrypt.compare(inputPassword, userData.password_hash);

    if (passwordMatches) {
      return NextResponse.json({ message: 'Login successful', user: { name: lowerCaseName } }, { status: 200 });
    } else {
      console.log(`Login attempt: Password mismatch for user '${lowerCaseName}'.`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

  } catch (error) {
    console.error('Login API error:', error);
    // Check if the error is a Redis connection error
    if (error.message && error.message.includes('Redis connection')) {
        return NextResponse.json({ message: 'Could not connect to the database. Please try again later.' }, { status: 503 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}
