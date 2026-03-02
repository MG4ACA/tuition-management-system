# 🚀 Hostinger VPS Deployment Guide

## Tuition Management System (Vue 3 + Express.js + MySQL)

This guide walks you through deploying the Tuition Management System (Vue 3 frontend + Express.js backend) on a Hostinger VPS with Ubuntu 22.04.

---

## 📋 Prerequisites

- Hostinger VPS with Ubuntu 22.04 + MEVN Stack template installed
- SSH access to your VPS
- Your VPS IP address
- Domain name (optional, but recommended)
- Node.js 20 LTS on the server

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────┐
│         Hostinger VPS Server            │
│                                         │
│  ┌────────────────────────────────┐     │
│  │  Nginx (Reverse Proxy)         │     │
│  │  Port 80 / 443                 │     │
│  └──────────┬─────────────────────┘     │
│             │                            │
│  ┌──────────▼──────────┐  ┌───────────┐ │
│  │  Vue 3 Frontend     │  │  Express  │ │
│  │  (Static Files)     │  │  API      │ │
│  │  /var/www/tms/      │  │  Port     │ │
│  │  public/            │  │  3003     │ │
│  └─────────────────────┘  └─────┬─────┘ │
│                                  │       │
│                           ┌──────▼─────┐ │
│                           │   MySQL    │ │
│                           │ tuition_ms │ │
│                           └────────────┘ │
└─────────────────────────────────────────┘
```

**Nginx routing:**

- `/*` → Vue 3 static files (SPA with `try_files`)
- `/api/*` → proxy → Express on port 3003
- `/uploads/*` → proxy → Express on port 3003 (served as static by Express)

---

## 📦 Step 1: Connect to Your VPS

```bash
ssh root@your_vps_ip
```

---

## 🔧 Step 2: Initial Server Setup

### 2.1 Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2.2 Install Required Tools

```bash
# Git
sudo apt install git -y

# Node.js 20 LTS (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt install nginx -y

# MySQL
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
sudo systemctl status mysql
```

### 2.3 Configure Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
sudo ufw status
```

---

## 🗄️ Step 3: Set Up MySQL Database

### 3.1 Secure MySQL Installation

```bash
sudo mysql_secure_installation
```

Follow the prompts to:

- Set root password
- Remove anonymous users
- Disallow root login remotely
- Remove test database

### 3.2 Create Database and User

```bash
sudo mysql -u root -p
```

```sql
-- Create database
CREATE DATABASE tuition_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user (replace 'StrongPassword123!' with your own)
CREATE USER 'tms_user'@'localhost' IDENTIFIED BY 'Velou@123';

-- Grant privileges
GRANT ALL PRIVILEGES ON tuition_ms.* TO 'tms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 📥 Step 4: Deploy the Application

### 4.1 Create Application Directory

```bash
sudo mkdir -p /var/www/tms
cd /var/www/tms
```

### 4.2 Clone the Repository

```bash
# Clone the monorepo (frontend + backend in one repo)
sudo git clone https://github.com/MG4ACA/tuition-management-system.git .

# Set correct ownership
sudo chown -R $USER:$USER /var/www/tms
sudo chmod -R 755 /var/www/tms
```

### 4.3 Pull Latest Changes (for updates)

```bash
cd /var/www/tms
git fetch --all
git pull origin development

# If merge conflicts occur:
git reset --hard origin/main
```

---

## 🗃️ Step 5: Import Database Schema

```bash
cd /var/www/tms

# Import schema (creates all tables + seeds default teacher account)
mysql -u tms_user -p tuition_ms < database/schema.sql
```

This creates all 10 tables and seeds the default teacher account:

- **Email:** `teacher@tuition.local`
- **Password:** `Admin@1234`

> ⚠️ Change this password immediately after first login.

---

## 🔨 Step 6: Set Up Backend

### 6.1 Install Dependencies

```bash
cd /var/www/tms/backend
npm install --production
```

### 6.2 Create Environment File

```bash
nano /var/www/tms/backend/.env
```

```env
# ── Server ────────────────────────────────────────────────────
PORT=3003
NODE_ENV=production

# ── Database ─────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=tms_user
DB_PASSWORD=Velou@123
DB_NAME=tuition_ms

# ── JWT ──────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=replace_with_64_char_random_hex_for_access
JWT_REFRESH_SECRET=replace_with_different_64_char_random_hex_for_refresh
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

# ── CORS ─────────────────────────────────────────────────────
# Set to your domain (no trailing slash)
CLIENT_ORIGIN=https://tms.lumicore-labs.com

# ── File Uploads ─────────────────────────────────────────────
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=10
```

**Generate secure JWT secrets:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Run twice — use first output for JWT_ACCESS_SECRET, second for JWT_REFRESH_SECRET
```

### 6.3 Create Uploads Directory

```bash
mkdir -p /var/www/tms/backend/uploads
chmod 755 /var/www/tms/backend/uploads
```

### 6.4 Test Backend

```bash
cd /var/www/tms/backend
node src/app.js
```

Expected output:

```
🚀 API running on http://localhost:3003
✅ MySQL connected
```

Test the API in another terminal:

```bash
curl http://localhost:3003/health
```

Press `Ctrl+C` to stop.

### 6.5 Set Up PM2

```bash
# Start backend with PM2
pm2 start /var/www/tms/backend/src/app.js --name tms-api

# Save configuration
pm2 save

# Enable PM2 on boot
pm2 startup
# Run the command it outputs (starts with: sudo env PATH=...)

# Verify
pm2 status
```

**Useful PM2 Commands:**

```bash
pm2 logs tms-api           # View live logs
pm2 restart tms-api        # Restart after code changes
pm2 stop tms-api           # Stop
pm2 monit                  # Resource monitor
```

---

## 🎨 Step 7: Build and Deploy Frontend

### 7.1 Configure Production API URL

```bash
nano /var/www/tms/frontend/.env.production
```

```env
VITE_API_BASE_URL=https://tms.lumicore-labs.com/api
```

> If you don't have a domain yet, use your VPS IP:
> `VITE_API_BASE_URL=http://your_vps_ip/api`

### 7.2 Install Dependencies and Build

```bash
cd /var/www/tms/frontend
npm install
npm run build
```

This creates `frontend/dist/` with optimized static files.

### 7.3 Deploy Built Files to Nginx Directory

```bash
# Create nginx serving directory
sudo mkdir -p /var/www/tms/public

# Copy built files
sudo cp -r /var/www/tms/frontend/dist/* /var/www/tms/public/

# Set correct ownership for nginx
sudo chown -R www-data:www-data /var/www/tms/public
sudo chmod -R 755 /var/www/tms/public
```

---

## 🌐 Step 8: Configure Nginx

### 8.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/tms
```

```nginx
upstream tms_backend {
    server localhost:3003;
    keepalive 64;
}

server {
    listen 80;
    server_name https://tms.lumicore-labs.com www.https://tms.lumicore-labs.com;
    # For IP-only (no domain): server_name your_vps_ip;

    # Security headers
    add_header X-Frame-Options     "SAMEORIGIN"   always;
    add_header X-Content-Type-Options "nosniff"   always;
    add_header X-XSS-Protection   "1; mode=block" always;

    # ── Frontend (Vue 3 SPA) ─────────────────────────────────
    location / {
        root  /var/www/tms/public;
        index index.html;
        try_files $uri $uri/ /index.html;

        # Cache static assets aggressively
        location ~* \.(js|css|woff2?|ttf|eot|svg|png|jpg|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # ── Backend API ──────────────────────────────────────────
    location /api/ {
        proxy_pass         http://tms_backend/api/;
        proxy_http_version 1.1;

        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        'upgrade';
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
        proxy_cache_bypass    $http_upgrade;

        # Upload size limit (match MAX_FILE_SIZE_MB)
        client_max_body_size 10M;
    }

    # ── Uploaded files (resources/attachments) ───────────────
    location /uploads/ {
        proxy_pass       http://tms_backend/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        add_header Cache-Control "public, max-age=2592000";
    }

    # ── Health check ─────────────────────────────────────────
    location /health {
        proxy_pass http://tms_backend/health;
        access_log off;
    }

    # ── Logs ─────────────────────────────────────────────────
    access_log /var/log/nginx/tms-access.log;
    error_log  /var/log/nginx/tms-error.log;
}
```

### 8.2 Enable Site

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/tms /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

---

## 🔒 Step 9: Set Up SSL (Recommended)

### 9.1 Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 9.2 Obtain SSL Certificate

```bash
# Replace with your actual domain
sudo certbot --nginx -d https://tms.lumicore-labs.com -d www.https://tms.lumicore-labs.com
```

Certbot automatically configures Nginx for HTTPS and sets up auto-renewal.

### 9.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

### 9.4 Update CORS After SSL

After SSL is active, update `CLIENT_ORIGIN` in `.env` to use `https://`:

```bash
nano /var/www/tms/backend/.env
# Change: CLIENT_ORIGIN=https://tms.lumicore-labs.com

pm2 restart tms-api
```

---

## ✅ Step 10: Verify Deployment

### 10.1 Check All Services

```bash
pm2 status                         # Should show tms-api as 'online'
sudo systemctl status nginx        # Should be 'active (running)'
sudo systemctl status mysql        # Should be 'active (running)'
```

### 10.2 Test API

```bash
curl http://localhost:3003/health
# Expected: {"status":"ok","ts":"..."}

curl http://localhost:3003/api/auth/me
# Expected: 401 (correct — route requires auth)
```

### 10.3 Test Application

Open your browser:

- `http://your_vps_ip` (or `https://tms.lumicore-labs.com`)
- Login with `teacher@tuition.local` / `Admin@1234`

---

## 🔄 Step 11: Update/Redeploy Script

```bash
nano /var/www/tms/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "🚀 Starting TMS deployment..."
cd /var/www/tms

# Pull latest code
echo "📥 Pulling latest changes..."
git fetch --all
git pull origin main

# Backend
echo "🔨 Updating backend..."
cd /var/www/tms/backend
npm install --production
pm2 restart tms-api

# Frontend
echo "🎨 Building frontend..."
cd /var/www/tms/frontend
npm install
npm run build
sudo cp -r dist/* /var/www/tms/public/
sudo chown -R www-data:www-data /var/www/tms/public

# Reload Nginx
echo "🌐 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
pm2 status
```

```bash
chmod +x /var/www/tms/deploy.sh
```

Run future updates with:

```bash
cd /var/www/tms && ./deploy.sh
```

---

## 🛠️ Maintenance Commands

### Check Status

```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status mysql
df -h          # Disk space
free -m        # Memory usage
```

### View Logs

```bash
pm2 logs tms-api                             # Backend live logs
sudo tail -f /var/log/nginx/tms-access.log   # Nginx access
sudo tail -f /var/log/nginx/tms-error.log    # Nginx errors
sudo tail -f /var/log/mysql/error.log        # MySQL errors
```

## 💾 Backup Database

### Manual Backup

```bash
mkdir -p ~/backups
mysqldump -u tms_user -p tuition_ms > ~/backups/tuition_ms_$(date +%Y%m%d_%H%M%S).sql
```

### Automated Daily Backup

```bash
nano ~/backup-tms-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR

mysqldump -u tms_user -p'StrongPassword123!' tuition_ms \
  > $BACKUP_DIR/tuition_ms_$(date +%Y%m%d_%H%M%S).sql

# Keep only the last 7 days
find $BACKUP_DIR -name "tuition_ms_*.sql" -mtime +7 -delete
```

```bash
chmod +x ~/backup-tms-db.sh

# Schedule daily at 2 AM
crontab -e
# Add: 0 2 * * * /home/YOUR_USERNAME/backup-tms-db.sh
```

---

## 🐛 Troubleshooting

### Backend Not Starting

```bash
pm2 logs tms-api

# Port 3003 already in use?
sudo lsof -i :3003
sudo kill -9 <PID>

# Database connection failed?
mysql -u tms_user -p tuition_ms
# Also verify backend/.env credentials
```

### Frontend Not Loading / 404 on Refresh

```bash
# Verify try_files is in nginx config
sudo nginx -t
sudo systemctl reload nginx

# Verify files exist
ls -la /var/www/tms/public/
# Should contain: index.html, assets/
```

### 502 Bad Gateway

```bash
# Backend is not running
pm2 status
pm2 restart tms-api

# Verify backend is listening
sudo ss -tlnp | grep 3003
```

### CORS Errors in Browser

```bash
# .env CLIENT_ORIGIN must exactly match the browser's origin (no trailing slash)
cat /var/www/tms/backend/.env | grep CLIENT_ORIGIN

# Restart after any .env change
pm2 restart tms-api
```

### Database Connection Issues

```bash
mysql -u tms_user -p tuition_ms      # Test credentials
sudo systemctl status mysql           # Check MySQL is running
sudo systemctl restart mysql          # Restart if needed
cat /var/www/tms/backend/.env         # Verify .env values
```

### Uploads Not Accessible

```bash
# Check uploads directory permissions
ls -la /var/www/tms/backend/uploads/

# Fix permissions if needed
sudo chmod -R 755 /var/www/tms/backend/uploads/
```

---

## 📊 Monitoring Setup (Optional)

### Install Monitoring Tools

```bash
# Install htop for resource monitoring
sudo apt install htop -y

# Use PM2 monitoring
pm2 install pm2-server-monit
```

```bash
pm2 install pm2-server-monit
```

---

## 🎯 Performance Optimization

### Enable Gzip Compression in Nginx

Edit `/etc/nginx/nginx.conf`:

```bash
sudo nano /etc/nginx/nginx.conf
```

Add inside `http` block:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### Run Backend in Cluster Mode

```bash
# Use all CPU cores
pm2 delete tms-api
pm2 start /var/www/tms/backend/src/app.js \
  --name tms-api \
  -i max \
  --node-args="--max-old-space-size=1024"
pm2 save
```

---

## 📚 Additional Resources

- [Hostinger VPS Documentation](https://www.hostinger.com/tutorials/vps)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)

---

## 📞 Support

If you encounter issues:

1. Check logs first (`pm2 logs`, nginx logs)
2. Verify all services are running
3. Check firewall settings
4. Review configuration files
5. Restart services in order: MySQL → Backend → Nginx

---

## 📝 Post-Deployment Checklist

- [ ] MySQL `tuition_ms` database created with `tms_user`
- [ ] `database/schema.sql` imported (tables + seed teacher account)
- [ ] `backend/.env` configured (DB credentials, JWT secrets, `CLIENT_ORIGIN`)
- [ ] Backend running via PM2 (`pm2 status` shows `tms-api` online)
- [ ] Frontend built (`npm run build` in `frontend/`)
- [ ] Built files copied to `/var/www/tms/public/`
- [ ] Nginx configured and `sudo nginx -t` passes
- [ ] `/health` endpoint responds correctly
- [ ] Application login works (`teacher@tuition.local` / `Admin@1234`)
- [ ] Default teacher password changed
- [ ] SSL certificate installed (if using domain)
- [ ] `CLIENT_ORIGIN` updated to `https://` after SSL
- [ ] Firewall configured (`ufw status`)
- [ ] PM2 auto-start on boot configured (`pm2 startup`)
- [ ] Database backup script scheduled in cron
- [ ] `deploy.sh` script tested

---

**Project:** Tuition Management System  
**Stack:** Vue 3 + PrimeVue 4 · Express.js · MySQL  
**Backend port:** 3003  
**Default login:** `teacher@tuition.local` / `Admin@1234`  
**Last Updated:** March 2026
