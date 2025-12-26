import { createClient } from 'redis';

async function testRedis() {
  const redis = createClient({ url: process.env.REDIS_URL });
  try {
    await redis.connect();
    console.log('Connected to Redis');
    await redis.set('test', 'hello');
    const value = await redis.get('test');
    console.log('Test value:', value);
    await redis.disconnect();
  } catch (error) {
    console.error('Redis error:', error);
  }
}

testRedis();