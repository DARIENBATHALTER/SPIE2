-- PostgreSQL schema for Instagram Archive Comments

-- Posts table (from metadata CSV)
CREATE TABLE IF NOT EXISTS posts (
    id SERIAL PRIMARY KEY,
    shortcode VARCHAR(50) UNIQUE NOT NULL,
    post_url TEXT,
    created_at TIMESTAMP,
    likes INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    caption TEXT,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments table (storing comment IDs and associations)
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    comment_id VARCHAR(50) UNIQUE NOT NULL,
    post_shortcode VARCHAR(50) NOT NULL,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_shortcode) REFERENCES posts(shortcode) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_comments_post_shortcode ON comments(post_shortcode);
CREATE INDEX idx_comments_comment_id ON comments(comment_id);
CREATE INDEX idx_posts_shortcode ON posts(shortcode);
CREATE INDEX idx_posts_created_at ON posts(created_at);

-- View for comment statistics per post
CREATE VIEW post_comment_stats AS
SELECT 
    p.shortcode,
    p.post_url,
    p.created_at,
    p.likes,
    p.comment_count as metadata_comment_count,
    COUNT(c.id) as actual_comment_count
FROM posts p
LEFT JOIN comments c ON p.shortcode = c.post_shortcode
GROUP BY p.shortcode, p.post_url, p.created_at, p.likes, p.comment_count;