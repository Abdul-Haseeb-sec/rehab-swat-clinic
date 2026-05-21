#!/bin/bash
# deploy_remote.sh — Automated Remote VPS Deployment and Setup Script
# Run this from your local machine to automatically provision, transfer, and launch Rehab Swat CMS on a remote VPS.

set -e

# Configuration — update these or pass them as environment variables
VPS_HOST="${1:-}"
VPS_USER="${2:-root}"
TARGET_DIR="/var/www/rehabswat"

if [ -z "$VPS_HOST" ]; then
    echo "Usage: ./deploy_remote.sh <VPS_IP_OR_DOMAIN> [SSH_USER (default: root)]"
    exit 1
fi

echo "======================================================================"
echo " Preparing Remote Deployment to $VPS_USER@$VPS_HOST"
echo "======================================================================"

# 1. Verification of connection
echo "Checking remote SSH connection..."
if ! ssh -o ConnectTimeout=5 "$VPS_USER@$VPS_HOST" "echo Connection successful!"; then
    echo "Error: Cannot connect to $VPS_USER@$VPS_HOST via SSH."
    echo "Please verify that the IP is correct and your SSH key is authorized."
    exit 1
fi

# 2. Creating target directory on the VPS
echo "Creating deployment target directory at $TARGET_DIR on remote VPS..."
ssh "$VPS_USER@$VPS_HOST" "mkdir -p $TARGET_DIR"

# 3. Synchronizing code files to the remote VPS
echo "Transferring files to remote VPS..."
# Using rclone or scp to sync project files
# We exclude node_modules, pycache, .git, venv, and other temporary files
rsync -avz --exclude='node_modules' \
          --exclude='backend/venv' \
          --exclude='backend/__pycache__' \
          --exclude='.git' \
          --exclude='*.db' \
          --exclude='*.pyc' \
          ./ "$VPS_USER@$VPS_HOST:$TARGET_DIR/"

# 4. Executing remote setup commands via SSH
echo "Running remote server installation and configuration..."
ssh "$VPS_USER@$VPS_HOST" bash << EOF
    set -e
    cd "$TARGET_DIR"

    # Install Docker & Docker Compose if missing
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        apt-get update && apt-get install -y docker.io docker-compose-plugin git curl
        systemctl enable --now docker
    fi

    # Install Certbot if missing
    if ! command -v certbot &> /dev/null; then
        echo "Installing Certbot..."
        apt-get update && apt-get install -y certbot python3-certbot-nginx
    fi

    # Copy environment template if remote .env does not exist
    if [ ! -f "backend/.env" ]; then
        echo "Initializing backend/.env from template..."
        cp backend/.env.production.example backend/.env
        JWT_SECRET=\$(openssl rand -hex 32)
        sed -i "s/JWT_SECRET_KEY=.*/JWT_SECRET_KEY=\$JWT_SECRET/" backend/.env
        echo "Generated secure JWT_SECRET_KEY in remote backend/.env"
        echo "⚠️  Please open $TARGET_DIR/backend/.env and add Twilio/Cloudinary credentials."
    fi

    # Run Docker Compose build and start
    echo "Starting Docker services..."
    docker compose up -d --build

    # Setup database backup cron job
    echo "Setting up daily database backup cron job..."
    chmod +x scripts/*.sh
    ./scripts/setup_cron.sh

    echo "======================================================================"
    echo " Remote Services Launched successfully!"
    echo "======================================================================"
    echo "Next Steps:"
    echo "1. Run Certbot to acquire SSL Certificates:"
    echo "   ssh $VPS_USER@$VPS_HOST 'certbot --nginx'"
    echo "2. Edit the production environment configuration if needed:"
    echo "   ssh $VPS_USER@$VPS_HOST 'nano $TARGET_DIR/backend/.env'"
EOF
