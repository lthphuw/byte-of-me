# @byte-of-me/storage

Lightweight S3-compatible object storage client, built on AWS SDK v3. Used with
**Supabase Storage** via its S3 endpoint, but nothing here is Supabase-specific —
any S3-compatible provider works.

## API

```ts
import { Storage } from '@byte-of-me/storage';

const storage = new Storage({
  region: env.SUPABASE_S3_STORAGE_REGION,
  bucket: env.SUPABASE_S3_STORAGE_BUCKET,
  endpoint: env.SUPABASE_S3_STORAGE_ENDPOINT,              // S3 API endpoint (uploads)
  publicEndpoint: env.SUPABASE_S3_STORAGE_PUBLIC_ENDPOINT, // public read URL base
  credentials: {
    accessKeyId: env.SUPABASE_S3_STORAGE_ACCESS_KEY,
    secretAccessKey: env.SUPABASE_S3_STORAGE_SECRET_KEY,
  },
});
```

| Method | Description |
| --- | --- |
| `uploadFile({ fileKey, body, contentType })` | `PutObject`; returns `{ fileKey }` |
| `deleteFile(key)` | `DeleteObject` |
| `getPublicUrl(key)` | `{publicEndpoint}/{bucket}/{key}` — no network call |
| `getPresignedUploadUrl(key, expiresIn?)` | Presigned `PutObject` URL for direct browser uploads |

The client is created with `forcePathStyle: true`, which Supabase's S3 gateway
requires. An existing `S3Client` can be injected as the second constructor
argument (the tests do this).

## Conventions

- **Never hardcode storage URLs.** In `apps/web`, go through the helpers in
  `src/shared/api/s3-storage-api.ts` — they own the singleton and the key layout.
- Server-only: the credentials must never reach a client component.
- Internal imports are relative; the package is consumed as TypeScript source
  through Next.js `transpilePackages`.

## Scripts

```bash
pnpm --filter @byte-of-me/storage test    # jest
pnpm --filter @byte-of-me/storage build   # swc -> dist + .d.ts
```
