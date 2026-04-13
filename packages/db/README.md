# @packages/db

## Reset db

Docs: https://www.prisma.io/docs/cli/migrate

```bash
# Create a migration from schema changes, apply it, and trigger generators
npx prisma migrate dev --name init

# Reset your database and apply all migrations (all data will be lost)
npx prisma migrate reset --force

# Generate
npx prisma generate

# Seed db
npx prisma db seed
```

# Enable prisma studio

```bash
npx prisma studio --port 7777
```

## Deploy

```
npx prisma migrate deploy
npx prisma db seed
```
