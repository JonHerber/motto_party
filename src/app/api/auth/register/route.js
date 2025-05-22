import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import redis from '../../../../lib/redis'; // Import the Redis client

const SALT_ROUNDS = 10; // Cost factor for bcrypt hashing

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

    // Check if username already exists in Redis
    const nameExists = await redis.sismember('usernames', lowercaseName);

    if (nameExists) {
      return NextResponse.json({ error: 'This name is already taken. Please choose another.' }, { status: 409 }); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Save user to Redis
    // Use a pipeline to ensure atomicity for these two operations if possible, or handle potential partial failures.
    // For simplicity here, we'll do them sequentially.
    await redis.hmset(`user:${lowercaseName}`, { 'password_hash': hashedPassword });
    await redis.sadd('usernames', lowercaseName);

    return NextResponse.json({ message: 'Profile created successfully!' }, { status: 201 });
  } catch (error) {
    console.error('[API Register Error]:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    // Check if the error is a Redis connection error
    if (error.message && error.message.includes('Redis connection')) {
        return NextResponse.json({ error: 'Database connection error. Please try again later.' }, { status: 503 }); // Service Unavailable
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
