/**
 * Fix posts media mapping by matching timestamps from CSV and media filenames
 */

import fs from 'fs';

function parseDate(dateStr) {
    // Parse dates like "2/18/2025, 12:05:42 PM" 
    return new Date(dateStr);
}

function extractDateFromFilename(filename) {
    // Extract date from filenames like "2025_06_12.08.06505082772..." or "2023_01_23.07.43AQOqr..."
    const match = filename.match(/^(\d{4})_(\d{2})_(\d{2})\.(\d{2})\.(\d{2})/);
    if (match) {
        const [, year, month, day, hour, minute] = match;
        return new Date(`${month}/${day}/${year}, ${hour}:${minute}:00`);
    }
    return null;
}

function extractInstagramIdFromUrl(url) {
    // Extract Instagram ID from URLs like "https://www.instagram.com/medicalmedium/p/DGOasfwy108/"
    const match = url.match(/\/p\/([^\/]+)\//);
    if (match) return match[1];
    
    // Extract from reel URLs like "https://www.instagram.com/medicalmedium/reel/DKz_GA3SRcf/"
    const reelMatch = url.match(/\/reel\/([^\/]+)\//);
    if (reelMatch) return reelMatch[1];
    
    return null;
}

async function fixPostsByDate() {
    try {
        console.log('🔧 Fixing posts media mapping by date/time...');
        
        // Read the CSV file
        const csvData = fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/medicalmedium top 25 insta Posts.csv', 'utf8');
        const lines = csvData.split('\n');
        
        // Parse CSV posts with their Instagram IDs and timestamps
        const csvPosts = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            // Simple CSV parsing for the structure we know
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
                const instagramId = extractInstagramIdFromUrl(fields[1]);
                const createDate = parseDate(fields[2]);
                
                if (instagramId && createDate && !isNaN(createDate.getTime())) {
                    csvPosts.push({
                        instagramId,
                        createDate,
                        likes: parseInt(fields[3]) || 0,
                        comments: parseInt(fields[4]) || 0,
                        caption: fields[5] || ''
                    });
                }
            }
        }
        
        console.log(`📄 Parsed ${csvPosts.length} posts from CSV`);
        
        // Sort CSV posts by date (oldest first)
        csvPosts.sort((a, b) => a.createDate - b.createDate);
        
        // Get all media files and extract their dates
        const mediaFiles = fs.readdirSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/posts');
        const mediaWithDates = [];
        
        for (const filename of mediaFiles) {
            const fileDate = extractDateFromFilename(filename);
            if (fileDate && !isNaN(fileDate.getTime())) {
                mediaWithDates.push({
                    filename,
                    date: fileDate,
                    isVideo: filename.endsWith('.mp4'),
                    isThumbnail: filename.includes('.thumbnail.')
                });
            }
        }
        
        // Group media files by date/time
        const mediaGroups = {};
        for (const media of mediaWithDates) {
            const key = media.date.toISOString();
            if (!mediaGroups[key]) {
                mediaGroups[key] = [];
            }
            mediaGroups[key].push(media);
        }
        
        console.log(`📁 Found ${Object.keys(mediaGroups).length} media file groups`);
        
        // Read current posts data
        const postsData = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8'));
        
        // Create mapping based on chronological order
        const updatedPosts = postsData.map((post, index) => {
            if (index < csvPosts.length) {
                const csvPost = csvPosts[index];
                console.log(`📅 Mapping post_${index + 1} to ${csvPost.instagramId} (${csvPost.createDate.toLocaleString()})`);
                
                // Find media files that match this post's timestamp (within a reasonable range)
                const postTime = csvPost.createDate.getTime();
                let bestMatch = null;
                let smallestDiff = Infinity;
                
                for (const [dateKey, mediaGroup] of Object.entries(mediaGroups)) {
                    const mediaTime = new Date(dateKey).getTime();
                    const timeDiff = Math.abs(postTime - mediaTime);
                    
                    // Look for matches within 24 hours
                    if (timeDiff < 24 * 60 * 60 * 1000 && timeDiff < smallestDiff) {
                        smallestDiff = timeDiff;
                        bestMatch = mediaGroup;
                    }
                }
                
                if (bestMatch) {
                    // Create media files array from the matched group
                    const mediaFiles = bestMatch
                        .filter(m => !m.isThumbnail) // Exclude thumbnails from main list
                        .map(media => {
                            const result = {
                                filename: media.filename,
                                type: media.isVideo ? 'video' : 'image'
                            };
                            
                            // Add thumbnail if it exists
                            const thumbnail = bestMatch.find(m => 
                                m.isThumbnail && 
                                m.filename.startsWith(media.filename.replace('.mp4', ''))
                            );
                            if (thumbnail) {
                                result.thumbnail = thumbnail.filename;
                            }
                            
                            return result;
                        });
                    
                    // If no media files found, keep existing
                    if (mediaFiles.length > 0) {
                        return {
                            ...post,
                            media_files: mediaFiles
                        };
                    }
                }
                
                console.log(`⚠️ No matching media found for ${csvPost.instagramId}, keeping existing`);
            }
            
            return post;
        });
        
        // Save the updated posts data
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(updatedPosts, null, 2));
        console.log('✅ Posts media files fixed based on timestamps!');
        
        // Show summary
        const postsWithRealMedia = updatedPosts.filter(post => 
            post.media_files.some(file => !file.filename.startsWith('post_'))
        );
        console.log(`📊 Summary: ${postsWithRealMedia.length}/${updatedPosts.length} posts now have real media files`);
        
    } catch (error) {
        console.error('❌ Error fixing posts by date:', error);
    }
}

// Run the fix
fixPostsByDate();