# Render PostgreSQL Setup Guide

## 1. Create PostgreSQL Database on Render

1. Log into your Render account
2. Click "New +" → "PostgreSQL"
3. Configure your database:
   - Name: `mm-instagram-archive-db`
   - Region: Choose closest to you
   - PostgreSQL Version: 15
   - Plan: Start with Free tier (1GB storage)
   
   **Note**: With 2.4M comments, you'll likely need to upgrade to at least Starter plan ($7/month, 10GB storage)

4. Click "Create Database"
5. Wait for database to provision

## 2. Get Connection Details

After creation, go to your database dashboard and copy:
- Internal Database URL (for apps hosted on Render)
- External Database URL (for local development)

Example format:
```
postgresql://username:password@hostname:5432/database_name
```

## 3. Create Database Schema

Connect to your database and run the schema:

```bash
# From local machine
psql "YOUR_EXTERNAL_DATABASE_URL" < database_schema.sql
```

## 4. Import Data

Due to the large data size (2.4M comments), we'll use the optimized import script:

```bash
# Install dependencies
pip install psycopg2-binary python-dotenv

# Set environment variable
export DATABASE_URL="YOUR_EXTERNAL_DATABASE_URL"

# Run import
python import_to_render.py
```

## 5. Performance Considerations

### Storage Requirements
- Posts table: ~15MB (143K rows)
- Comments table: ~200MB (2.4M rows)
- Indexes: ~50MB
- Total: ~300MB minimum

### Recommended Indexes
```sql
-- Already in schema, but verify they exist:
CREATE INDEX idx_comments_post ON comments(post_shortcode);
CREATE INDEX idx_posts_created ON posts(created_at);
```

### Connection Pooling
Render databases have connection limits:
- Free: 22 connections
- Starter: 97 connections

Use connection pooling in your app to avoid exhausting connections.

## 6. Security

1. Never commit database URLs to git
2. Use environment variables in production
3. Enable SSL connections (Render does this by default)
4. Consider IP allowlisting for extra security

## 7. Backup Strategy

Render provides automatic daily backups on paid plans. For free tier:
```bash
# Manual backup
pg_dump "YOUR_EXTERNAL_DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

## 8. Monitoring

Check Render dashboard for:
- Storage usage
- Connection count
- Query performance
- CPU/Memory usage

## Next Steps

1. Create `.env` file with database URL
2. Run import script
3. Test queries for performance
4. Configure application to use PostgreSQL