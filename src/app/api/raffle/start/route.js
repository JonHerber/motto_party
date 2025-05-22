import { NextResponse } from 'next/server';
import redis from '../../../../lib/redis'; // Import Redis client

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

    // Check if raffle has already been conducted
    const raffleStatus = await redis.get('raffle_status');
    if (raffleStatus === 'completed') {
      return NextResponse.json({ error: 'Raffle has already been conducted and results are saved.' }, { status: 409 }); // 409 Conflict
    }

    // Get all registered user names from the 'usernames' set
    const users = await redis.smembers('usernames');
    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No registered users to conduct a raffle for.' }, { status: 400 });
    }

    // Get all submitted mottos
    const mottoSubmitters = await redis.smembers('motto_submitters');
    if (!mottoSubmitters || mottoSubmitters.length === 0) {
      return NextResponse.json({ error: 'No mottos submitted to be raffled.' }, { status: 400 });
    }

    const allMottos = [];
    for (const submitter of mottoSubmitters) {
      const mottoData = await redis.hgetall(`motto:${submitter}`);
      if (mottoData && mottoData.text) {
        allMottos.push({ text: mottoData.text, submitter: submitter.toLowerCase() });
      }
    }

    if (allMottos.length === 0) {
      // This case should ideally be covered by the mottoSubmitters check, but as a safeguard:
      return NextResponse.json({ error: 'No valid mottos found to be raffled, despite having submitters.' }, { status: 400 });
    }

    const raffleAssignments = [];
    const usedMottoTexts = new Set(); // To track mottos already assigned to ensure variety if possible

    // Create a mutable copy of all mottos to pick from
    let availableMottos = shuffleArray([...allMottos]);

    for (const username of users) {
      const lowerCaseUsername = username.toLowerCase();
      let assignedMotto = null;

      // Try to find a motto not submitted by the current user and not already assigned
      let candidateMottos = availableMottos.filter(
        m => m.submitter !== lowerCaseUsername && !usedMottoTexts.has(m.text)
      );

      if (candidateMottos.length > 0) {
        assignedMotto = candidateMottos[0]; // Pick the first from the shuffled candidates
      } else {
        // Fallback 1: Try any motto not submitted by the user, even if used
        candidateMottos = availableMottos.filter(m => m.submitter !== lowerCaseUsername);
        if (candidateMottos.length > 0) {
          assignedMotto = candidateMottos[0];
        } else {
          // Fallback 2: If all remaining mottos are by this user, or no mottos left,
          // pick any available motto (could be their own).
          // If availableMottos is empty, this will be an issue, so we ensure it's not.
          if (availableMottos.length > 0) {
             assignedMotto = availableMottos[0];
          } else {
            // Fallback 3: All mottos have been assigned, and we still have users.
            // This means fewer mottos than users. Re-use from the original pool.
            // This logic can be complex; for now, we'll ensure enough mottos or accept duplicates.
            // A simpler approach for now: if availableMottos is exhausted, re-populate and shuffle.
            // This might lead to more duplicates than ideal.
            // A better strategy might be to ensure enough unique mottos for users or handle this edge case explicitly.
            // For this version, let's assume we might run out and pick from the general pool again.
            // This means a user might get a motto already assigned to someone else if mottos < users.
            let fullMottoPool = shuffleArray([...allMottos]);
            assignedMotto = fullMottoPool[Math.floor(Math.random() * fullMottoPool.length)];
          }
        }
      }
      
      if (assignedMotto) {
        raffleAssignments.push({ username: lowerCaseUsername, assigned_motto_text: assignedMotto.text });
        usedMottoTexts.add(assignedMotto.text); // Mark this motto text as used for this round of selection
        // Remove the assigned motto from availableMottos to reduce immediate re-assignment
        availableMottos = availableMottos.filter(m => m.text !== assignedMotto.text); 
        if(availableMottos.length === 0 && users.indexOf(username) < users.length -1){ // if list exhausted and still users left
            availableMottos = shuffleArray([...allMottos]); // repopulate and shuffle
        }
      } else {
        // Should not happen if allMottos is not empty, but as a failsafe:
        raffleAssignments.push({ username: lowerCaseUsername, assigned_motto_text: "No motto available" });
      }
    }

    // Save raffle results to Redis
    // Using a pipeline for atomicity and performance
    const pipeline = redis.pipeline();
    for (const assignment of raffleAssignments) {
      pipeline.hmset(`raffle_result:${assignment.username}`, { assigned_motto_text: assignment.assigned_motto_text });
    }
    // Set a flag indicating the raffle is complete
    pipeline.set('raffle_status', 'completed');
    await pipeline.exec();

    return NextResponse.json({ message: 'Raffle conducted successfully! Results saved to Redis.', assignments: raffleAssignments }, { status: 200 });

  } catch (error) {
    console.error('[API Raffle Start Error]:', error);
    if (error.message && error.message.includes('Redis connection')) {
        return NextResponse.json({ error: 'Could not connect to the database. Please try again later.' }, { status: 503 });
    }
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred during the raffle.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
