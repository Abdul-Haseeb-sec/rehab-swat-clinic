# Rehab Swat CMS — Deployment Guide

This guide details the steps required to deploy the Rehab Swat CMS in local development and live production environments.

---

## 1. Local Development Mode

To run the application locally on your workstation for development and testing:

```bash
# Backend (Terminal 1)
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Frontend (Terminal 2)
cd frontend
npm run dev
```

---

## 2. Production Go-Live Deployment

Follow these comprehensive steps to deploy the hardened, production-ready Rehab Swat CMS stack on a live virtual private server (VPS).

### Step 2.1 — Provision the VPS & Install Docker
1. Provision a VPS through a cloud provider (e.g., **Hetzner Cloud** or **DigitalOcean**) with at least 2GB RAM.
2. Choose **Ubuntu 22.04 LTS** (or newer) as the server OS.
3. SSH into the server:
   ```bash
   ssh root@your_server_ip
   ```
4. Update the package registry and install Docker + Docker Compose:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y docker.io docker-compose-plugin git curl
   sudo systemctl enable --now docker
   ```

### Step 2.2 — Clone & Configure Environment Variables
1. Clone the repository into `/var/www/rehabswat`:
   ```bash
   git clone <your-repository-url> /var/www/rehabswat
   cd /var/www/rehabswat
   ```
2. Copy the production environment example template to `.env`:
   ```bash
   cp backend/.env.production.example backend/.env
   ```
3. Generate a secure 256-bit JWT secret key using OpenSSL:
   ```bash
   openssl rand -hex 32
   ```
4. Open the `.env` file and populate it with real, secure production parameters:
   ```bash
   nano backend/.env
   ```
   Ensure the following values are filled:
   * `JWT_SECRET_KEY`: (Output from the openssl command above)
   * `DATABASE_URL`: PostgreSQL production connection string (e.g., `postgresql://db_user:db_pass@db_host/db_name`)
   * `REDIS_URL`: Redis connection string (e.g., `redis://redis:6379/0`)
   * `CORS_ALLOWED_ORIGINS`: Live application domain name (e.g., `https://rehabswat.pk,https://www.rehabswat.pk`)
   * `CLOUDINARY_URL`: Cloudinary API credential string
   * `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`: Twilio gateway integration credentials
   * `SENTRY_DSN`: Sentry production DSN (e.g., `https://...`)
   * `ENVIRONMENT`: Set to `production`

### Step 2.3 — Point Domain DNS
In your DNS registrar (e.g., GoDaddy, Cloudflare, Namecheap), add two records:
* **A Record** pointing `@` to `your_server_ip`
* **A Record** pointing `www` to `your_server_ip`

### Step 2.4 — Launch the Services
Start the Docker services in detached mode. This builds and launches PostgreSQL, Redis, FastAPI, and Nginx:
```bash
docker compose -f docker-compose.yml up -d --build
```
Verify all containers are up and running:
```bash
docker compose ps
```

### Step 2.5 — Enable Automated Backups
Run the automated crontab script to register the 2:00 AM daily database backup cron job:
```bash
chmod +x scripts/*.sh
sudo ./scripts/setup_cron.sh
```
This backup protocol:
1. Runs `pg_dump` securely against `DATABASE_URL`.
2. Compresses the SQL file using `gzip`.
3. Pushes the snapshot to Backblaze B2 using `rclone`.
4. Logs actions to `/var/log/rehabswat_backup.log`.

### Step 2.6 — SSL Encryption (Certbot)
To secure transit traffic with HTTPS:
1. Install Certbot on the host:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   ```
2. Obtain and install the SSL certificate:
   ```bash
   sudo certbot --nginx -d rehabswat.pk -d www.rehabswat.pk
   ```
3. Verify that the automatic renewal timer is active:
   ```bash
   sudo systemctl status certbot.timer
   ```

---

## 3. Initial Administrative Credentials

Upon first startup, log in using the following default super administrator credentials:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@rehabswat.pk | Admin@12345 |

> [!WARNING]
> **Change the administrator password immediately after your first successful login.**

---

## 4. Architecture & Topology Overview

```
┌─────────────────┐     HTTPS/443     ┌────────────────────┐
│   Browser/Client │ ─────────────── ▶ │  Nginx (Frontend)  │
└─────────────────┘                   │  React + Vite SPA  │
                                      └────────┬───────────┘
                                               │ /api/* proxy (rate limited)
                                      ┌────────▼───────────┐
                                      │  FastAPI Backend   │
                                      │  Port 8000          │
                                      └────────┬───────────┘
                                               │
                                      ┌────────▼───────────┐
                                      │ PostgreSQL & Redis │
                                      └────────────────────┘
```
