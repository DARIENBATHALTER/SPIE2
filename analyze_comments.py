#!/usr/bin/env python3
"""
Analyze Instagram comment JSON files to:
1. Extract all unique shortcodes with comment data
2. Count total comments and identify duplicates
3. Compare against metadata CSV to find missing posts
4. Prepare for database migration
"""

import json
import csv
import os
from collections import defaultdict, Counter
from datetime import datetime
import sys

def analyze_json_file(filepath):
    """Analyze a single JSON file and return statistics"""
    print(f"\nAnalyzing {os.path.basename(filepath)}...")
    
    shortcode_to_comments = defaultdict(set)
    all_comment_ids = []
    total_entries = 0
    error_entries = 0
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        # Handle both dict and list structures
        if isinstance(data, dict):
            items = data.items()
        elif isinstance(data, list):
            # Convert list to dict-like items
            items = [(str(i), item) for i, item in enumerate(data)]
        else:
            print(f"Unexpected data type: {type(data)}")
            return None, None, 0
            
        for key, entry in items:
            try:
                total_entries += 1
                
                # Skip if entry is not a dict
                if not isinstance(entry, dict):
                    error_entries += 1
                    continue
                    
                shortcode = entry.get('target', '')
                
                if shortcode:
                    # Collect all comment IDs from all log entries
                    logs = entry.get('logs', [])
                    if isinstance(logs, list):
                        for log in logs:
                            if isinstance(log, dict):
                                comment_ids = log.get('storedIds', [])
                                if isinstance(comment_ids, list):
                                    shortcode_to_comments[shortcode].update(comment_ids)
                                    all_comment_ids.extend(comment_ids)
            except Exception as e:
                error_entries += 1
                continue
    
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from {filepath}: {e}")
        return None, None, 0
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        import traceback
        traceback.print_exc()
        return None, None, 0
    
    if error_entries > 0:
        print(f"  - Error entries: {error_entries}")
    
    return shortcode_to_comments, all_comment_ids, total_entries

def main():
    # Paths
    comments_dir = "/Volumes/Crucial X9/MMInstaArchive/mm_ig_comments"
    metadata_path = "/Volumes/Crucial X9/MMInstaArchive/mm_ig_metadata.csv"
    
    # Get all JSON files (excluding macOS metadata files)
    json_files = [f for f in os.listdir(comments_dir) 
                  if f.endswith('.json') and not f.startswith('._')]
    print(f"Found {len(json_files)} JSON files to analyze")
    
    # Aggregate data from all JSON files
    all_shortcodes_with_comments = set()
    all_comment_ids = []
    shortcode_comment_counts = defaultdict(int)
    
    for json_file in json_files:
        filepath = os.path.join(comments_dir, json_file)
        shortcode_to_comments, comment_ids, entries = analyze_json_file(filepath)
        
        if shortcode_to_comments:
            all_shortcodes_with_comments.update(shortcode_to_comments.keys())
            all_comment_ids.extend(comment_ids)
            
            for shortcode, comments in shortcode_to_comments.items():
                shortcode_comment_counts[shortcode] += len(comments)
            
            print(f"  - Entries: {entries}")
            print(f"  - Unique shortcodes: {len(shortcode_to_comments)}")
            print(f"  - Total comments: {len(comment_ids)}")
    
    # Analyze duplicates
    print("\n=== OVERALL STATISTICS ===")
    print(f"Total shortcodes with comments: {len(all_shortcodes_with_comments)}")
    print(f"Total comment IDs collected: {len(all_comment_ids)}")
    
    comment_counter = Counter(all_comment_ids)
    unique_comments = len(comment_counter)
    duplicate_comments = sum(1 for count in comment_counter.values() if count > 1)
    
    print(f"Unique comment IDs: {unique_comments}")
    print(f"Duplicate comment IDs: {duplicate_comments}")
    
    # Read metadata CSV to compare
    print("\n=== COMPARING WITH METADATA ===")
    metadata_shortcodes = set()
    
    with open(metadata_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            shortcode = row.get('Shortcode', '').strip()
            if shortcode:
                metadata_shortcodes.add(shortcode)
    
    print(f"Total posts in metadata: {len(metadata_shortcodes)}")
    print(f"Posts with comment data: {len(all_shortcodes_with_comments)}")
    
    # Find missing posts
    missing_posts = metadata_shortcodes - all_shortcodes_with_comments
    extra_posts = all_shortcodes_with_comments - metadata_shortcodes
    
    print(f"Posts in metadata but missing comments: {len(missing_posts)}")
    print(f"Posts with comments but not in metadata: {len(extra_posts)}")
    
    # Save analysis results
    output_dir = "/Volumes/Crucial X9/MMInstaArchive/MMArchiveExplorer/data"
    os.makedirs(output_dir, exist_ok=True)
    
    # Save missing posts
    if missing_posts:
        with open(os.path.join(output_dir, 'missing_comment_posts.txt'), 'w') as f:
            for shortcode in sorted(missing_posts):
                f.write(f"{shortcode}\n")
        print(f"\nSaved {len(missing_posts)} missing posts to missing_comment_posts.txt")
    
    # Save comment statistics
    with open(os.path.join(output_dir, 'comment_statistics.json'), 'w') as f:
        stats = {
            'total_posts_in_metadata': len(metadata_shortcodes),
            'posts_with_comments': len(all_shortcodes_with_comments),
            'total_comment_ids': len(all_comment_ids),
            'unique_comments': unique_comments,
            'duplicate_comments': duplicate_comments,
            'missing_posts': len(missing_posts),
            'extra_posts': len(extra_posts),
            'top_commented_posts': sorted(
                [(k, v) for k, v in shortcode_comment_counts.items()], 
                key=lambda x: x[1], 
                reverse=True
            )[:20]
        }
        json.dump(stats, f, indent=2)
    
    print("\nAnalysis complete! Check the data folder for results.")

if __name__ == "__main__":
    main()