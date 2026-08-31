# Docmost Deployment Guide (Linux Server)

## Prerequisites
- Linux server with Docker Engine + Docker Compose v2
- Min: 2 CPU, 4GB RAM, 20GB disk
- Docker installed on your Windows machine (to build the image)

## Step 1: Build the image on your Windows machine

From `docmost-otsuka` repo root:

```bash
# Windows PowerShell
docker build -t docmost-otsuka:0.95.0 .
```

> Note: The Dockerfile does `pnpm install --frozen-lockfile` then `pnpm build`.
> The EE submodule (`apps/server/src/ee`) is uninitialized but no source file
> imports `@docmost/ee`, so the build should succeed without it.

## Step 2: Save and transfer the image to the server

```bash
# Windows: save + compress
docker save docmost-otsuka:0.95.0 | gzip > docmost-otsuka.tar.gz

# Transfer to server (replace with your server IP/user)
scp docmost-otsuka.tar.gz deploy/docker-compose.yml deploy/.env.example user@SERVER_IP:/opt/docmost/
```

## Step 3: On the Linux server - load the image

```bash
ssh user@SERVER_IP
cd /opt/docmost

# Load the image
docker load < docmost-otsuka.tar.gz

# Verify
docker images | grep docmost-otsuka
```

## Step 4: Configure environment

```bash
cp .env.example .env
nano .env
```

Change at minimum:
- `APP_URL` = your URL or `http://SERVER_IP:3000`
- `APP_SECRET` = generate with `openssl rand -hex 32`
- `POSTGRES_PASSWORD` + `DATABASE_URL` = a strong password (must match)

## Step 5: Start the stack

```bash
docker compose up -d

# Check status
docker compose ps

# Follow logs
docker compose logs -f docmost
```

## Step 6: Verify

```bash
curl -I http://SERVER_IP:3000
```

Open `http://SERVER_IP:3000` in a browser, create the admin account on first visit.

## Step 7: Backups (recommended)

Add a daily cron job:

```bash
# DB backup
docker compose exec -T db pg_dump -U docmost docmost | gzip > /backups/docmost-$(date +%F).sql.gz

# Storage volume backup
docker run --rm -v docmost_docmost:/data -v /backups:/backup alpine tar czf /backup/storage-$(date +%F).tar.gz /data
```

## Step 8: HTTPS (when you have a domain)

Add a reverse proxy (Caddy is easiest):

```bash
# Caddyfile
docs.example.com {
    reverse_proxy localhost:3000
}
```

Then set `APP_URL=https://docs.example.com` in `.env` and restart.

## Useful commands

```bash
docker compose down          # stop
docker compose up -d         # start
docker compose logs -f db    # db logs
docker compose restart docmost
```