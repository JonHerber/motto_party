import dotenv from 'dotenv';
dotenv.config({ path: './credentials.env' }); // Load credentials.env

import redis from './src/lib/redis.js';

async function testConnection() {
  console.log('Attempting to connect to Redis...');
  try {
    const reply = await redis.ping();
    if (reply === 'PONG') {
      console.log('Successfully connected to Redis and received PONG!');
    } else {
      console.log('Connected to Redis, but did not receive PONG. Reply:', reply);
    }
  } catch (error) {
    console.error('Failed to connect to Redis or PING failed:', error);
  } finally {
    // Close the Redis connection to allow the script to exit
    redis.quit(); 
  }
}

testConnection();
