# @packages/db

## How to run

### Docker

```bash
docker compose up -d
```

```bash
docker compose down  # To stop
docker compose down -v # To stop and remove volumes
```
### Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```
