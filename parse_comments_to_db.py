#!/usr/bin/env python3
"""
Parse Instagram comment JSON files and prepare for database insertion.
Can output to CSV files or directly insert into PostgreSQL.
"""

import json
import csv
import os
from collections import defaultdict
from datetime import datetime
import argparse
import sys

# Optional PostgreSQL support
try:
    import psycopg2
    from psycopg2.extras import execute_batch
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

class CommentParser:
    def __init__(self, comments_dir, metadata_path):
        self.comments_dir = comments_dir
        self.metadata_path = metadata_path
        self.posts_data = []
        self.comments_data = []
        self.seen_comment_ids = set()
        
    def parse_metadata_csv(self):
        """Parse the metadata CSV to get post information"""
        print("Parsing metadata CSV...")
        
        with open(self.metadata_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Parse date - format appears to be: 6/21/2025 15:52:47
                created_str = row.get('Create Date', '').strip()
                created_at = None
                if created_str:
                    try:
                        created_at = datetime.strptime(created_str, '%m/%d/%Y %H:%M:%S')
                    except ValueError:
                        try:
                            created_at = datetime.strptime(created_str, '%Y-%m-%d %H:%M:%S')
                        except ValueError:
                            pass
                
                # Parse numeric fields with error handling
                try:
                    likes = int(row.get('Likes', 0) or 0)
                except (ValueError, TypeError):
                    likes = 0
                
                try:
                    comment_count = int(row.get('Comments', 0) or 0)
                except (ValueError, TypeError):
                    comment_count = 0
                
                post = {
                    'shortcode': row.get('Shortcode', '').strip(),
                    'post_url': row.get('Post', '').strip(),
                    'created_at': created_at,
                    'likes': likes,
                    'comment_count': comment_count,
                    'caption': row.get('Captions', '').strip()
                }
                
                if post['shortcode']:
                    self.posts_data.append(post)
        
        print(f"Found {len(self.posts_data)} posts in metadata")
        return self.posts_data
    
    def parse_comment_files(self):
        """Parse all JSON comment files"""
        json_files = [f for f in os.listdir(self.comments_dir) 
                      if f.endswith('.json') and not f.startswith('._')]
        
        print(f"\nParsing {len(json_files)} JSON comment files...")
        
        for json_file in json_files:
            filepath = os.path.join(self.comments_dir, json_file)
            self._parse_single_json(filepath)
        
        print(f"\nTotal unique comments collected: {len(self.comments_data)}")
        return self.comments_data
    
    def _parse_single_json(self, filepath):
        """Parse a single JSON file"""
        print(f"  Processing {os.path.basename(filepath)}...")
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            if not isinstance(data, dict):
                print(f"    Warning: Expected dict but got {type(data)}")
                return
            
            new_comments = 0
            duplicate_comments = 0
            
            for uuid, entry in data.items():
                if not isinstance(entry, dict):
                    continue
                
                shortcode = entry.get('target', '')
                if not shortcode:
                    continue
                
                # Extract all comment IDs from logs
                for log in entry.get('logs', []):
                    if not isinstance(log, dict):
                        continue
                    
                    comment_ids = log.get('storedIds', [])
                    if not isinstance(comment_ids, list):
                        continue
                    
                    for comment_id in comment_ids:
                        if comment_id not in self.seen_comment_ids:
                            self.seen_comment_ids.add(comment_id)
                            self.comments_data.append({
                                'comment_id': comment_id,
                                'post_shortcode': shortcode
                            })
                            new_comments += 1
                        else:
                            duplicate_comments += 1
            
            print(f"    Added {new_comments} new comments, skipped {duplicate_comments} duplicates")
            
        except Exception as e:
            print(f"    Error processing file: {e}")
    
    def save_to_csv(self, output_dir):
        """Save parsed data to CSV files"""
        os.makedirs(output_dir, exist_ok=True)
        
        # Save posts
        posts_file = os.path.join(output_dir, 'posts.csv')
        with open(posts_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['shortcode', 'post_url', 'created_at', 
                                                   'likes', 'comment_count', 'caption'])
            writer.writeheader()
            writer.writerows(self.posts_data)
        print(f"\nSaved {len(self.posts_data)} posts to {posts_file}")
        
        # Save comments
        comments_file = os.path.join(output_dir, 'comments.csv')
        with open(comments_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['comment_id', 'post_shortcode'])
            writer.writeheader()
            writer.writerows(self.comments_data)
        print(f"Saved {len(self.comments_data)} comments to {comments_file}")
    
    def insert_to_postgres(self, connection_params):
        """Insert data directly into PostgreSQL"""
        if not HAS_POSTGRES:
            print("Error: psycopg2 not installed. Run: pip install psycopg2-binary")
            return
        
        try:
            conn = psycopg2.connect(**connection_params)
            cur = conn.cursor()
            
            # Insert posts
            print("\nInserting posts into database...")
            post_query = """
                INSERT INTO posts (shortcode, post_url, created_at, likes, comment_count, caption)
                VALUES (%(shortcode)s, %(post_url)s, %(created_at)s, %(likes)s, %(comment_count)s, %(caption)s)
                ON CONFLICT (shortcode) DO UPDATE SET
                    likes = EXCLUDED.likes,
                    comment_count = EXCLUDED.comment_count
            """
            execute_batch(cur, post_query, self.posts_data, page_size=1000)
            print(f"Inserted/updated {len(self.posts_data)} posts")
            
            # Insert comments
            print("\nInserting comments into database...")
            comment_query = """
                INSERT INTO comments (comment_id, post_shortcode)
                VALUES (%(comment_id)s, %(post_shortcode)s)
                ON CONFLICT (comment_id) DO NOTHING
            """
            execute_batch(cur, comment_query, self.comments_data, page_size=5000)
            print(f"Inserted {len(self.comments_data)} comments")
            
            conn.commit()
            cur.close()
            conn.close()
            
            print("\nDatabase insertion complete!")
            
        except Exception as e:
            print(f"Error inserting to database: {e}")
            if conn:
                conn.rollback()
                conn.close()

def main():
    arg_parser = argparse.ArgumentParser(description='Parse Instagram comments for database storage')
    arg_parser.add_argument('--csv', action='store_true', help='Output to CSV files instead of database')
    arg_parser.add_argument('--output-dir', default='./data/parsed', help='Output directory for CSV files')
    
    # Database connection parameters
    arg_parser.add_argument('--db-host', default='localhost', help='PostgreSQL host')
    arg_parser.add_argument('--db-port', default=5432, type=int, help='PostgreSQL port')
    arg_parser.add_argument('--db-name', default='instagram_archive', help='Database name')
    arg_parser.add_argument('--db-user', default='postgres', help='Database user')
    arg_parser.add_argument('--db-password', help='Database password')
    
    args = arg_parser.parse_args()
    
    # Initialize parser
    comments_dir = "/Volumes/Crucial X9/MMInstaArchive/mm_ig_comments"
    metadata_path = "/Volumes/Crucial X9/MMInstaArchive/mm_ig_metadata.csv"
    
    comment_parser = CommentParser(comments_dir, metadata_path)
    
    # Parse data
    comment_parser.parse_metadata_csv()
    comment_parser.parse_comment_files()
    
    # Save or insert data
    if args.csv:
        comment_parser.save_to_csv(args.output_dir)
    else:
        if not args.db_password:
            print("Error: Database password required for insertion")
            sys.exit(1)
        
        connection_params = {
            'host': args.db_host,
            'port': args.db_port,
            'database': args.db_name,
            'user': args.db_user,
            'password': args.db_password
        }
        comment_parser.insert_to_postgres(connection_params)

if __name__ == "__main__":
    main()