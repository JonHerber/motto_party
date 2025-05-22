import { NextResponse } from 'next/server';
import redis from '../../../../lib/redis'; // Import Redis client

export async function GET(request) {
  try {
    // Get all submitter names from the 'motto_submitters' set
    const submitterNames = await redis.smembers('motto_submitters');

    if (!submitterNames || submitterNames.length === 0) {
      return NextResponse.json([], { status: 200 }); // No mottos submitted yet
    }

    const mottos = [];
    for (const name of submitterNames) {
      // For each submitter, get their motto from the hash motto:<username>
      const mottoData = await redis.hgetall(`motto:${name}`);
      if (mottoData && mottoData.text) {
        mottos.push({
          // id: name, // Using name as ID, assuming it's unique for mottos
          text: mottoData.text,
          name: name, // The submitter's name
        });
      }
    }

    return NextResponse.json(mottos, { status: 200 });

  } catch (error) {
    console.error('[API Get Mottos Error]:', error);
    if (error.message && error.message.includes('Redis connection')) {
        return NextResponse.json({ error: 'Could not connect to the database. Please try again later.' }, { status: 503 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred while fetching mottos.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
