import { NextResponse } from 'next/server';
import redis from '../../../../lib/redis'; // Import Redis client

// CSV related imports and helper functions (ensureCsvFile, getAllMottos, saveAllMottos) are no longer needed.

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
    const cleanedSubmitterName = submitterName.trim().toLowerCase(); // Ensure consistent casing

    if (!cleanedMottoText || !cleanedSubmitterName) {
        return NextResponse.json({ error: 'Motto text and submitter name cannot be empty after trimming.' }, { status: 400 });
    }

    // Check if the raffle has already been completed
    const raffleStatus = await redis.get('raffle_status');
    if (raffleStatus === 'completed') {
      return NextResponse.json({ error: 'Motto submissions are closed as the raffle has already been conducted.' }, { status: 403 });
    }

    // Store the motto in a hash: motto:<username> -> { text: "The motto text" }
    // This will overwrite if the user submits again, effectively updating their motto.
    await redis.hmset(`motto:${cleanedSubmitterName}`, { text: cleanedMottoText });

    // Add the submitter's name to a set of all motto submitters
    await redis.sadd('motto_submitters', cleanedSubmitterName);

    // Determine if it was an update or new submission for the message (optional, Redis handles overwrite implicitly)
    // For simplicity, we can just send a generic success message.
    // Or, we could check if `sadd` returned 0 (member already existed) vs 1 (new member) if we need different messages.
    // However, hmset doesn't directly tell us if it was an insert or update without a prior check.

    const message = 'Motto submitted/updated successfully!'; // Simplified message

    return NextResponse.json({ message, motto: { text: cleanedMottoText, name: cleanedSubmitterName } }, { status: 200 });

  } catch (error) {
    console.error('[API Motto Submit Error]:', error);
    if (error.message && error.message.includes('Redis connection')) {
        return NextResponse.json({ error: 'Could not connect to the database. Please try again later.' }, { status: 503 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
