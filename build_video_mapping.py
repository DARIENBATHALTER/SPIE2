#!/usr/bin/env python3
"""
Video Mapping Builder
Automatically matches video files in YouTube_Downloads to video data
Based on filename format: [YYYYMMDD]_[shortcode]_[Video_Title].mp4
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

def sanitize_title_for_filename(title):
    """Convert video title to likely filename format"""
    # Remove problematic characters that would be removed in filenames
    title = re.sub(r'[<>:"/\\|?*]', '', title)
    # Replace common substitutions
    title = title.replace('&', ' ')
    title = title.replace("'", '')
    title = title.replace('"', '')
    title = title.replace('*', '')
    # Normalize whitespace
    title = re.sub(r'\s+', '_', title.strip())
    return title

def extract_info_from_filename(filename):
    """Extract date, shortcode, and title from filename"""
    # Pattern: YYYYMMDD_shortcode_Title.mp4
    pattern = r'^(\d{8})_([^_]+)_(.+)\.mp4$'
    match = re.match(pattern, filename)
    
    if match:
        date_str, shortcode, title = match.groups()
        # Parse date
        try:
            date_obj = datetime.strptime(date_str, '%Y%m%d')
            return {
                'date': date_obj,
                'date_str': date_str,
                'shortcode': shortcode,
                'title': title.replace('_', ' '),
                'filename': filename
            }
        except ValueError:
            print(f"⚠️ Invalid date format in filename: {filename}")
    
    return None

def find_video_files(youtube_downloads_path):
    """Scan YouTube_Downloads folder for video files"""
    video_files = []
    
    if not os.path.exists(youtube_downloads_path):
        print(f"⚠️ YouTube_Downloads folder not found: {youtube_downloads_path}")
        return video_files
    
    for filename in os.listdir(youtube_downloads_path):
        if filename.lower().endswith('.mp4'):
            file_info = extract_info_from_filename(filename)
            if file_info:
                video_files.append(file_info)
                print(f"📁 Found: {filename}")
            else:
                print(f"⚠️ Couldn't parse filename: {filename}")
    
    return video_files

def load_video_data(videos_json_path):
    """Load video data from videos.json"""
    try:
        with open(videos_json_path, 'r', encoding='utf-8') as f:
            videos = json.load(f)
        print(f"📊 Loaded {len(videos)} videos from videos.json")
        return videos
    except Exception as e:
        print(f"❌ Error loading videos.json: {e}")
        return []

def match_videos_to_files(videos, video_files):
    """Match video data to local files"""
    mappings = {}
    matched_files = set()
    
    for video in videos:
        video_id = video['video_id']
        video_title = video['title']
        
        # Parse the published date
        try:
            published_date = datetime.fromisoformat(video['published_at'].replace('Z', '+00:00'))
            published_date_str = published_date.strftime('%Y%m%d')
        except:
            print(f"⚠️ Couldn't parse date for video: {video_title}")
            continue
        
        # Try to find matching file
        best_match = None
        best_score = 0
        
        for file_info in video_files:
            if file_info['filename'] in matched_files:
                continue  # Already matched
            
            score = 0
            
            # Check date match (most important)
            if file_info['date_str'] == published_date_str:
                score += 100
            
            # Check title similarity
            video_title_clean = sanitize_title_for_filename(video_title)
            file_title_clean = file_info['title']
            
            # Various title matching strategies
            if video_title_clean.lower() == file_title_clean.lower():
                score += 50
            elif video_title_clean.lower() in file_title_clean.lower():
                score += 30
            elif file_title_clean.lower() in video_title_clean.lower():
                score += 25
            else:
                # Check for partial word matches
                video_words = set(video_title_clean.lower().split('_'))
                file_words = set(file_title_clean.lower().split('_'))
                common_words = video_words.intersection(file_words)
                if len(common_words) > 0:
                    score += len(common_words) * 2
            
            if score > best_score:
                best_score = score
                best_match = file_info
        
        # If we found a good match, add it to mappings
        if best_match and best_score >= 100:  # Require at least date match
            mappings[video_id] = {
                'title': video_title,
                'suggested_filename': f"{video_title}.mp4",
                'actual_filename': best_match['filename'],
                'file_path': f"YouTube_Downloads/{best_match['filename']}",
                'match_score': best_score,
                'upload_date': published_date_str,
                'file_date': best_match['date_str']
            }
            matched_files.add(best_match['filename'])
            print(f"✅ Matched: {video_title[:50]}... -> {best_match['filename']}")
        else:
            print(f"❌ No match: {video_title[:50]}...")
    
    print(f"\n📊 Successfully matched {len(mappings)} videos to local files")
    
    # Report unmatched files
    unmatched_files = [f for f in video_files if f['filename'] not in matched_files]
    if unmatched_files:
        print(f"\n⚠️ Unmatched files ({len(unmatched_files)}):")
        for file_info in unmatched_files:
            print(f"   - {file_info['filename']}")
    
    return mappings

def save_video_mapping(mappings, output_path):
    """Save the video mapping to JSON file"""
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(mappings, f, indent=2, ensure_ascii=False)
        print(f"💾 Saved video mapping to: {output_path}")
        return True
    except Exception as e:
        print(f"❌ Error saving video mapping: {e}")
        return False

def main():
    print("🎬 Medical Medium Video Mapping Builder")
    print("=" * 50)
    
    # Define paths
    base_path = Path(__file__).parent
    
    # Use EPHRAIM network share (where videos are currently located)
    youtube_downloads_path = Path("/Volumes/EPHRAIM/MMArchiveTool/YouTube_Downloads")
    print("🌐 Using EPHRAIM network share for video files")
    
    videos_json_path = base_path / "data" / "videos.json"
    mapping_output_path = base_path / "data" / "video-mapping.json"
    
    print(f"📂 Scanning: {youtube_downloads_path}")
    print(f"📊 Video data: {videos_json_path}")
    print(f"💾 Output: {mapping_output_path}")
    print()
    
    # Step 1: Find video files
    video_files = find_video_files(youtube_downloads_path)
    if not video_files:
        print("❌ No video files found! Please check the YouTube_Downloads folder.")
        return
    
    print(f"📁 Found {len(video_files)} video files")
    print()
    
    # Step 2: Load video data
    videos = load_video_data(videos_json_path)
    if not videos:
        print("❌ No video data loaded! Please check videos.json.")
        return
    
    print()
    
    # Step 3: Match videos to files
    print("🔍 Matching videos to files...")
    print("-" * 30)
    mappings = match_videos_to_files(videos, video_files)
    
    print()
    
    # Step 4: Save mapping
    if mappings:
        if save_video_mapping(mappings, mapping_output_path):
            print("✅ Video mapping completed successfully!")
            print(f"📊 {len(mappings)} videos mapped to local files")
            print()
            print("🚀 Your client can now watch local videos in the archive!")
        else:
            print("❌ Failed to save video mapping")
    else:
        print("❌ No video mappings generated")

if __name__ == "__main__":
    main() 