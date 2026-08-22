# Homeo Life

Next.js + PostgreSQL website for Homeo Life.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Docker

Build and run the website plus PostgreSQL:

```bash
docker compose up --build
```

The app runs on `http://localhost:3000`.

PostgreSQL runs inside the Compose network at:

```text
postgres://homeolife:homeolife@postgres:5432/homeolife
```

For host tools, connect with:

```text
postgres://homeolife:homeolife@localhost:5432/homeolife
```

## Environment

Copy `.env.example` to `.env` and set production secrets before deployment.

## Production deployment (DigitalOcean droplet)

One-time setup on a fresh Ubuntu droplet:

```bash
# 1. Install Docker + Compose plugin
curl -fsSL https://get.docker.com | sh

# 2. Add a deploy key so the droplet can pull the private repo (read-only)
ssh-keygen -t ed25519 -C "homeo-life-deploy" -f ~/.ssh/homeo_life_deploy -N ""
cat ~/.ssh/homeo_life_deploy.pub
# Paste that into GitHub: repo -> Settings -> Deploy keys -> Add deploy key (no write access needed)

# 3. Clone
GIT_SSH_COMMAND="ssh -i ~/.ssh/homeo_life_deploy" git clone git@github.com:ketanwani/homeo-life.git
cd homeo-life

# 4. Production secrets
cp .env.production.example .env
# Edit .env: set POSTGRES_PASSWORD (openssl rand -base64 24), AUTH_SECRET (npx auth secret),
# and NEXT_PUBLIC_SITE_URL. Update Caddyfile if the domain isn't myhomeolife.com.

# 5. Bring the stack up (base + prod override adds the Caddy reverse proxy / HTTPS)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

Caddy needs the domain to already resolve to this droplet before it can get a Let's Encrypt
certificate — until DNS is switched, verify the app came up correctly by simulating the hostname:

```bash
curl -H "Host: myhomeolife.com" http://localhost
```

Then point the domain at the droplet (in Wix's DNS settings, an **A record** for `@` and `www` to the
droplet's public IP — Wix can keep managing the domain/DNS, this doesn't require moving it off Wix).
Once DNS propagates, Caddy automatically issues the certificate on the next request — no action
needed. Verify `https://myhomeolife.com` loads.

Create the real doctor login (do this on the droplet — the local dev database and the droplet's are
completely separate):

```bash
docker compose exec app node scripts/create-doctor.mjs you@example.com "a-real-password" "Dr. Neha Mehta"
```

**DigitalOcean firewall:** only 22 (SSH), 80, and 443 need to be open publicly. Postgres and the app's
own port 3000 are bound to `127.0.0.1` in `docker-compose.yml` on purpose — not reachable from the
internet even without a firewall rule, but the firewall is good defense in depth regardless.

**Redeploying after a code change:**

```bash
cd homeo-life
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```
