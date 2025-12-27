import { createClient } from 'redis';

interface ScoreSubmission {
  name: string;
  score: number;
  snapshot?: string;
}

interface VercelRequest {
  method: string;
  body?: ScoreSubmission;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

const redis = createClient({ url: process.env.REDIS_URL });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await redis.connect();

    if (!req.body) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    const { name, score, snapshot } = req.body;

    if (!name || typeof name !== 'string' || typeof score !== 'number') {
      return res.status(400).json({ error: 'Invalid data' });
    }

    // Get current top 50
    const top50 = await redis.sendCommand(['ZREVRANGE', 'leaderboard', '0', '49']);
    let lowestScore = -Infinity;
    if (Array.isArray(top50) && top50.length === 50) {
      const lowestScoreStr = await redis.sendCommand(['ZSCORE', 'leaderboard', top50[49]]);
      if (typeof lowestScoreStr === 'string') {
        lowestScore = parseFloat(lowestScoreStr);
      }
    }

    if (score <= lowestScore && Array.isArray(top50) && top50.length >= 50) {
      await redis.disconnect();
      return res.status(200).json({ message: 'Score not in top 50', success: false });
    }

    // Add to leaderboard
    await redis.ZADD('leaderboard', { score, value: name });
    const rank = await redis.sendCommand(['ZREVRANK', 'leaderboard', name]);
    const isTop3 = rank !== null && typeof rank === 'number' && rank < 3;
    await redis.HSET('leaderboard:data', name, JSON.stringify({ score, snapshot: isTop3 ? snapshot : undefined }));

    // Trim to top 50
    await redis.sendCommand(['ZREMRANGEBYRANK', 'leaderboard', '0', '-51']);
    const currentTop50 = await redis.sendCommand(['ZREVRANGE', 'leaderboard', '0', '49']);
    if (Array.isArray(currentTop50)) {
      const allData = await redis.sendCommand(['HGETALL', 'leaderboard:data']);
      const toKeep = new Set(currentTop50);
      if (Array.isArray(allData)) {
        // HGETALL returns [key1, value1, key2, value2, ...]
        for (let i = 0; i < allData.length; i += 2) {
          const key = allData[i];
          if (typeof key === 'string' && !toKeep.has(key)) {
            await redis.sendCommand(['HDEL', 'leaderboard:data', key]);
          }
        }
      }
    }

    await redis.disconnect();
    const rankNumber = typeof rank === 'number' ? rank + 1 : null;
    res.status(200).json({ message: 'Score submitted', success: true, rank: rankNumber });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}