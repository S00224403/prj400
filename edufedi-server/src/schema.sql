CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Use UUID for user ID
  username TEXT NOT NULL UNIQUE CHECK (
    trim(lower(username)) = username AND username <> '' AND length(username) <= 50
  ),
  email TEXT UNIQUE CHECK (email LIKE '%@%' AND email <> ''),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actors (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  uri TEXT NOT NULL UNIQUE CHECK (uri <> ''),
  handle TEXT NOT NULL UNIQUE CHECK (handle <> ''),
  name TEXT,
  inbox_url TEXT NOT NULL CHECK (inbox_url LIKE 'https://%' OR inbox_url LIKE 'http://%'),
  shared_inbox_url TEXT CHECK (
    shared_inbox_url LIKE 'https://%' OR shared_inbox_url LIKE 'http://%'
  ),
  url TEXT CHECK (
    url LIKE 'https://%' OR url LIKE 'http://%'
  ),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  publicKey TEXT CHECK (publicKey <> '') -- Changed to nullable
);

CREATE TABLE IF NOT EXISTS keys (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Use UUID for user ID
  type TEXT NOT NULL CHECK (type IN ('RSASSA-PKCS1-v1_5', 'Ed25519')),
  private_key TEXT NOT NULL CHECK (private_key <> ''),
  public_key TEXT NOT NULL CHECK (public_key <> ''),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (created IS NOT NULL),
  PRIMARY KEY (user_id, type)
);

CREATE TABLE IF NOT EXISTS follows (
  following_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
  follower_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP CHECK (created IS NOT NULL),
  PRIMARY KEY (following_id, follower_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  uri TEXT UNIQUE CHECK (uri <> ''), -- Made nullable for initial insertion
  actor_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (content <> ''),
  url TEXT CHECK (
    url LIKE 'https://%' OR url LIKE 'http://%' OR url IS NULL
  ), -- Allow null during creation
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL CHECK (file_url LIKE 'https://%' OR file_url LIKE 'http://%'),
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'video')),
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
  activity_uri TEXT UNIQUE, -- For federation
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, actor_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (content <> ''),
  parent_comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE, -- <-- For replies
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS reposts (
  id SERIAL PRIMARY KEY,
  post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES actors(id) ON DELETE CASCADE,
  activity_uri TEXT UNIQUE, -- For federation
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, actor_id)
);
-- Create reported_posts table
CREATE TABLE IF NOT EXISTS reported_posts (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved BOOLEAN NOT NULL DEFAULT false
);

-- Index for faster lookups
CREATE INDEX idx_reported_posts_post ON reported_posts(post_id);
CREATE INDEX idx_reported_posts_resolved ON reported_posts(resolved);
