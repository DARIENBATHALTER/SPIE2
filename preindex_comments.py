#!/usr/bin/env python3
"""
Pre-index comments for faster browser loading
This script processes the comments.json file and creates indexed data structures
that can be loaded directly into IndexedDB without client-side processing.
"""

import json
import os
from collections import defaultdict

def load_data():
    """Load videos and comments data"""
    with open('data/videos.json', 'r', encoding='utf-8') as f:
        videos = json.load(f)
    
    with open('data/comments.json', 'r', encoding='utf-8') as f:
        comments = json.load(f)
    
    return videos, comments

def create_video_comment_index(comments):
    """Create an index mapping video_id to comment lists"""
    video_comments = defaultdict(list)
    
    for comment in comments:
        video_id = comment['video_id']
        video_comments[video_id].append(comment)
    
    # Convert defaultdict to regular dict and sort comments by likes (desc) then date (desc)
    indexed_comments = {}
    for video_id, comment_list in video_comments.items():
        # Sort by likes descending, then by date descending
        sorted_comments = sorted(comment_list, 
                               key=lambda x: (-x.get('like_count', 0), -x.get('published_at_timestamp', 0)))
        indexed_comments[video_id] = sorted_comments
    
    return indexed_comments

def create_search_index(comments):
    """Create a search index for faster text searches"""
    search_index = {}
    
    for comment in comments:
        comment_id = comment['comment_id']
        # Create searchable text from comment content and author
        searchable_text = f"{comment.get('text', '')} {comment.get('author_display_name', '')}".lower()
        
        # Split into words for indexing
        words = searchable_text.split()
        search_index[comment_id] = {
            'words': words,
            'text': comment.get('text', ''),
            'author': comment.get('author_display_name', ''),
            'video_id': comment['video_id'],
            'like_count': comment.get('like_count', 0),
            'published_at': comment.get('published_at', ''),
            'published_at_timestamp': comment.get('published_at_timestamp', 0)
        }
    
    return search_index

def create_word_frequency_index(comments):
    """Pre-compute word frequencies for each video"""
    import re
    from collections import Counter
    
    # Common English stop words
    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
        'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'between', 'among', 'throughout', 'alongside', 'towards',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
        'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
        'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
        'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'this', 'that', 'these', 'those', 'here', 'there', 'where', 'when', 'why', 'how',
        'what', 'who', 'which', 'whose', 'whom', 'not', 'no', 'yes', 'can', 'cant',
        'dont', 'wont', 'im', 'youre', 'hes', 'shes', 'were', 'theyre', 'ive', 'youve',
        'also', 'just', 'really', 'very', 'so', 'too', 'now', 'then', 'well', 'still'
    }
    
    video_word_freq = {}
    video_comments = defaultdict(list)
    
    # Group comments by video
    for comment in comments:
        video_comments[comment['video_id']].append(comment)
    
    for video_id, video_comment_list in video_comments.items():
        all_text = ' '.join([comment.get('text', '') for comment in video_comment_list])
        
        # Clean and tokenize text
        words = re.findall(r'\b[a-zA-Z]{3,}\b', all_text.lower())
        filtered_words = [word for word in words if word not in stop_words]
        
        # Count frequencies
        word_counts = Counter(filtered_words)
        
        # Get top 20 most frequent words
        top_words = word_counts.most_common(20)
        
        # Also compute liked words analysis
        liked_comments = sorted([c for c in video_comment_list if c.get('like_count', 0) > 0], 
                               key=lambda x: x.get('like_count', 0), reverse=True)
        
        top_20_percent = max(1, len(liked_comments) // 5)
        top_liked = liked_comments[:top_20_percent]
        
        if top_liked:
            liked_text = ' '.join([comment.get('text', '') for comment in top_liked])
            liked_words = re.findall(r'\b[a-zA-Z]{3,}\b', liked_text.lower())
            liked_filtered = [word for word in liked_words if word not in stop_words]
            
            # Calculate average likes per word
            word_like_totals = defaultdict(list)
            for comment in top_liked:
                comment_words = re.findall(r'\b[a-zA-Z]{3,}\b', comment.get('text', '').lower())
                for word in comment_words:
                    if word not in stop_words:
                        word_like_totals[word].append(comment.get('like_count', 0))
            
            liked_word_averages = []
            for word, like_counts in word_like_totals.items():
                if len(like_counts) >= 2:  # Word appears in at least 2 liked comments
                    avg_likes = round(sum(like_counts) / len(like_counts))
                    liked_word_averages.append((word, avg_likes, len(like_counts)))
            
            liked_word_averages.sort(key=lambda x: x[1], reverse=True)
            top_liked_words = liked_word_averages[:15]
        else:
            top_liked_words = []
        
        video_word_freq[video_id] = {
            'word_cloud': [{'word': word, 'count': count} for word, count in top_words],
            'liked_words': [{'word': word, 'avgLikes': avg, 'count': count} 
                           for word, avg, count in top_liked_words]
        }
    
    return video_word_freq

def main():
    print("🔄 Loading data...")
    videos, comments = load_data()
    
    print(f"📊 Processing {len(videos)} videos and {len(comments)} comments...")
    
    # Create indexes
    print("🔍 Creating video-comment index...")
    video_comments_index = create_video_comment_index(comments)
    
    print("🔍 Creating search index...")
    search_index = create_search_index(comments)
    
    print("🔍 Creating word frequency index...")
    word_freq_index = create_word_frequency_index(comments)
    
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Save indexed data
    print("💾 Saving indexed data...")
    
    with open('data/video_comments_index.json', 'w', encoding='utf-8') as f:
        json.dump(video_comments_index, f, ensure_ascii=False, separators=(',', ':'))
    
    with open('data/search_index.json', 'w', encoding='utf-8') as f:
        json.dump(search_index, f, ensure_ascii=False, separators=(',', ':'))
    
    with open('data/word_freq_index.json', 'w', encoding='utf-8') as f:
        json.dump(word_freq_index, f, ensure_ascii=False, separators=(',', ':'))
    
    # Calculate file sizes
    def get_file_size(filename):
        return os.path.getsize(filename) / (1024 * 1024)  # MB
    
    print(f"✅ Indexing complete!")
    print(f"📁 video_comments_index.json: {get_file_size('data/video_comments_index.json'):.1f} MB")
    print(f"📁 search_index.json: {get_file_size('data/search_index.json'):.1f} MB")  
    print(f"📁 word_freq_index.json: {get_file_size('data/word_freq_index.json'):.1f} MB")
    print(f"📁 Total indexed data: {get_file_size('data/video_comments_index.json') + get_file_size('data/search_index.json') + get_file_size('data/word_freq_index.json'):.1f} MB")

if __name__ == "__main__":
    main() 