This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
 
**Containerization (Docker) — Step-by-step**

1. Prerequisites: install Docker Desktop and make sure `docker`/`docker compose` are available.

2. Ensure your environment file exists and points the app to the compose Postgres service. Edit [.env](.env) and set:

```powershell
POSTGRES_DB=eecsdb
POSTGRES_USER=eecsuser
POSTGRES_PASSWORD=eecs123
DATABASE_URL="postgresql://eecsuser:eecs123@db:5432/eecsdb?schema=public"
```

3. (If you have an older standalone Postgres container) stop and remove it to avoid confusion:

```powershell
docker stop eecs-db
docker rm eecs-db
```

4. Build and run the compose stack (rebuild images):

```powershell
cd code/full-stack
docker compose down
docker compose up -d --build
```

5. Watch service status and logs:

```powershell
docker compose ps
docker compose logs web --tail=200
docker compose logs db --tail=200
```

6. Prisma-specific steps done during image build and container startup:
- We pass `DATABASE_URL` as a build arg so `npx prisma generate` succeeds during the `docker build` step.
- The runtime image includes `prisma.config.ts` so `npx prisma migrate deploy` can read the datasource URL at startup.

7. If you need to run migrations manually inside the running `web` container:

```powershell
docker compose exec web npx prisma migrate deploy
```

8. To generate the Prisma client locally (outside Docker):

```powershell
cd code/full-stack
npx prisma generate --schema=prisma/schema.prisma
```

9. Test the app in your browser:

- Through nginx reverse-proxy: `http://localhost:8080`
- Directly to the app: `http://localhost:3000`
- Health endpoint: `http://localhost:8080/health` or `http://localhost:3000/health`

10. Troubleshooting commands you may need:

```powershell
docker compose logs --follow
docker compose restart web
docker compose exec web sh   # open a shell in the container
docker exec -it full-stack-db-1 psql -U eecsuser -d eecsdb -c "SELECT 1"
```

Files touched during containerization:
- [dockerfile](dockerfile)
- [docker/entrypoint.sh](docker/entrypoint.sh)
- [docker-compose.yml](docker-compose.yml)
- [prisma.config.ts](prisma.config.ts)
- [prisma/schema.prisma](prisma/schema.prisma)

If you want, I can also add a short section with the exact diffs we applied to these files.
