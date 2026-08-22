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
