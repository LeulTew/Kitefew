import { createClient } from 'redis';
import { NextResponse } from 'next/server';

const redis = createClient({ url: process.env.REDIS_URL });

export async function GET() {
  try {
    await redis.connect();

    const top50 = await redis.zrevrange('leaderboard', 0, 49);
    const leaderboard = [];
    for (let i = 0; i < top50.length; i++) {
      const name = top50[i];
      const data = await redis.hget('leaderboard:data', name);
      if (data) {
        const parsed = JSON.parse(data);
        leaderboard.push({
          rank: i + 1,
          name,
          score: parsed.score,
          snapshot: parsed.snapshot
        });
      }
    }

    await redis.disconnect();
    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}