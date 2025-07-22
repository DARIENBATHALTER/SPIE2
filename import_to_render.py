#!/usr/bin/env python3
"""
Optimized import script for Render PostgreSQL
Handles large data volumes with batching and progress tracking
"""
import os
import csv
import psycopg2
from psycopg2.extras import execute_batch
import time
from datetime import datetime
import sys

class RenderImporter:
    def __init__(self, database_url):
        self.database_url = database_url
        self.batch_size = 5000  # Optimal batch size for network operations
        
    def connect(self):
        """Create database connection with optimal settings"""
        return psycopg2.connect(
            self.database_url,
            cursor_factory=psycopg2.extras.RealDictCursor,
            connect_timeout=30
        )
    
    def create_schema(self):
        """Ensure schema exists"""
        print("Creating database schema...")
        conn = self.connect()
        cur = conn.cursor()
        
        with open('database_schema.sql', 'r') as f:
            cur.execute(f.read())
        
        conn.commit()
        cur.close()
        conn.close()
        print("Schema created successfully")
    
    def import_posts(self):
        """Import posts with progress tracking"""
        print("\nImporting posts...")
        conn = self.connect()
        cur = conn.cursor()
        
        posts_file = './data/parsed/posts.csv'
        total_rows = sum(1 for _ in open(posts_file)) - 1  # Subtract header
        
        with open(posts_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            batch = []
            imported = 0
            
            for row in reader:
                # Parse created_at
                created_at = None
                if row['created_at']:
                    try:
                        created_at = datetime.fromisoformat(row['created_at'])
                    except:
                        pass
                
                batch.append((
                    row['shortcode'],
                    row['post_url'],
                    created_at,
                    int(row['likes']) if row['likes'] else 0,
                    int(row['comment_count']) if row['comment_count'] else 0,
                    row['caption']
                ))
                
                if len(batch) >= self.batch_size:
                    self._insert_posts_batch(cur, batch)
                    imported += len(batch)
                    print(f"  Imported {imported}/{total_rows} posts ({imported*100//total_rows}%)", end='\r')
                    batch = []
            
            # Insert remaining
            if batch:
                self._insert_posts_batch(cur, batch)
                imported += len(batch)
            
            print(f"  Imported {imported}/{total_rows} posts (100%)    ")
        
        conn.commit()
        cur.close()
        conn.close()
    
    def _insert_posts_batch(self, cur, batch):
        """Insert batch of posts"""
        query = """
            INSERT INTO posts (shortcode, post_url, created_at, likes, comment_count, caption)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (shortcode) DO UPDATE SET
                likes = EXCLUDED.likes,
                comment_count = EXCLUDED.comment_count
        """
        execute_batch(cur, query, batch, page_size=self.batch_size)
    
    def import_comments(self):
        """Import comments with progress tracking and memory optimization"""
        print("\nImporting comments (this may take several minutes)...")
        conn = self.connect()
        cur = conn.cursor()
        
        comments_file = './data/parsed/comments.csv'
        
        # Count total for progress
        print("  Counting comments...")
        total_rows = sum(1 for _ in open(comments_file)) - 1
        print(f"  Total comments to import: {total_rows:,}")
        
        with open(comments_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            batch = []
            imported = 0
            start_time = time.time()
            
            for row in reader:
                batch.append((
                    row['comment_id'],
                    row['post_shortcode']
                ))
                
                if len(batch) >= self.batch_size:
                    self._insert_comments_batch(cur, batch)
                    imported += len(batch)
                    
                    # Progress reporting
                    elapsed = time.time() - start_time
                    rate = imported / elapsed if elapsed > 0 else 0
                    eta = (total_rows - imported) / rate if rate > 0 else 0
                    
                    print(f"  Imported {imported:,}/{total_rows:,} comments "
                          f"({imported*100//total_rows}%) - "
                          f"Rate: {rate:.0f}/s - ETA: {eta/60:.1f} min", end='\r')
                    
                    batch = []
                    
                    # Commit periodically to avoid long transactions
                    if imported % 50000 == 0:
                        conn.commit()
            
            # Insert remaining
            if batch:
                self._insert_comments_batch(cur, batch)
                imported += len(batch)
            
            elapsed = time.time() - start_time
            print(f"\n  Imported {imported:,}/{total_rows:,} comments (100%) "
                  f"in {elapsed/60:.1f} minutes")
        
        conn.commit()
        cur.close()
        conn.close()
    
    def _insert_comments_batch(self, cur, batch):
        """Insert batch of comments"""
        query = """
            INSERT INTO comments (comment_id, post_shortcode)
            VALUES (%s, %s)
            ON CONFLICT (comment_id) DO NOTHING
        """
        execute_batch(cur, query, batch, page_size=self.batch_size)
    
    def verify_import(self):
        """Verify import completed successfully"""
        print("\nVerifying import...")
        conn = self.connect()
        cur = conn.cursor()
        
        # Check counts
        cur.execute("SELECT COUNT(*) as count FROM posts")
        post_count = cur.fetchone()['count']
        
        cur.execute("SELECT COUNT(*) as count FROM comments")
        comment_count = cur.fetchone()['count']
        
        print(f"  Posts in database: {post_count:,}")
        print(f"  Comments in database: {comment_count:,}")
        
        # Check a sample
        cur.execute("""
            SELECT p.shortcode, p.likes, COUNT(c.comment_id) as actual_comments
            FROM posts p
            LEFT JOIN comments c ON p.shortcode = c.post_shortcode
            GROUP BY p.shortcode, p.likes
            ORDER BY p.likes DESC
            LIMIT 5
        """)
        
        print("\n  Top 5 posts by likes:")
        for row in cur.fetchall():
            print(f"    {row['shortcode']}: {row['likes']:,} likes, "
                  f"{row['actual_comments']:,} comments")
        
        cur.close()
        conn.close()

def main():
    # Get database URL
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("Error: DATABASE_URL environment variable not set")
        print("Set it with: export DATABASE_URL='your-render-database-url'")
        sys.exit(1)
    
    # Verify CSV files exist
    if not os.path.exists('./data/parsed/posts.csv'):
        print("Error: ./data/parsed/posts.csv not found")
        print("Run parse_comments_to_db.py --csv first")
        sys.exit(1)
    
    importer = RenderImporter(database_url)
    
    try:
        # Create schema
        importer.create_schema()
        
        # Import data
        importer.import_posts()
        importer.import_comments()
        
        # Verify
        importer.verify_import()
        
        print("\n✅ Import completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()