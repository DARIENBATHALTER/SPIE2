/**
 * Fix posts media mapping using ONLY timestamps - no Instagram IDs
 * Maps posts to media files based purely on timestamp matching between:
 * - CSV create dates (e.g., "6/12/2025, 8:06:21 AM")
 * - Media filename timestamps (e.g., "2025_06_12.08.06")
 */

import fs from 'fs';

function parseCSVDate(dateStr) {
    // Parse dates like "6/12/2025, 8:06:21 AM" or "2/18/2025, 12:05:42 PM"
    return new Date(dateStr);
}

function extractTimestampFromFilename(filename) {
    // Extract timestamp from filenames like "2025_06_12.08.06505082772..." or "2023_01_23.07.43AQOqr..."
    const match = filename.match(/^(\d{4})_(\d{2})_(\d{2})\.(\d{2})\.(\d{2})/);
    if (match) {
        const [, year, month, day, hour, minute] = match;
        return new Date(`${month}/${day}/${year}, ${hour}:${minute}:00`);
    }
    return null;
}

function parseCSV(csvContent) {
    const lines = csvContent.split('\n');
    const posts = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV parsing
        const fields = [];
        let currentField = '';
        let insideQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                fields.push(currentField.trim().replace(/^"|"$/g, ''));
                currentField = '';
            } else {
                currentField += char;
            }
        }
        fields.push(currentField.trim().replace(/^"|"$/g, ''));
        
        if (fields.length >= 3) {
            const createDate = parseCSVDate(fields[2]);
            if (createDate && !isNaN(createDate.getTime())) {
                posts.push({
                    index: i - 1, // 0-based index for matching to post_X
                    createDate,
                    likes: parseInt(fields[3]) || 0,
                    comments: parseInt(fields[4]) || 0,
                    caption: fields[5] || ''
                });
            }
        }
    }
    
    return posts;
}

async function fixPostsTimestampOnly() {
    try {
        console.log('🔧 Fixing posts using ONLY timestamp matching...');
        
        // Read the CSV file
        const csvData = fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/medicalmedium top 25 insta Posts.csv', 'utf8');
        const csvPosts = parseCSV(csvData);
        
        console.log(`📄 Parsed ${csvPosts.length} posts from CSV`);
        
        // Get all media files and extract their timestamps
        const mediaFiles = fs.readdirSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/posts');
        const mediaWithTimestamps = [];
        
        for (const filename of mediaFiles) {
            const timestamp = extractTimestampFromFilename(filename);
            if (timestamp && !isNaN(timestamp.getTime())) {
                mediaWithTimestamps.push({
                    filename,
                    timestamp,
                    isVideo: filename.endsWith('.mp4'),
                    isThumbnail: filename.includes('.thumbnail.')
                });
            }
        }
        
        console.log(`📁 Found ${mediaWithTimestamps.length} media files with timestamps`);
        
        // Group media files by exact timestamp
        const mediaGroups = {};
        for (const media of mediaWithTimestamps) {
            const key = media.timestamp.toISOString();
            if (!mediaGroups[key]) {
                mediaGroups[key] = [];
            }
            mediaGroups[key].push(media);
        }
        
        console.log(`📊 Grouped into ${Object.keys(mediaGroups).length} timestamp groups`);
        
        // Read current posts data
        const postsData = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8'));
        
        // Create mapping based on CSV order and timestamp matching
        const updatedPosts = postsData.map((post, index) => {
            if (index < csvPosts.length) {
                const csvPost = csvPosts[index];
                console.log(`📅 Processing post_${index + 1} with CSV date: ${csvPost.createDate.toLocaleString()}`);
                
                // Find media files that match this post's timestamp
                const postTime = csvPost.createDate.getTime();
                let bestMatchGroup = null;
                let smallestTimeDiff = Infinity;
                
                for (const [timestampKey, mediaGroup] of Object.entries(mediaGroups)) {
                    const mediaTime = new Date(timestampKey).getTime();
                    const timeDiff = Math.abs(postTime - mediaTime);
                    
                    // Look for matches within 24 hours (86400000 ms)
                    if (timeDiff < 24 * 60 * 60 * 1000 && timeDiff < smallestTimeDiff) {
                        smallestTimeDiff = timeDiff;
                        bestMatchGroup = mediaGroup;
                    }
                }
                
                if (bestMatchGroup) {
                    console.log(`✅ Found media match for post_${index + 1} (time diff: ${Math.round(smallestTimeDiff / 60000)} minutes)`);
                    
                    // Create media files array from the matched group
                    const mediaFiles = bestMatchGroup
                        .filter(m => !m.isThumbnail) // Exclude thumbnails from main list
                        .map(media => {
                            const result = {
                                filename: media.filename,
                                type: media.isVideo ? 'video' : 'image'
                            };
                            
                            // Add thumbnail if it exists for videos
                            if (media.isVideo) {
                                const thumbnail = bestMatchGroup.find(m => 
                                    m.isThumbnail && 
                                    m.filename.startsWith(media.filename.replace('.mp4', ''))
                                );
                                if (thumbnail) {
                                    result.thumbnail = thumbnail.filename;
                                }
                            }
                            
                            return result;
                        });
                    
                    if (mediaFiles.length > 0) {
                        return {
                            ...post,
                            media_files: mediaFiles
                        };
                    }
                }
                
                console.log(`⚠️ No timestamp match found for post_${index + 1}, keeping existing`);
            }
            
            return post;
        });
        
        // Save the updated posts data
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(updatedPosts, null, 2));
        console.log('✅ Posts updated with timestamp-only mapping!');
        
        // Show summary
        const postsWithRealMedia = updatedPosts.filter(post => 
            post.media_files.some(file => !file.filename.startsWith('post_'))
        );
        console.log(`📊 Final Summary: ${postsWithRealMedia.length}/${updatedPosts.length} posts now have real media files`);
        
        // Show detailed mapping results
        console.log('\n📋 Mapping Results:');
        updatedPosts.forEach((post, index) => {
            const hasRealMedia = post.media_files.some(file => !file.filename.startsWith('post_'));
            const mediaCount = post.media_files.length;
            const status = hasRealMedia ? '✅' : '❌';
            console.log(`   ${status} ${post.video_id}: ${mediaCount} media file(s) - ${hasRealMedia ? 'MAPPED' : 'GENERIC'}`);
        });
        
    } catch (error) {
        console.error('❌ Error fixing posts with timestamp mapping:', error);
    }
}

// Run the fix
fixPostsTimestampOnly();