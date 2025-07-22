import { InstagramDataParser } from './js/instagram-data-parser.js';
import fs from 'fs/promises';
import path from 'path';

async function processInstagramData() {
    const parser = new InstagramDataParser();
    
    try {
        console.log('Loading Instagram posts data...');
        // Load main posts CSV
        const postsCSV = await fs.readFile('./instadata/medicalmedium top 25 insta Posts.csv', 'utf-8');
        await parser.loadPostsData(postsCSV);
        
        console.log('Matching media files...');
        // Get list of media files
        const mediaFiles = await fs.readdir('./instadata/posts');
        await parser.matchMediaFiles(mediaFiles);
        
        console.log('Loading comment files...');
        // Load all comment files
        const commentFiles = {};
        const files = await fs.readdir('./instadata');
        
        for (const file of files) {
            if (file.includes('comments.csv')) {
                const content = await fs.readFile(path.join('./instadata', file), 'utf-8');
                commentFiles[file] = content;
            }
        }
        
        await parser.loadComments(commentFiles);
        
        // Get all data
        const data = parser.getData();
        
        console.log('Writing output files...');
        // Write posts data (similar to videos.json)
        await fs.writeFile(
            './data/instagram-posts.json',
            JSON.stringify(parser.toVideosFormat(), null, 2)
        );
        
        // Write comments data
        await fs.writeFile(
            './data/instagram-comments.json',
            JSON.stringify(data.comments, null, 2)
        );
        
        // Write media mapping
        await fs.writeFile(
            './data/instagram-media-mapping.json',
            JSON.stringify(data.mediaMapping, null, 2)
        );
        
        // Write raw posts data with all fields
        await fs.writeFile(
            './data/instagram-posts-full.json',
            JSON.stringify(data.posts, null, 2)
        );
        
        console.log('Data processing complete!');
        console.log(`Processed ${data.posts.length} posts`);
        console.log(`Matched ${Object.keys(data.mediaMapping).length} posts to media files`);
        console.log(`Loaded comments for ${Object.keys(data.comments).length} posts`);
        
    } catch (error) {
        console.error('Error processing Instagram data:', error);
    }
}

// Run the processor
processInstagramData();