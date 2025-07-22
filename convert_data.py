import sqlite3
import json
import os
from datetime import datetime

def convert_db_to_json():
    """Convert SQLite database to JSON files for HTML/JS app"""
    
    # Connect to database
    db_path = '../data/youtube_comments.db'
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    print("Converting database to JSON...")

    # Export videos
    cursor = conn.execute('SELECT * FROM videos ORDER BY published_at DESC')
    videos = [dict(row) for row in cursor.fetchall()]
    print(f"Found {len(videos)} videos")

    # Export comments  
    cursor = conn.execute('SELECT * FROM comments ORDER BY video_id, published_at')
    comments = [dict(row) for row in cursor.fetchall()]
    print(f"Found {len(comments)} comments")

    conn.close()

    # Create data directory
    os.makedirs('data', exist_ok=True)

    # Save videos
    with open('data/videos.json', 'w', encoding='utf-8') as f:
        json.dump(videos, f, indent=2, default=str)
    print("✅ Saved videos.json")

    # Save comments
    with open('data/comments.json', 'w', encoding='utf-8') as f:
        json.dump(comments, f, indent=2, default=str)
    print("✅ Saved comments.json")

    # Create video mapping template (user will need to populate based on their file structure)
    video_mapping = {}
    for video in videos[:5]:  # Sample first 5 videos
        video_id = video['video_id']
        title = video['title']
        # Generate suggested filename
        safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        video_mapping[video_id] = {
            "title": title,
            "suggested_filename": f"{safe_title}.mp4",
            "actual_filename": "",  # User needs to fill this
            "file_path": f"YouTube_Downloads/{safe_title}.mp4"
        }

    with open('data/video-mapping.json', 'w', encoding='utf-8') as f:
        json.dump(video_mapping, f, indent=2)
    print("✅ Created video-mapping.json template")

    print(f"\n🎉 Conversion complete!")
    print(f"📊 {len(videos)} videos, {len(comments)} comments")
    print(f"📁 Files created in MMArchiveTool/data/")

if __name__ == "__main__":
    convert_db_to_json() 