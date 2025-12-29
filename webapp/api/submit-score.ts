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
    await redis.sendCommand(['ZADD', 'leaderboard', score.toString(), name]);
    
    // Trim to top 50
    await redis.sendCommand(['ZREMRANGEBYRANK', 'leaderboard', '0', '-51']);
    
    // Get current top 50 to sync data and enforce top-3 snapshot rule
    const currentTop50 = await redis.sendCommand(['ZREVRANGE', 'leaderboard', '0', '49']);
    
    if (Array.isArray(currentTop50)) {
      const toKeep = new Set(currentTop50);
      const allData = await redis.sendCommand(['HGETALL', 'leaderboard:data']);
      let nameHandled = false;
      
      if (Array.isArray(allData)) {
        for (let i = 0; i < allData.length; i += 2) {
          const key = allData[i];
          const val = allData[i+1];
          if (typeof key === 'string' && typeof val === 'string') {
            if (!toKeep.has(key)) {
              await redis.sendCommand(['HDEL', 'leaderboard:data', key]);
            } else {
              const rank = currentTop50.indexOf(key);
              const parsed = JSON.parse(val);
              let changed = false;

              if (key === name) {
                parsed.score = score;
                if (rank < 3 && snapshot) parsed.snapshot = snapshot;
                else if (rank >= 3) parsed.snapshot = undefined;
                changed = true;
                nameHandled = true;
              } else if (rank >= 3 && parsed.snapshot) {
                parsed.snapshot = undefined;
                changed = true;
              }

              if (changed) {
                await redis.sendCommand(['HSET', 'leaderboard:data', key, JSON.stringify(parsed)]);
              }
            }
          }
        }
      }
      
      if (!nameHandled && toKeep.has(name)) {
        const rank = currentTop50.indexOf(name);
        await redis.sendCommand(['HSET', 'leaderboard:data', name, JSON.stringify({ 
          score, 
          snapshot: (rank !== -1 && rank < 3) ? snapshot : undefined 
        })]);
      }
    }

    await redis.disconnect();
    res.status(200).json({ message: 'Score submitted', success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}