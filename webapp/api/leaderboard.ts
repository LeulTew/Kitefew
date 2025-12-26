import { createClient } from 'redis';

interface VercelRequest {
  method: string;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

const redis = createClient({ url: process.env.REDIS_URL });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await redis.connect();

    // Check if leaderboard is empty and add default user if needed
    const leaderboardSize = await redis.zcard('leaderboard');
    if (leaderboardSize === 0) {
      await redis.zadd('leaderboard', 5, 'Torpi');
      await redis.hset('leaderboard:data', 'Torpi', JSON.stringify({ score: 5, snapshot: undefined }));
    }

    const top50 = await redis.zrevrange('leaderboard', 0, 49);
    const leaderboard = [];
    if (Array.isArray(top50)) {
      for (let i = 0; i < top50.length; i++) {
        const name = top50[i];
        if (typeof name === 'string') {
          const data = await redis.hget('leaderboard:data', name);
          if (data && typeof data === 'string') {
            try {
              const parsed = JSON.parse(data);
              leaderboard.push({
                rank: i + 1,
                name,
                score: parsed.score,
                snapshot: parsed.snapshot
              });
            } catch {
              // Skip invalid data
            }
          }
        }
      }
    }

    await redis.disconnect();
    res.status(200).json({ leaderboard });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}