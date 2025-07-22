/**
 * Archive Directory Manager - Handles the mm_instagram_archive folder structure
 * Replaces the old DirectoryManager for the new organized archive format
 */
class ArchiveDirectoryManager {
    constructor() {
        this.archiveHandle = null;
        this.isSupported = this.checkSupport();
        this.mediaFiles = new Map();
        this.csvData = null;
        this.commentLoader = null;
        
        console.log(`📁 ArchiveDirectoryManager initialized - API supported: ${this.isSupported}`);
    }

    /**
     * Check if File System Access API is supported
     */
    checkSupport() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Request the mm_instagram_archive directory from user
     */
    async requestArchiveDirectory() {
        if (!this.isSupported) {
            throw new Error('File System Access API not supported in this browser');
        }

        try {
            this.archiveHandle = await window.showDirectoryPicker({
                mode: 'read',
                startIn: 'documents'
            });
            
            console.log(`📁 Archive directory selected: ${this.archiveHandle.name}`);
            
            // Validate it's the correct archive structure
            const validation = await this.validateArchiveStructure();
            if (!validation.isValid) {
                throw new Error(`Invalid archive structure: ${validation.error}`);
            }
            
            return this.archiveHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Directory selection was cancelled');
            }
            throw error;
        }
    }

    /**
     * Validate the archive has the expected structure
     */
    async validateArchiveStructure() {
        try {
            // Check for required folders and files
            const requiredItems = [
                { name: 'mm_ig_posts_reels', type: 'directory' },
                { name: 'mm_ig_metadata.csv', type: 'file' },
                { name: 'mm_ig_comments', type: 'directory' }
            ];

            for (const item of requiredItems) {
                try {
                    if (item.type === 'directory') {
                        await this.archiveHandle.getDirectoryHandle(item.name);
                    } else {
                        await this.archiveHandle.getFileHandle(item.name);
                    }
                } catch (error) {
                    return {
                        isValid: false,
                        error: `Missing required ${item.type}: ${item.name}`
                    };
                }
            }

            // Check if new comment JSON files exist
            try {
                const commentsHandle = await this.archiveHandle.getDirectoryHandle('mm_ig_comments');
                // Count JSON files to verify comment data exists
                let jsonFileCount = 0;
                for await (const [name, handle] of commentsHandle.entries()) {
                    if (handle.kind === 'file' && name.endsWith('.json')) {
                        jsonFileCount++;
                        if (jsonFileCount >= 5) break; // Just verify some exist
                    }
                }
                if (jsonFileCount > 0) {
                    console.log(`✅ Found comment database with ${jsonFileCount}+ shortcode files`);
                } else {
                    console.warn('⚠️ No comment JSON files found - comments may need to be processed');
                }
            } catch (error) {
                console.warn('⚠️ Comment database not found - comments may need to be processed');
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: `Archive validation failed: ${error.message}`
            };
        }
    }

    /**
     * Load all archive data
     */
    async loadArchiveData(progressCallback) {
        if (!this.archiveHandle) {
            throw new Error('No archive directory selected');
        }

        console.log('📁 Loading Instagram archive data...');
        
        try {
            // Load metadata CSV
            progressCallback?.('Loading post metadata...', 20);
            await this.loadMetadata();
            
            // Scan media files
            progressCallback?.('Scanning media files...', 40);
            await this.scanMediaFiles();
            
            // Initialize comment loader
            progressCallback?.('Loading comment database...', 60);
            await this.loadCommentDatabase();
            
            progressCallback?.('Archive loaded successfully', 100);
            
            console.log(`📊 Archive loaded: ${this.csvData?.length || 0} posts, ${this.mediaFiles.size} media files`);
            
            return {
                metadata: this.csvData,
                mediaFiles: this.mediaFiles,
                commentLoader: this.commentLoader,
                totalPosts: this.csvData?.length || 0,
                totalMedia: this.mediaFiles.size
            };
            
        } catch (error) {
            console.error('❌ Failed to load archive data:', error);
            throw error;
        }
    }

    /**
     * Load the metadata CSV file
     */
    async loadMetadata() {
        try {
            const csvHandle = await this.archiveHandle.getFileHandle('mm_ig_metadata.csv');
            const csvFile = await csvHandle.getFile();
            this.csvData = await this.parseCSV(csvFile);
            console.log(`📊 Loaded ${this.csvData.length} posts from metadata`);
        } catch (error) {
            console.error('❌ Failed to load metadata:', error);
            throw new Error('Could not load post metadata');
        }
    }

    /**
     * Scan the media files directory
     */
    async scanMediaFiles() {
        try {
            const mediaHandle = await this.archiveHandle.getDirectoryHandle('mm_ig_posts_reels');
            await this.scanDirectoryRecursive(mediaHandle, 'mm_ig_posts_reels');
            console.log(`📁 Found ${this.mediaFiles.size} media files`);
        } catch (error) {
            console.error('❌ Failed to scan media files:', error);
            throw new Error('Could not scan media files');
        }
    }

    /**
     * Initialize the comment database loader
     */
    async loadCommentDatabase() {
        try {
            this.commentLoader = new CommentDatabaseLoader(this.archiveHandle);
            const success = await this.commentLoader.initialize();
            
            if (success) {
                const stats = this.commentLoader.getStats();
                console.log(`💬 Comment database ready: ${stats.total_comments.toLocaleString()} comments across ${stats.total_posts} posts`);
            } else {
                console.warn('⚠️ Comment database not available');
            }
        } catch (error) {
            console.warn('⚠️ Failed to load comment database:', error);
            this.commentLoader = null;
        }
    }

    /**
     * Recursively scan directory for media files
     */
    async scanDirectoryRecursive(dirHandle, path) {
        for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = `${path}/${name}`;
            
            if (handle.kind === 'file') {
                const file = await handle.getFile();
                
                // Check if it's a media file
                if (this.isMediaFile(name)) {
                    // Extract shortcode from filename (assuming format like shortcode.mp4)
                    const shortcode = this.extractShortcodeFromFilename(name);
                    if (shortcode) {
                        this.mediaFiles.set(shortcode, {
                            file,
                            handle,
                            path: fullPath,
                            name,
                            size: file.size,
                            type: file.type
                        });
                    }
                }
            } else if (handle.kind === 'directory') {
                await this.scanDirectoryRecursive(handle, fullPath);
            }
        }
    }

    /**
     * Check if file is a media file
     */
    isMediaFile(filename) {
        const mediaExtensions = ['.mp4', '.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return mediaExtensions.includes(ext);
    }

    /**
     * Extract shortcode from filename
     */
    extractShortcodeFromFilename(filename) {
        // Remove extension
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        
        // Handle different filename formats:
        // Format 1: Standard shortcode (11 chars): BmnmJZMhgFC.mp4
        // Format 2: With timestamp: -1VZ0EyJxy_2015_12_03__09_40_14.jpg
        
        // Try format 2 first (with timestamp)
        const timestampPattern = /^([A-Za-z0-9_-]+)_\d{4}_\d{2}_\d{2}__\d{2}_\d{2}_\d{2}$/;
        let match = nameWithoutExt.match(timestampPattern);
        if (match) {
            return match[1]; // Return the shortcode part before the timestamp
        }
        
        // Try format 1 (standard shortcode)
        const shortcodePattern = /^([A-Za-z0-9_-]{11})$/;
        match = nameWithoutExt.match(shortcodePattern);
        if (match) {
            return match[1];
        }
        
        // Fallback: use the first part before any underscore or the whole name
        const parts = nameWithoutExt.split('_');
        return parts[0] || nameWithoutExt;
    }

    /**
     * Parse CSV file - handles multi-line quoted fields properly
     */
    async parseCSV(file) {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        
        const data = [];
        let i = 1;
        
        while (i < lines.length) {
            if (!lines[i].trim()) {
                i++;
                continue;
            }
            
            // Parse potentially multi-line record
            const record = this.parseCSVRecord(lines, i);
            if (record.values && record.values.length === headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = record.values[index] || '';
                });
                data.push(row);
            }
            
            i = record.nextIndex;
        }
        
        // Remove last 2 lines (math calculations)
        if (data.length >= 2) {
            data.splice(-2, 2);
        }
        
        console.log(`📊 Parsed ${data.length} posts from CSV (${lines.length} total lines, excluded last 2 calculation lines)`);
        return data;
    }

    /**
     * Parse a CSV record that might span multiple lines
     */
    parseCSVRecord(lines, startIndex) {
        let currentLine = startIndex;
        let fullRecord = lines[currentLine];
        
        // Count quotes to see if we have an incomplete quoted field
        let quoteCount = (fullRecord.match(/"/g) || []).length;
        
        // If odd number of quotes, we have an unclosed quoted field
        while (quoteCount % 2 !== 0 && currentLine + 1 < lines.length) {
            currentLine++;
            fullRecord += '\n' + lines[currentLine];
            quoteCount += (lines[currentLine].match(/"/g) || []).length;
        }
        
        return {
            values: this.parseCSVLine(fullRecord),
            nextIndex: currentLine + 1
        };
    }

    /**
     * Simple CSV line parser
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        
        // Clean up quoted values
        return result.map(value => {
            if (value.startsWith('"') && value.endsWith('"')) {
                return value.slice(1, -1);
            }
            return value;
        });
    }

    /**
     * Get file URL for a media file
     */
    async getFileURL(shortcode) {
        const mediaInfo = this.mediaFiles.get(shortcode);
        if (!mediaInfo) return null;
        
        return URL.createObjectURL(mediaInfo.file);
    }

    /**
     * Get comments for a post
     */
    async getCommentsForPost(shortcode, page = 1, limit = 50) {
        if (!this.commentLoader) {
            return { comments: [], total: 0, hasMore: false };
        }
        
        return await this.commentLoader.getCommentsForPost(shortcode, page, limit);
    }

    /**
     * Get comment count for a post
     */
    getPostCommentCount(shortcode) {
        if (!this.commentLoader) return 0;
        return this.commentLoader.getPostCommentCount(shortcode);
    }

    /**
     * Get the name of the selected directory
     */
    getDirectoryName() {
        return this.archiveHandle?.name || 'Unknown Directory';
    }

    /**
     * Get posts data for DataManager compatibility
     */
    getPostsData() {
        return this.csvData || [];
    }

    /**
     * Get media files map for DataManager compatibility
     */
    getMediaFiles() {
        return this.mediaFiles;
    }
}

// Export for use in other modules
window.ArchiveDirectoryManager = ArchiveDirectoryManager;