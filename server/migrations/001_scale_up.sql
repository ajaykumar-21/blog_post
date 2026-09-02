-- Run this once in pgAdmin while connected to the blog_app database.
-- It preserves the original posts/comments tables and their data.
CREATE TABLE
  IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published'));

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS slug VARCHAR(240) UNIQUE;

ALTER TABLE comments
ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE comments
ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES comments (id) ON DELETE CASCADE;

CREATE TABLE
  IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(60) NOT NULL UNIQUE
  );

CREATE TABLE
  IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
  );

CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts (author_id);

CREATE INDEX IF NOT EXISTS posts_status_created_at_idx ON posts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id);

CREATE INDEX IF NOT EXISTS comments_post_parent_created_idx ON comments (post_id, parent_id, created_at);

CREATE INDEX IF NOT EXISTS post_tags_tag_id_idx ON post_tags (tag_id);

CREATE INDEX IF NOT EXISTS posts_search_idx ON posts USING GIN (
  to_tsvector (
    'english',
    coalesce(title, '') || ' ' || coalesce(content, '')
  )
);