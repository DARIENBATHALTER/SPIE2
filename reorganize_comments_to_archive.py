#!/usr/bin/env python3
"""
Reorganize the static comments database into the mm_ig_comments folder
so it's part of the Instagram archive that users can select.
"""
import os
import shutil
import json

def reorganize_comments():
    """Move static-comments-db into mm_ig_comments folder"""
    source_dir = "/Volumes/Crucial X9/MMInstaArchive/MMArchiveExplorer/static-comments-db"
    target_dir = "/Volumes/Crucial X9/MMInstaArchive/mm_ig_comments/organized"
    
    if not os.path.exists(source_dir):
        print(f"Source directory not found: {source_dir}")
        return
    
    print(f"Moving comments database to archive folder...")
    print(f"Source: {source_dir}")
    print(f"Target: {target_dir}")
    
    # Remove target if it exists
    if os.path.exists(target_dir):
        print("Removing existing organized folder...")
        shutil.rmtree(target_dir)
    
    # Move the entire directory
    print("Moving files...")
    shutil.move(source_dir, target_dir)
    
    print("✅ Comments database moved successfully!")
    print(f"Location: {target_dir}")
    
    # Update the organize script to output directly to archive
    update_script_path()

def update_script_path():
    """Update the organize script to output directly to mm_ig_comments"""
    script_path = "/Volumes/Crucial X9/MMInstaArchive/MMArchiveExplorer/organize_comments_static.py"
    
    with open(script_path, 'r') as f:
        content = f.read()
    
    # Update default output directory
    content = content.replace(
        "def __init__(self, comments_dir, output_dir='./static-comments-db'):",
        "def __init__(self, comments_dir, output_dir='/Volumes/Crucial X9/MMInstaArchive/mm_ig_comments/organized'):"
    )
    
    with open(script_path, 'w') as f:
        f.write(content)
    
    print("✅ Updated organize script to use archive directory")

if __name__ == "__main__":
    reorganize_comments()