export default () => ({
  redis: {
    host: process.env.REDIS_HOST ?? 'redis',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB ?? 0),
    queuePrefix: process.env.QUEUE_PREFIX ?? 'kolekto',
    queueRemoveOnComplete: Number(process.env.QUEUE_REMOVE_ON_COMPLETE ?? 100),
    queueRemoveOnFail: Number(process.env.QUEUE_REMOVE_ON_FAIL ?? 500),
  },
});
