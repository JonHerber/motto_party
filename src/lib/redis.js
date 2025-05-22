import Redis from 'ioredis';

let redisURL = process.env.REDIS_URL;
let client;

if (redisURL) {
  console.log(`src/lib/redis.js: Attempting to connect to Redis using REDIS_URL environment variable.`);
  client = new Redis(redisURL, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000, // 10 seconds
    // TLS is typically handled by the URL itself if it's rediss://
    // For Upstash, if the URL is rediss://..., TLS is implicit.
    // If specific TLS options are needed beyond what the URL provides, they can be added here.
    // tls: { servername: new URL(redisURL).hostname } // Example if SNI is needed and not inferred
  });
} else {
  console.log(`src/lib/redis.js: REDIS_URL not found. Falling back to ENDPOINT, PASSWORD, PORT.`);
  const host = process.env.ENDPOINT;
  const password = process.env.PASSWORD;
  const portStr = process.env.PORT;
  const port = parseInt(portStr, 10);

  if (!host || !password || isNaN(port)) {
    console.error(`CRITICAL: Redis connection details (ENDPOINT, PASSWORD, PORT) are missing or invalid from environment variables for fallback. HOST: ${host}, PORT_STR: ${portStr}, PASSWORD: ${password ? 'SET' : 'NOT SET'}`);
    // Throw an error or create a dummy client that will always fail
    // For now, we'll let it try to connect with potentially undefined values, which ioredis will handle as an error.
    client = new Redis({ // This will likely fail if variables are missing, which is intended.
        host: host,
        port: port,
        password: password,
        tls: host ? { servername: host } : undefined, // Add TLS for direct Upstash connection
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
    });
    if (!host || !password || isNaN(port)) {
        console.error("src/lib/redis.js: One or more fallback Redis connection parameters (ENDPOINT, PORT, PASSWORD) are undefined.");
    }
  } else {
    redisURL = `rediss://default:${password}@${host}:${port}`;
    console.log(`src/lib/redis.js: Constructed fallback Redis URL: rediss://default:****@${host}:${port}`);
    client = new Redis(redisURL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      tls: {
        servername: host,
      },
    });
  }
}

client.on('connect', () => {
  console.log('src/lib/redis.js: Successfully connected to Redis');
});

client.on('error', (err) => {
  console.error('src/lib/redis.js: Redis connection error:', err);
  // Log additional details if available
  if (err.cause) {
    console.error('src/lib/redis.js: Underlying cause:', err.cause);
  }
});

export default client;
