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

## Database schema bootstrap

- Base schema is in [db/init/001_base_schema.sql](db/init/001_base_schema.sql).
- Compose mounts `./db/init` to Postgres `docker-entrypoint-initdb.d`, so tables are created automatically on first startup of a new database volume.
- Implemented base tables only: `labs`, `categories`, `assets` (no admin approval/disapproval table yet).

If Postgres was already initialized before this file was added, reset the DB volume once:

```powershell
docker compose down -v
docker compose up -d --build
```

## CSV ingestion (assets only)

- Endpoint: `POST /api/ingest`
- Content type: `multipart/form-data`
- File field name: `file`

### Required CSV headers

- `name`
- `serial_number`

And one of each reference pair:

- `category_name` or `category_id`
- `lab_name` or `lab_id`

### Optional CSV headers

- `checked_out` (defaults to `false`)
- `checked_out_to` (defaults to empty / `null`)

### Validation rules

- Missing `labs` / `categories` references are treated as errors.
- Ingestion accepts names, IDs, or mixed references and resolves to IDs internally.
- Duplicate `serial_number` values within the CSV reject the whole file.
- If any row fails validation, the entire import is rejected (no partial writes).
- `checked_out=false` requires `checked_out_to` to be empty.
- `checked_out=true` requires `checked_out_to` to be present.

### Example CSV

```csv
name,category_name,lab_name,serial_number,checked_out,checked_out_to
Oscilloscope,EECS Equipment,VLSI Lab,SER-1001,false,
Signal Generator,EECS Equipment,VLSI Lab,SER-1002,true,student@wsu.edu
```

### Example CSV (ID references)

```csv
name,category_id,lab_id,serial_number,checked_out,checked_out_to
Oscilloscope,11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222,SER-1001,false,
Signal Generator,11111111-1111-1111-1111-111111111111,22222222-2222-2222-2222-222222222222,SER-1002,true,student@wsu.edu
```

### Quick ingestion test (copy/paste)

1. Create one lab and one category with names used by your CSV:

```powershell
docker compose exec db psql -U eecsuser -d eecsdb -c "INSERT INTO labs (name) VALUES ('CSV Lab') RETURNING id, name;"
docker compose exec db psql -U eecsuser -d eecsdb -c "INSERT INTO categories (name) VALUES ('CSV Category') RETURNING id, name;"
```

2. Create a test CSV file (replace IDs):

```csv
name,category_name,lab_name,serial_number,checked_out,checked_out_to
Meter,CSV Category,CSV Lab,CSV-0001,false,
Analyzer,CSV Category,CSV Lab,CSV-0002,true,test.user@wsu.edu
```

3. Send ingestion request (curl):

```bash
curl -X POST http://localhost:3000/api/ingest \
	-F "file=@assets.csv"
```

4. Send ingestion request (PowerShell):

```powershell
curl.exe -X POST "http://localhost:3000/api/ingest" -F "file=@assets.csv"
```

5. Verify imported rows:

```powershell
docker compose exec db psql -U eecsuser -d eecsdb -c "SELECT name, serial_number, checked_out, checked_out_to FROM assets ORDER BY created_at DESC LIMIT 10;"
```

ssh first.last@cpts-invtoolapp.eecs.wsu.edu
cd /opt/invapp