/**
 * Fix media mapping to use actual files from instadata/posts directory
 */

import fs from 'fs';
import path from 'path';

async function fixMediaMapping() {
    try {
        console.log('🔧 Fixing media mapping...');
        
        // Read the posts directory to get actual files
        const postsDir = '/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/posts';
        const files = fs.readdirSync(postsDir);
        
        // Group files by date prefix
        const mediaByDate = {};
        files.forEach(filename => {
            if (filename.startsWith('.')) return; // Skip hidden files
            
            // Extract date prefix (e.g., "2025_06_12.08.06" from "2025_06_12.08.06...")
            const match = filename.match(/^(\d{4}_\d{2}_\d{2}\.\d{2}\.\d{2})/);
            if (match) {
                const datePrefix = match[1];
                if (!mediaByDate[datePrefix]) {
                    mediaByDate[datePrefix] = [];
                }
                mediaByDate[datePrefix].push(filename);
            }
        });
        
        console.log(`Found ${Object.keys(mediaByDate).length} unique dates`);
        
        // Read the current posts data
        const postsData = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8'));
        
        // Read the CSV to get the proper date mapping
        const csvData = fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/medicalmedium top 25 insta Posts.csv', 'utf8');
        
        // Simple CSV parsing for dates
        const lines = csvData.split('\n');
        const csvPosts = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            // Find the date field (should be third column)
            const parts = lines[i].split(',');
            if (parts.length >= 3) {
                const dateStr = parts[2].replace(/"/g, '').trim();
                csvPosts.push(dateStr);
            }
        }
        
        console.log(`Found ${csvPosts.length} posts in CSV`);
        
        // Function to convert CSV date to filename format
        function convertDateToFilenameFormat(csvDate) {
            try {
                const [datePart, timePart] = csvDate.split(', ');
                const [month, day, year] = datePart.split('/');
                const [time, period] = timePart.split(' ');
                const [hours, minutes] = time.split(':');
                
                let hour24 = parseInt(hours);
                if (period === 'PM' && hour24 !== 12) {
                    hour24 += 12;
                } else if (period === 'AM' && hour24 === 12) {
                    hour24 = 0;
                }
                
                const paddedMonth = month.padStart(2, '0');
                const paddedDay = day.padStart(2, '0');
                const paddedHour = hour24.toString().padStart(2, '0');
                const paddedMinutes = minutes.padStart(2, '0');
                
                return `${year}_${paddedMonth}_${paddedDay}.${paddedHour}.${paddedMinutes}`;
            } catch (error) {
                console.warn(`Could not convert date: ${csvDate}`);
                return null;
            }
        }
        
        // Update each post with correct media files
        postsData.forEach((post, index) => {
            if (index < csvPosts.length) {
                const csvDate = csvPosts[index];
                const filenamePrefix = convertDateToFilenameFormat(csvDate);
                
                if (filenamePrefix && mediaByDate[filenamePrefix]) {
                    const mediaFiles = [];
                    
                    mediaByDate[filenamePrefix].forEach(filename => {
                        if (filename.endsWith('.mp4')) {
                            mediaFiles.push({
                                type: 'video',
                                filename: filename,
                                thumbnail: filename.replace('.mp4', '.thumbnail.jpg')
                            });
                        } else if (!filename.includes('.thumbnail.')) {
                            mediaFiles.push({
                                type: 'image',
                                filename: filename
                            });
                        }
                    });
                    
                    post.media_files = mediaFiles;
                    console.log(`Updated ${post.video_id} with ${mediaFiles.length} media files`);
                } else {
                    console.warn(`No media found for ${post.video_id} (${csvDate} -> ${filenamePrefix})`);
                }
            }
        });
        
        // Save updated posts data
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(postsData, null, 2));
        console.log('✅ Updated posts with correct media files');
        
    } catch (error) {
        console.error('❌ Error fixing media mapping:', error);
    }
}

fixMediaMapping();