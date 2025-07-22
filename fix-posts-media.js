/**
 * Fix posts media files by mapping them to the correct media files
 */

import fs from 'fs';

async function fixPostsMedia() {
    try {
        console.log('🔧 Fixing posts media files...');
        
        // Read current posts data
        const postsData = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8'));
        console.log(`📄 Loaded ${postsData.length} posts`);
        
        // Read media mapping
        const mediaMapping = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-media-mapping.json', 'utf8'));
        console.log(`🗂️ Loaded media mapping with ${Object.keys(mediaMapping).length} entries`);
        
        // Update each post with correct media files
        const updatedPosts = postsData.map((post, index) => {
            const postId = post.video_id; // This will be post_1, post_2, etc.
            
            console.log(`🔍 Processing ${postId}...`);
            
            // Check if we have media mapping for this post ID
            if (mediaMapping[postId]) {
                console.log(`✅ Found direct mapping for ${postId}`);
                const mediaFiles = mediaMapping[postId].map(media => ({
                    filename: media.filename,
                    type: media.type,
                    thumbnail: media.thumbnail || undefined
                }));
                
                return {
                    ...post,
                    media_files: mediaFiles
                };
            }
            
            // If no direct mapping, keep the generic filename but log it
            console.log(`⚠️ No mapping found for ${postId}, keeping generic filename`);
            return post;
        });
        
        // Save the updated posts data
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(updatedPosts, null, 2));
        console.log('✅ Posts media files fixed and saved!');
        
        // Show summary
        const postsWithMapping = updatedPosts.filter(post => 
            post.media_files.some(file => !file.filename.startsWith('post_'))
        );
        console.log(`📊 Summary: ${postsWithMapping.length}/${updatedPosts.length} posts now have real media files`);
        
        // List posts that still need mapping
        const postsNeedingMapping = updatedPosts.filter(post => 
            post.media_files.some(file => file.filename.startsWith('post_'))
        );
        
        if (postsNeedingMapping.length > 0) {
            console.log(`\n❗ Posts still needing media mapping:`);
            postsNeedingMapping.forEach(post => {
                console.log(`   - ${post.video_id}: ${post.title.substring(0, 50)}...`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error fixing posts media:', error);
    }
}

// Run the fix
fixPostsMedia();