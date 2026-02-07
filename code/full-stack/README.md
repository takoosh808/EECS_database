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

6. Test the app in your browser:

- Through nginx reverse-proxy: `http://localhost:8080`
- Directly to the app: `http://localhost:3000`
- Health endpoint: `http://localhost:8080/health` or `http://localhost:3000/health`

7. Troubleshooting commands you may need:

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

ssh first.last@cpts-invtoolapp.eecs.wsu.edu
cd /opt/invapp