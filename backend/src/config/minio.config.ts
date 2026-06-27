export default () => ({
  minio: {
    endPoint: process.env.MINIO_ENDPOINT,
    port: Number(process.env.MINIO_PORT ?? 9000),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    region: process.env.MINIO_REGION ?? 'us-east-1',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY,
    bucket: process.env.MINIO_BUCKET,
    publicUrl: process.env.MINIO_PUBLIC_URL,
  },
});
