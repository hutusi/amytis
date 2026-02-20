# Deployment Guide

This guide covers how to build Amytis as a static website and deploy it to GitHub Pages or a Linux server.

## Build

Amytis uses Next.js static export (`output: "export"`). The build process generates a fully static site in the `out/` directory.

```bash
# Full production build (with image optimization)
bun run build

# Development build (faster, no image optimization)
bun run build:dev

# Clean build artifacts before rebuilding
bun run clean && bun run build
```

The `out/` directory contains plain HTML, CSS, JS, images, and the Pagefind search index (`out/pagefind/`) — ready to be served by any static file server.

### Preview Locally

```bash
# Using serve
bunx serve out

# Or using Python
python3 -m http.server 8000 -d out
```

---

## Deploy to GitHub Pages

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        run: bun run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Then enable GitHub Pages in your repository:

1. Go to **Settings > Pages**
2. Set **Source** to **GitHub Actions**
3. Push to `main` — the site will build and deploy automatically

### Option 2: Manual Deploy via `gh-pages` Branch

```bash
# Build the site
bun run build

# Deploy using gh-pages
bunx gh-pages -d out
```

Then in your repository settings, set GitHub Pages source to the `gh-pages` branch.

### Custom Domain (Optional)

1. Add a `CNAME` file in `public/` with your domain:

```bash
echo "yourdomain.com" > public/CNAME
```

2. Configure DNS: add a CNAME record pointing to `<username>.github.io`
3. In **Settings > Pages**, enter your custom domain and enable HTTPS

### Base Path (Optional)

If deploying to `https://<user>.github.io/<repo>/` (not a custom domain), set `basePath` in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  output: "export",
  basePath: "/<repo-name>",
  // ... other config
};
```

---

## Deploy to a Linux Server

### Prerequisites

- A Linux server (Ubuntu/Debian/CentOS)
- SSH access
- A web server (Nginx or Caddy)

### Step 1: Build Locally and Upload

```bash
# Build
bun run build

# Upload to server
rsync -avz --delete out/ user@server:/var/www/amytis/
```

Or build on the server:

```bash
# On the server
git clone <your-repo-url> /opt/amytis
cd /opt/amytis
curl -fsSL https://bun.sh/install | bash
bun install
bun run build
cp -r out/. /var/www/amytis/
```

### Step 2: Configure Web Server

#### Nginx

Create `/etc/nginx/sites-available/amytis`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/amytis;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml image/svg+xml;
    gzip_min_length 256;

    # Cache static assets (JS/CSS bundles are content-hashed, safe to cache long)
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Cache post images and optimized images
    location /posts/ {
        expires 30d;
        add_header Cache-Control "public";
    }

    # Cache Pagefind search index (regenerated on each build, so short TTL is fine)
    location /pagefind/ {
        expires 1h;
        add_header Cache-Control "public";
    }

    # trailingSlash is true, so pages are slug/index.html
    # Redirect URLs without trailing slash to add one (except files)
    location / {
        try_files $uri $uri/ =404;
    }

    # Custom 404 page
    error_page 404 /404/index.html;
}
```

Enable and start:

```bash
sudo ln -s /etc/nginx/sites-available/amytis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Caddy (Simpler, Auto-HTTPS)

Create `/etc/caddy/Caddyfile`:

```
yourdomain.com {
    root * /var/www/amytis
    file_server

    # trailingSlash is true, so pages are slug/index.html
    try_files {path} {path}/ {path}/index.html

    # Cache static assets
    @static path /_next/static/*
    header @static Cache-Control "public, max-age=31536000, immutable"

    @postassets path /posts/*
    header @postassets Cache-Control "public, max-age=2592000"

    @pagefind path /pagefind/*
    header @pagefind Cache-Control "public, max-age=3600"

    handle_errors {
        rewrite * /404/index.html
        file_server
    }
}
```

Start:

```bash
sudo systemctl reload caddy
```

Caddy automatically provisions and renews HTTPS certificates via Let's Encrypt.

### Step 3: HTTPS with Nginx (Optional)

If using Nginx, set up HTTPS with Certbot:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
sudo certbot renew --dry-run
```

### Step 4: Automate Deployment (Optional)

Create a deploy script on your local machine at `scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

SERVER="user@server"
REMOTE_DIR="/var/www/amytis"

echo "Building..."
bun run build

echo "Deploying to $SERVER..."
rsync -avz --delete out/ "$SERVER:$REMOTE_DIR/"

echo "Done! Site deployed."
```

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

Or use a CI/CD pipeline — add a job in your GitHub Actions workflow:

```yaml
  deploy-server:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: github-pages
          path: out

      - name: Deploy via rsync
        uses: burnett01/rsync-deployments@7.0.2
        with:
          switches: -avz --delete
          path: out/
          remote_path: /var/www/amytis/
          remote_host: ${{ secrets.DEPLOY_HOST }}
          remote_user: ${{ secrets.DEPLOY_USER }}
          remote_key: ${{ secrets.DEPLOY_KEY }}
```

---

## Summary

| Method | Command | Notes |
|---|---|---|
| Build | `bun run build` | Output in `out/` |
| GitHub Pages | Push to `main` | With GitHub Actions workflow |
| Linux (upload) | `rsync -avz --delete out/ user@server:/var/www/amytis/` | After local build |
| Linux (on server) | `bun install && bun run build` | Clone repo on server |
