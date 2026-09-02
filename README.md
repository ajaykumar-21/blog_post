# Storyline

A scalable community publishing platform built with **Next.js, Express, and PostgreSQL**. It demonstrates production-focused patterns: JWT authentication, ownership authorization, full-text search, pagination, tags, threaded comments, rate limiting, Docker, and tests.

## Architecture

```text
Next.js (client, port 3000) → Express REST API (server, port 4000) → PostgreSQL
                                  ├─ JWT authentication
                                  ├─ validation + rate limits
                                  └─ PostgreSQL connection pool
```

## Features

- Account registration and login with bcrypt password hashing and 7-day JWT sessions.
- Authenticated post creation; only the creator can edit or delete their post.
- One-level threaded comments; only comment creators can delete them.
- Tags, full-text post search, server-side pagination, and newest/oldest sorting.
- PostgreSQL indexes for search, post listing, tags, and comment lookups.
- Security headers, CORS allow-listing, request body size limit, and rate limits.

## Local setup with pgAdmin

1. Start PostgreSQL and create database `blog_app` in pgAdmin.
2. Connect Query Tool to **blog_app** (check with `SELECT current_database();`).
3. Run [server/database.sql](server/database.sql) first. This creates the original `posts` and `comments` tables.
4. Run [server/migrations/001_scale_up.sql](server/migrations/001_scale_up.sql) next. This adds users, ownership fields, tags, threaded-comment support, and indexes.
5. Create `server/.env` from `server/.env.example`. Set your real database credentials and a unique secret:

```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=blog_app
DB_USER=your_postgres_username
DB_PASSWORD=your_postgres_password
JWT_SECRET=replace_this_with_a_long_random_secret
CLIENT_URL=http://localhost:3000
```

Generate a safe local JWT secret with:

```bash
openssl rand -hex 32
```

6. Install packages and start both apps:

```bash
npm run install:all
npm run dev
```

Open http://localhost:3000.

## API overview

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register` | Create an account |
| `POST /api/auth/login` | Get a JWT session |
| `GET /api/auth/me` | Current user (`Bearer` token required) |
| `GET /api/posts?page=1&limit=9&q=&tag=&sort=newest` | Search and paginate published posts |
| `GET /api/posts/:idOrSlug` | Post with its comments and replies |
| `POST /api/posts` | Create post (authenticated) |
| `PUT/DELETE /api/posts/:id` | Update/delete owned post |
| `POST /api/posts/:id/comments` | Add comment or `{ parentId }` reply |
| `DELETE /api/posts/comments/:id` | Delete owned comment |
| `GET /api/tags` | Tags with post counts |

## Commands

```bash
npm run dev       # API and web app together
npm run test      # backend validation tests
npm run build     # production client build
npm run docker:up # start the full stack in Docker
```

## Docker

`docker compose` starts PostgreSQL, the API, and the web app. On first start it applies the base schema and migration automatically. Change the example database password and JWT secret in `docker-compose.yml` before using it outside local development..
