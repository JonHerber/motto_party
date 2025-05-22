// filepath: /home/yonie/Documents/mottoparty/src/app/api/raffle/results/route.js
import { NextResponse } from 'next/server';
import redis from '../../../../lib/redis'; // Import Redis client

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    const raffleCompleted = await redis.get('raffle_status');
    if (raffleCompleted !== 'completed') {
      // If a specific user is requested, and raffle not complete, they won't have a result.
      // If all results are requested, and raffle not complete, there are no results.
      const message = username ? 'No raffle result found for this user as raffle is not yet completed.' : 'Raffle has not been completed yet.';
      const status = username ? 404 : 200; // 404 if specific user, 200 with empty array if all results
      return NextResponse.json(username ? { message } : [], { status });
    }

    if (username) {
      const lowerCaseUsername = username.toLowerCase();
      // Fetch the specific user's raffle result from Redis hash
      const userResultData = await redis.hgetall(`raffle_result:${lowerCaseUsername}`);

      if (userResultData && userResultData.assigned_motto_text) {
        return NextResponse.json({
          username: lowerCaseUsername, // Return the username for clarity
          assigned_motto_text: userResultData.assigned_motto_text
        }, { status: 200 });
      } else {
        return NextResponse.json({ message: 'No raffle result found for this user.' }, { status: 404 });
      }
    } else {
      // No username provided, fetch all raffle results
      // This requires getting all users and then their results.
      const allUsernames = await redis.smembers('usernames');
      if (!allUsernames || allUsernames.length === 0) {
        return NextResponse.json([], { status: 200 }); // No users, so no results
      }

      const allResults = [];
      for (const uname of allUsernames) {
        const resultData = await redis.hgetall(`raffle_result:${uname}`);
        if (resultData && resultData.assigned_motto_text) {
          allResults.push({
            username: uname,
            assigned_motto_text: resultData.assigned_motto_text
          });
        }
        // Optionally, decide what to do if a user exists but has no raffle result (should not happen if raffle is 'completed')
      }
      return NextResponse.json(allResults, { status: 200 });
    }

  } catch (error) {
    console.error('[API Get Raffle Results Error]:', error);
    if (error.message && error.message.includes('Redis connection')) {
        return NextResponse.json({ error: 'Could not connect to the database. Please try again later.' }, { status: 503 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred while fetching raffle results.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
