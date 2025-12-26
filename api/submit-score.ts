import { createClient } from 'redis';
import { NextResponse } from 'next/server';

const redis = createClient({ url: process.env.REDIS_URL });

export async function POST(request: Request) {
  try {
    await redis.connect();

    const { name, score, snapshot }: { name: string; score: number; snapshot?: string } = await request.json();

    if (!name || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Get current top 50
    const top50 = await redis.zrevrange('leaderboard', 0, 49);
    const lowestScore = top50.length === 50 ? await redis.zscore('leaderboard', top50[49]) : -Infinity;

    if (score <= lowestScore && top50.length >= 50) {
      return NextResponse.json({ message: 'Score not in top 50', success: false });
    }

    // Add to leaderboard
    await redis.zadd('leaderboard', score, name);
    const rank = await redis.zrevrank('leaderboard', name);
    const isTop3 = rank !== null && rank < 3;
    await redis.hset('leaderboard:data', name, JSON.stringify({ score, snapshot: isTop3 ? snapshot : undefined }));

    // Trim to top 50
    await redis.zremrangebyrank('leaderboard', 0, -51);
    const currentTop50 = await redis.zrevrange('leaderboard', 0, 49);
    const allData = await redis.hgetall('leaderboard:data');
    const toKeep = new Set(currentTop50);
    for (const key of Object.keys(allData)) {
      if (!toKeep.has(key)) {
        await redis.hdel('leaderboard:data', key);
      }
    }

    await redis.disconnect();
    return NextResponse.json({ message: 'Score submitted', success: true, rank: rank + 1 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}