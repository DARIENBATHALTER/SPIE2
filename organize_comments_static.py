#!/usr/bin/env python3
"""
Organize comments into a static folder structure for GitHub Pages hosting.
Creates chunked JSON files organized by shortcode for efficient static loading.
"""
import json
import os
import shutil
from collections import defaultdict
from pathlib import Path
import gzip

class StaticCommentOrganizer:
    def __init__(self, comments_dir, output_dir='/Volumes/Crucial X9/MMInstaArchive/mm_ig_comments/organized'):
        self.comments_dir = comments_dir
        self.output_dir = output_dir
        self.chunk_size = 1000  # Comments per chunk file
        self.index_data = {
            'posts': {},
            'stats': {
                'total_posts': 0,
                'total_comments': 0,
                'total_chunks': 0
            }
        }
        
    def clean_output_directory(self):
        """Clean and recreate output directory"""
        if os.path.exists(self.output_dir):
            print(f"Cleaning existing output directory: {self.output_dir}")
            shutil.rmtree(self.output_dir)
        os.makedirs(self.output_dir)
        os.makedirs(os.path.join(self.output_dir, 'posts'))
        
    def parse_json_files(self):
        """Parse all JSON files and organize by shortcode"""
        print("Parsing comment JSON files...")
        
        shortcode_comments = defaultdict(list)
        total_entries = 0
        
        json_files = [f for f in os.listdir(self.comments_dir) 
                      if f.endswith('.json') and not f.startswith('._')]
        
        for filename in json_files:
            print(f"\nProcessing {filename}...")
            filepath = os.path.join(self.comments_dir, filename)
            
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                
                for uuid, entry in data.items():
                    if isinstance(entry, dict):
                        shortcode = entry.get('target', '')
                        if shortcode:
                            # Extract all comment IDs from logs
                            for log in entry.get('logs', []):
                                if isinstance(log, dict):
                                    comment_ids = log.get('storedIds', [])
                                    if isinstance(comment_ids, list):
                                        shortcode_comments[shortcode].extend(comment_ids)
                            total_entries += 1
                            
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
                continue
        
        print(f"\nFound comments for {len(shortcode_comments)} posts")
        print(f"Total entries processed: {total_entries}")
        
        return shortcode_comments
    
    def deduplicate_comments(self, shortcode_comments):
        """Remove duplicate comment IDs per shortcode"""
        print("\nDeduplicating comments...")
        
        for shortcode, comments in shortcode_comments.items():
            original_count = len(comments)
            unique_comments = list(dict.fromkeys(comments))  # Preserves order
            shortcode_comments[shortcode] = unique_comments
            
            if original_count != len(unique_comments):
                print(f"  {shortcode}: {original_count} -> {len(unique_comments)} comments")
        
        return shortcode_comments
    
    def create_chunked_files(self, shortcode_comments):
        """Create chunked JSON files for each post"""
        print("\nCreating chunked comment files...")
        
        total_comments = 0
        total_chunks = 0
        
        for shortcode, comments in shortcode_comments.items():
            if not comments:
                continue
                
            post_dir = os.path.join(self.output_dir, 'posts', shortcode)
            os.makedirs(post_dir, exist_ok=True)
            
            # Create chunks
            chunks = []
            for i in range(0, len(comments), self.chunk_size):
                chunk = comments[i:i + self.chunk_size]
                chunk_index = i // self.chunk_size
                
                # Save chunk as compressed JSON
                chunk_data = {
                    'shortcode': shortcode,
                    'chunk_index': chunk_index,
                    'comment_ids': chunk,
                    'count': len(chunk)
                }
                
                chunk_file = os.path.join(post_dir, f'chunk_{chunk_index}.json')
                with open(chunk_file, 'w') as f:
                    json.dump(chunk_data, f, separators=(',', ':'))
                
                chunks.append({
                    'index': chunk_index,
                    'count': len(chunk),
                    'file': f'posts/{shortcode}/chunk_{chunk_index}.json'
                })
                
                total_chunks += 1
            
            # Update index
            self.index_data['posts'][shortcode] = {
                'total_comments': len(comments),
                'chunks': chunks,
                'chunk_count': len(chunks)
            }
            
            total_comments += len(comments)
            
            if len(shortcode_comments) > 100 and len(self.index_data['posts']) % 100 == 0:
                print(f"  Processed {len(self.index_data['posts'])} posts...")
        
        self.index_data['stats']['total_posts'] = len(self.index_data['posts'])
        self.index_data['stats']['total_comments'] = total_comments
        self.index_data['stats']['total_chunks'] = total_chunks
        
        print(f"\nCreated {total_chunks} chunk files for {len(self.index_data['posts'])} posts")
        print(f"Total comments: {total_comments:,}")
    
    def create_index_files(self):
        """Create index files for efficient lookups"""
        print("\nCreating index files...")
        
        # Main index file
        index_file = os.path.join(self.output_dir, 'index.json')
        with open(index_file, 'w') as f:
            json.dump(self.index_data, f, separators=(',', ':'))
        
        # Create smaller index with just post list and counts
        post_list = []
        for shortcode, data in self.index_data['posts'].items():
            post_list.append({
                'shortcode': shortcode,
                'comment_count': data['total_comments']
            })
        
        post_list.sort(key=lambda x: x['comment_count'], reverse=True)
        
        summary_file = os.path.join(self.output_dir, 'summary.json')
        with open(summary_file, 'w') as f:
            json.dump({
                'posts': post_list,
                'stats': self.index_data['stats']
            }, f, separators=(',', ':'))
        
        print(f"Created index with {len(post_list)} posts")
    
    def create_loader_script(self):
        """Create a JavaScript module for loading comments"""
        loader_script = '''/**
 * Static Comment Database Loader
 * Loads comment data from chunked JSON files
 */
class CommentDatabase {
    constructor(databasePath) {
        this.databasePath = databasePath;
        this.index = null;
        this.cache = new Map();
    }
    
    async initialize() {
        try {
            const response = await fetch(`${this.databasePath}/index.json`);
            this.index = await response.json();
            console.log(`Loaded comment database: ${this.index.stats.total_posts} posts, ${this.index.stats.total_comments.toLocaleString()} comments`);
            return true;
        } catch (error) {
            console.error('Failed to load comment database index:', error);
            return false;
        }
    }
    
    async getCommentsForPost(shortcode, page = 1, limit = 50) {
        if (!this.index || !this.index.posts[shortcode]) {
            return { comments: [], total: 0, hasMore: false };
        }
        
        const postData = this.index.posts[shortcode];
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        
        // Determine which chunks we need
        const neededChunks = [];
        let currentIndex = 0;
        
        for (const chunk of postData.chunks) {
            const chunkEnd = currentIndex + chunk.count;
            if (currentIndex < endIndex && chunkEnd > startIndex) {
                neededChunks.push(chunk);
            }
            currentIndex = chunkEnd;
        }
        
        // Load needed chunks
        const comments = [];
        for (const chunk of neededChunks) {
            const chunkKey = `${shortcode}-${chunk.index}`;
            
            if (!this.cache.has(chunkKey)) {
                try {
                    const response = await fetch(`${this.databasePath}/${chunk.file}`);
                    const chunkData = await response.json();
                    this.cache.set(chunkKey, chunkData.comment_ids);
                } catch (error) {
                    console.error(`Failed to load chunk ${chunk.file}:`, error);
                    continue;
                }
            }
            
            comments.push(...this.cache.get(chunkKey));
        }
        
        // Return paginated results
        return {
            comments: comments.slice(startIndex % limit, (startIndex % limit) + limit),
            total: postData.total_comments,
            hasMore: endIndex < postData.total_comments
        };
    }
    
    getPostCommentCount(shortcode) {
        if (!this.index || !this.index.posts[shortcode]) {
            return 0;
        }
        return this.index.posts[shortcode].total_comments;
    }
    
    getAllPosts() {
        if (!this.index) return [];
        return Object.keys(this.index.posts);
    }
}

// Export for use in the app
window.CommentDatabase = CommentDatabase;
'''
        
        loader_file = os.path.join(self.output_dir, 'comment-database.js')
        with open(loader_file, 'w') as f:
            f.write(loader_script)
        
        print("Created comment-database.js loader script")
    
    def process(self):
        """Run the complete organization process"""
        print(f"Starting static comment organization...")
        print(f"Output directory: {self.output_dir}")
        
        # Clean output directory
        self.clean_output_directory()
        
        # Parse JSON files
        shortcode_comments = self.parse_json_files()
        
        # Deduplicate
        shortcode_comments = self.deduplicate_comments(shortcode_comments)
        
        # Create chunked files
        self.create_chunked_files(shortcode_comments)
        
        # Create index files
        self.create_index_files()
        
        # Create loader script
        self.create_loader_script()
        
        # Calculate size
        total_size = 0
        for root, dirs, files in os.walk(self.output_dir):
            for file in files:
                total_size += os.path.getsize(os.path.join(root, file))
        
        print(f"\n✅ Static comment database created successfully!")
        print(f"Total size: {total_size / 1024 / 1024:.1f} MB")
        print(f"Location: {self.output_dir}")
        print("\nTo use:")
        print("1. Copy the 'static-comments-db' folder to your web server")
        print("2. Include comment-database.js in your HTML")
        print("3. Initialize with: const db = new CommentDatabase('./static-comments-db')")

def main():
    comments_dir = "/Volumes/Crucial X9/MMInstaArchive/mm_ig_comments"
    organizer = StaticCommentOrganizer(comments_dir)
    organizer.process()

if __name__ == "__main__":
    main()