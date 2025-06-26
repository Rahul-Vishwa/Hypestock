import Redis from 'ioredis';

let redis: Redis.Redis;

export function connect() {
    redis = new Redis();
}

export async function cache<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await redis.get(key);
    if (cached) {
        console.log(`Cache HIT ${key}`);
        return JSON.parse(cached);
    }

    const data = await fn();
    console.log(`Cache MISS ${key}`);
    if (ttl) {
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
    }
    else {
        await redis.set(key, JSON.stringify(data));
    }
    return data;
}

export async function addCacheGroup(key: string, keyValue: string) {
    await redis.sadd(key, keyValue);
}

export async function deleteCacheGroup(key: string) {
    const keys = await redis.smembers(key);
    if (keys.length) {
        await redis.del(...keys);
    }
    await redis.del(key);
}

export { redis };