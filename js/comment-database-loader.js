/**
 * Comment Database Loader for new shortcode-based JSON structure
 * Loads comment data from individual JSON files organized by shortcode
 */
class CommentDatabaseLoader {
    constructor(archiveDirectoryHandle) {
        this.archiveHandle = archiveDirectoryHandle;
        this.commentsHandle = null;
        this.cache = new Map();
        this.baseUrl = null; // For file:// URLs when using local files
        this.availableShortcodes = new Set();
    }
    
    /**
     * Initialize the comment database loader
     */
    async initialize() {
        try {
            console.log('📁 Initializing comment database loader for new JSON structure...');
            
            // Navigate to mm_ig_comments folder (no "organized" subfolder)
            this.commentsHandle = await this.archiveHandle.getDirectoryHandle('mm_ig_comments');
            
            // Scan for available shortcode JSON files
            let totalFiles = 0;
            let totalComments = 0;
            
            for await (const [name, handle] of this.commentsHandle.entries()) {
                if (handle.kind === 'file' && name.endsWith('.json') && !name.startsWith('._')) {
                    const shortcode = name.replace('.json', '');
                    this.availableShortcodes.add(shortcode);
                    totalFiles++;
                    
                    // Sample a few files to get comment count estimate
                    if (totalFiles <= 5) {
                        try {
                            const file = await handle.getFile();
                            const data = JSON.parse(await file.text());
                            totalComments += Object.keys(data).length;
                        } catch (error) {
                            console.warn(`Warning: Could not parse ${name}:`, error);
                        }
                    }
                }
            }
            
            // Estimate total comments based on sample
            const estimatedTotalComments = totalFiles > 5 
                ? Math.round((totalComments / 5) * totalFiles) 
                : totalComments;
            
            console.log(`📊 Comment database loaded: ${totalFiles} shortcode files, ~${estimatedTotalComments.toLocaleString()} estimated comments`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize comment database:', error);
            return false;
        }
    }
    
    /**
     * Get comments for a specific post with pagination
     */
    async getCommentsForPost(shortcode, page = 1, limit = 50) {
        if (!this.availableShortcodes.has(shortcode)) {
            return { comments: [], total: 0, hasMore: false };
        }
        
        // Load all comments for this shortcode
        const allComments = await this.loadCommentsForShortcode(shortcode);
        
        // Apply pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedComments = allComments.slice(startIndex, endIndex);
        
        return {
            comments: paginatedComments,
            total: allComments.length,
            hasMore: endIndex < allComments.length
        };
    }
    
    /**
     * Load all comments for a specific shortcode from JSON file
     */
    async loadCommentsForShortcode(shortcode) {
        // Return from cache if available
        if (this.cache.has(shortcode)) {
            return this.cache.get(shortcode);
        }
        
        try {
            // Get the JSON file for this shortcode
            const fileName = `${shortcode}.json`;
            const fileHandle = await this.commentsHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const commentsData = JSON.parse(await file.text());
            
            // Convert from our JSON structure to comment array format expected by UI
            const comments = Object.entries(commentsData).map(([commentId, commentData]) => ({
                comment_id: commentId,
                id: commentId,
                text: commentData.text,
                content: commentData.text, // Alternate field name
                author: commentData.owner.username,
                owner: commentData.owner,
                created_at: commentData.created_at,
                published_at: new Date(commentData.created_at),
                commentAt: new Date(commentData.created_at),
                like_count: 0, // Not available in our data
                reactionsCount: 0, // Not available in our data
                is_reply: false, // Not easily determined from our data
                depth: 0 // Not available in our data
            }));
            
            // Sort by creation date (newest first)
            comments.sort((a, b) => b.published_at - a.published_at);
            
            // Cache the processed comments
            this.cache.set(shortcode, comments);
            
            // Track total comments loaded and report progress
            this.totalCommentsLoaded = (this.totalCommentsLoaded || 0) + comments.length;
            
            // Report progress to the main app if available (throttled)
            if (window.app && window.app.updateCommentLoadingProgress) {
                window.app.updateCommentLoadingProgress(this.totalCommentsLoaded, fileName);
            } else {
                // Only log every 100 files to avoid console spam
                if (!this.logCounter) this.logCounter = 0;
                this.logCounter++;
                if (this.logCounter % 100 === 0 || this.logCounter === 1) {
                    console.log(`📄 Loaded ${this.logCounter} files (${this.totalCommentsLoaded} total comments) - no progress handler found`);
                }
            }
            
            return comments;
        } catch (error) {
            console.error(`❌ Failed to load comments for ${shortcode}:`, error);
            return [];
        }
    }
    
    /**
     * Get comment count for a specific post
     */
    async getPostCommentCount(shortcode) {
        if (!this.availableShortcodes.has(shortcode)) {
            return 0;
        }
        
        try {
            const comments = await this.loadCommentsForShortcode(shortcode);
            return comments.length;
        } catch (error) {
            console.error(`Error getting comment count for ${shortcode}:`, error);
            return 0;
        }
    }
    
    /**
     * Get all posts that have comments
     */
    getAllPostsWithComments() {
        return Array.from(this.availableShortcodes);
    }
    
    /**
     * Get database statistics
     */
    getStats() {
        return {
            total_posts: this.availableShortcodes.size,
            total_comments: 'Unknown', // Would need to load all files to count
            total_shortcodes: this.availableShortcodes.size
        };
    }
    
    /**
     * Search for posts with comments containing specific text
     */
    async searchComments(query, maxResults = 100) {
        const results = [];
        const searchLower = query.toLowerCase();
        let checkedCount = 0;
        const maxToCheck = 50; // Limit how many files we search for performance
        
        console.log(`🔍 Searching for "${query}" across comment files...`);
        
        for (const shortcode of this.availableShortcodes) {
            if (checkedCount >= maxToCheck || results.length >= maxResults) break;
            
            try {
                const comments = await this.loadCommentsForShortcode(shortcode);
                const matchingComments = comments.filter(comment => 
                    comment.text.toLowerCase().includes(searchLower) ||
                    comment.author.toLowerCase().includes(searchLower)
                );
                
                if (matchingComments.length > 0) {
                    results.push({
                        shortcode,
                        comments: matchingComments,
                        totalComments: comments.length
                    });
                }
                
                checkedCount++;
            } catch (error) {
                console.warn(`Error searching comments for ${shortcode}:`, error);
            }
        }
        
        console.log(`🔍 Search complete: found ${results.length} posts with matching comments`);
        return results;
    }
    
    /**
     * Load comments for multiple shortcodes concurrently in batches
     * This significantly improves performance when loading many posts
     */
    async loadCommentsForShortcodesBatch(shortcodes, batchSize = 50) {
        if (!Array.isArray(shortcodes) || shortcodes.length === 0) {
            return {};
        }
        
        console.log(`🚀 Loading comments for ${shortcodes.length} posts in batches of ${batchSize}...`);
        
        const results = {};
        const batches = [];
        
        // Split shortcodes into batches
        for (let i = 0; i < shortcodes.length; i += batchSize) {
            batches.push(shortcodes.slice(i, i + batchSize));
        }
        
        // Process each batch concurrently
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            const batchNumber = batchIndex + 1;
            
            console.log(`📦 Processing batch ${batchNumber}/${batches.length} (${batch.length} posts)...`);
            
            try {
                // Load all posts in this batch concurrently
                const batchPromises = batch.map(async (shortcode) => {
                    try {
                        const comments = await this.loadCommentsForShortcode(shortcode);
                        return { shortcode, comments, success: true };
                    } catch (error) {
                        console.warn(`⚠️ Failed to load comments for ${shortcode}:`, error.message);
                        return { shortcode, comments: [], success: false, error };
                    }
                });
                
                // Wait for all posts in this batch to complete
                const batchResults = await Promise.all(batchPromises);
                
                // Collect results
                let successCount = 0;
                for (const result of batchResults) {
                    results[result.shortcode] = result.comments;
                    if (result.success) successCount++;
                }
                
                console.log(`✅ Batch ${batchNumber} complete: ${successCount}/${batch.length} successful`);
                
            } catch (error) {
                console.error(`❌ Error processing batch ${batchNumber}:`, error);
                // Continue with next batch even if this one fails
            }
        }
        
        const successfulLoads = Object.keys(results).filter(key => results[key].length >= 0).length;
        console.log(`🎉 Batch loading complete: ${successfulLoads}/${shortcodes.length} posts loaded successfully`);
        
        return results;
    }
    
    /**
     * Preload comments for all posts with comments (for faster subsequent access)
     */
    async preloadAllComments(progressCallback = null) {
        const shortcodes = Array.from(this.availableShortcodes);
        console.log(`🔄 Preloading comments for ${shortcodes.length} posts...`);
        
        const batchSize = 25; // Smaller batches for preloading to avoid overwhelming the system
        const results = await this.loadCommentsForShortcodesBatch(shortcodes, batchSize);
        
        if (progressCallback) {
            progressCallback('Comments preloaded', 100);
        }
        
        console.log(`✅ Preloading complete: ${Object.keys(results).length} posts cached`);
        return results;
    }
    
    /**
     * Clear the cache to free memory
     */
    clearCache() {
        this.cache.clear();
        console.log('🧹 Comment cache cleared');
    }
}

// Export for use in other modules
window.CommentDatabaseLoader = CommentDatabaseLoader;