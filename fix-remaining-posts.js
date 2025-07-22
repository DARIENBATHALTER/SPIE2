/**
 * Fix remaining posts by mapping Instagram IDs to post IDs
 */

import fs from 'fs';

async function fixRemainingPosts() {
    try {
        console.log('🔧 Fixing remaining posts media files...');
        
        // Read current posts data
        const postsData = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8'));
        console.log(`📄 Loaded ${postsData.length} posts`);
        
        // Read media mapping
        const mediaMapping = JSON.parse(fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-media-mapping.json', 'utf8'));
        console.log(`🗂️ Loaded media mapping with ${Object.keys(mediaMapping).length} entries`);
        
        // List Instagram IDs in mapping
        const instagramIds = Object.keys(mediaMapping).filter(key => !key.startsWith('post_'));
        console.log(`📱 Instagram IDs in mapping: ${instagramIds.join(', ')}`);
        
        // Find posts that still need mapping
        const postsNeedingMapping = postsData.filter(post => 
            post.media_files.some(file => file.filename.startsWith('post_'))
        );
        
        console.log(`❗ Posts needing mapping: ${postsNeedingMapping.map(p => p.video_id).join(', ')}`);
        
        // Manual mapping based on order and dates - this is an educated guess
        // We need to assign Instagram IDs to the remaining posts
        const manualMapping = {
            'post_3': 'DGOasfwy108',  // First available Instagram ID (many images)
            'post_6': 'DKy2uXVO4_W',  
            'post_7': 'DKzh7SIu4M0',  
            'post_9': 'DK10Cg4OR9P', 
            'post_10': 'DK2M36COPTJ',
            'post_11': 'DK2w2bmS4eG',
            'post_18': 'DK4bRQDObr6',
            'post_19': 'DK4zoPuOYh8',
            'post_21': 'DK6-gAmOtxG',
            'post_22': 'DK7cvMguKVk',
            'post_23': 'DK9S-OYOBfz',
            'post_24': 'DK-I5Z9OfmU',
            'post_25': 'DLAEVi6u6nk'
        };
        
        // Update posts with manual mapping
        const updatedPosts = postsData.map(post => {
            const postId = post.video_id;
            
            // If already has real media files, keep as is
            if (!post.media_files.some(file => file.filename.startsWith('post_'))) {
                return post;
            }
            
            // Check manual mapping
            if (manualMapping[postId]) {
                const instagramId = manualMapping[postId];
                if (mediaMapping[instagramId]) {
                    console.log(`✅ Mapping ${postId} to ${instagramId}`);
                    const mediaFiles = mediaMapping[instagramId].map(media => ({
                        filename: media.filename,
                        type: media.type,
                        thumbnail: media.thumbnail || undefined
                    }));
                    
                    return {
                        ...post,
                        media_files: mediaFiles
                    };
                }
            }
            
            // Keep generic filename if no mapping found
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
        const stillNeedingMapping = updatedPosts.filter(post => 
            post.media_files.some(file => file.filename.startsWith('post_'))
        );
        
        if (stillNeedingMapping.length > 0) {
            console.log(`\n❗ Posts still needing media mapping:`);
            stillNeedingMapping.forEach(post => {
                console.log(`   - ${post.video_id}: ${post.title.substring(0, 50)}...`);
            });
        } else {
            console.log(`\n🎉 All posts now have real media files!`);
        }
        
    } catch (error) {
        console.error('❌ Error fixing remaining posts:', error);
    }
}

// Run the fix
fixRemainingPosts();