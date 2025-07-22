/**
 * DirectoryManager - Handles local directory access using File System Access API
 * Provides fallback instructions for browsers that don't support the API
 * Updated for Instagram Archive format
 */
class DirectoryManager {
    constructor() {
        this.directoryHandle = null;
        this.isSupported = this.checkSupport();
        this.mediaFiles = new Map();
        this.csvData = null;
        this.dbData = null;
        
        console.log(`📁 DirectoryManager initialized - API supported: ${this.isSupported}`);
    }

    /**
     * Check if File System Access API is supported
     */
    checkSupport() {
        return 'showDirectoryPicker' in window;
    }

    /**
     * Request directory access from user
     */
    async requestDirectory() {
        if (!this.isSupported) {
            throw new Error('File System Access API not supported in this browser');
        }

        try {
            this.directoryHandle = await window.showDirectoryPicker({
                mode: 'read',
                startIn: 'documents'
            });
            
            console.log(`📁 Directory selected: ${this.directoryHandle.name}`);
            return this.directoryHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Directory selection was cancelled');
            }
            throw error;
        }
    }

    /**
     * Scan directory for Instagram archive files and metadata
     */
    async scanDirectory() {
        if (!this.directoryHandle) {
            throw new Error('No directory selected');
        }

        console.log('📁 Scanning directory for Instagram archive files...');
        
        // Clear previous scan results
        this.mediaFiles.clear();
        this.csvData = null;
        this.dbData = null;

        // First validate directory structure
        const validation = await this.validateArchiveStructure();
        if (!validation.isValid) {
            throw new Error(`Invalid archive structure: ${validation.error}`);
        }

        // Scan for media files
        await this.scanDirectoryRecursive(this.directoryHandle, '');
        
        // Load CSV metadata
        try {
            const csvHandle = await this.directoryHandle.getFileHandle('medicalmedium_metadata.csv');
            const csvFile = await csvHandle.getFile();
            this.csvData = await this.parseCSV(csvFile);
            console.log(`📊 Loaded ${this.csvData.length} posts from CSV`);
        } catch (error) {
            console.warn('⚠️ Could not load CSV metadata:', error);
        }

        // Load SQLite database
        try {
            const dbHandle = await this.directoryHandle.getFileHandle('comments.db');
            const dbFile = await dbHandle.getFile();
            console.log(`🗄️ Loading comments database (${(dbFile.size / 1024 / 1024).toFixed(1)}MB)`);
            
            // Load SQLite database using sql.js
            await this.loadSQLiteDatabase(dbFile);
            console.log(`💬 Loaded comments from SQLite database`);
        } catch (error) {
            console.warn('⚠️ Could not load comments database:', error);
        }
        
        console.log(`📁 Scan complete - Found ${this.mediaFiles.size} media files`);
        
        return {
            mediaFiles: this.mediaFiles,
            csvData: this.csvData,
            totalPosts: this.csvData?.length || 0,
            totalMedia: this.mediaFiles.size
        };
    }

    /**
     * Validate Instagram archive directory structure
     */
    async validateArchiveStructure() {
        try {
            // Check for required files
            const requiredFiles = ['medicalmedium_metadata.csv', 'comments.db'];
            const missingFiles = [];

            for (const fileName of requiredFiles) {
                try {
                    await this.directoryHandle.getFileHandle(fileName);
                } catch (error) {
                    if (fileName !== 'comments.db') { // comments.db is optional
                        missingFiles.push(fileName);
                    }
                }
            }

            if (missingFiles.length > 0) {
                return {
                    isValid: false,
                    error: `Missing required files: ${missingFiles.join(', ')}`
                };
            }

            return { isValid: true };
        } catch (error) {
            return {
                isValid: false,
                error: `Directory validation failed: ${error.message}`
            };
        }
    }

    /**
     * Recursively scan directory for media files
     */
    async scanDirectoryRecursive(dirHandle, currentPath) {
        for await (const [name, handle] of dirHandle.entries()) {
            const fullPath = currentPath ? `${currentPath}/${name}` : name;

            if (handle.kind === 'file') {
                // More robust extension checking
                const nameLower = name.toLowerCase();
                const extension = nameLower.includes('.') ? nameLower.split('.').pop() : '';
                
                // Check for Instagram media files (images and videos)
                const mediaExtensions = ['jpg', 'jpeg', 'png', 'mp4', 'webm', 'mov'];
                
                if (mediaExtensions.includes(extension)) {
                    // Parse shortcode from filename (format: shortcode_YYYY_MM_DD__HH_MM_SS.ext)
                    const shortcode = this.extractShortcodeFromFilename(name);
                    if (shortcode) {
                        this.mediaFiles.set(shortcode, {
                            handle: handle,
                            filename: name,
                            path: fullPath,
                            extension: extension,
                            type: ['mp4', 'webm', 'mov'].includes(extension) ? 'video' : 'image'
                        });
                    }
                } else if (!name.startsWith('.') && !['csv', 'db'].includes(extension)) {
                    // Log non-media files for debugging (skip hidden files and metadata)
                    console.log(`📄 Skipping file: ${fullPath} (extension: ${extension})`);
                }
            } else if (handle.kind === 'directory' && !name.startsWith('.')) {
                console.log(`📁 Scanning subdirectory: ${fullPath}`);
                // Recursively scan subdirectories (skip hidden directories)
                await this.scanDirectoryRecursive(handle, fullPath);
            }
        }
    }

    /**
     * Extract shortcode from Instagram filename
     * Format: shortcode_YYYY_MM_DD__HH_MM_SS.ext
     */
    extractShortcodeFromFilename(filename) {
        // Remove extension
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
        
        // Pattern: shortcode_date_time
        const match = nameWithoutExt.match(/^([^_]+)_\d{4}_\d{2}_\d{2}__\d{2}_\d{2}_\d{2}/);
        
        return match ? match[1] : null;
    }

    /**
     * Parse CSV metadata file with proper handling of quoted fields
     */
    async parseCSV(csvFile) {
        const text = await csvFile.text();
        const lines = text.split('\n');
        
        // Parse headers more carefully
        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        console.log(`📊 CSV headers:`, headers);
        
        const data = [];
        let skippedRows = 0;
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                const values = this.parseCSVLine(line);
                
                // More flexible validation - must have at least the critical fields
                if (values.length >= 3) { // At least shortcode, post URL, and one other field
                    const row = {};
                    headers.forEach((header, index) => {
                        // Clean the value - remove surrounding quotes and trim
                        let value = values[index] || '';
                        if (value.startsWith('"') && value.endsWith('"')) {
                            value = value.slice(1, -1);
                        }
                        row[header] = value.trim();
                    });
                    
                    // Validate that this row has essential data
                    if (row.Shortcode && row.Shortcode.length > 0) {
                        data.push(row);
                    } else {
                        skippedRows++;
                        if (skippedRows <= 5) {
                            console.warn(`⚠️ Skipping row ${i} - missing shortcode:`, values);
                        }
                    }
                } else {
                    skippedRows++;
                    if (skippedRows <= 5) {
                        console.warn(`⚠️ Skipping row ${i} - insufficient columns (${values.length}/${headers.length}):`, values);
                    }
                }
            } catch (error) {
                skippedRows++;
                if (skippedRows <= 5) {
                    console.warn(`⚠️ Error parsing row ${i}:`, error.message);
                }
            }
        }
        
        console.log(`📊 CSV parsed: ${data.length} valid rows, ${skippedRows} skipped`);
        
        if (data.length > 0) {
            console.log(`📊 Sample row:`, data[0]);
        }
        
        return data;
    }

    /**
     * Parse a single CSV line handling quoted fields with proper escape handling
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote inside quoted field
                    current += '"';
                    i += 2; // Skip both quotes
                    continue;
                } else {
                    // Start or end of quoted field
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current);
                current = '';
            } else {
                current += char;
            }
            
            i++;
        }
        
        // Add the last field
        result.push(current);
        
        return result;
    }

    /**
     * Get media file as blob URL by shortcode
     */
    async getMediaBlob(shortcode) {
        console.log(`🔍 Looking for media file with shortcode: "${shortcode}"`);
        
        const mediaFile = this.mediaFiles.get(shortcode);
        
        if (!mediaFile) {
            // Debug: Show available shortcodes
            console.log('📁 Available media files in directory:');
            for (const [code, file] of this.mediaFiles.entries()) {
                console.log(`  - "${code}" -> ${file.filename}`);
            }
            throw new Error(`Media file not found for shortcode: ${shortcode}`);
        }

        const file = await mediaFile.handle.getFile();
        console.log(`✅ Successfully loaded ${mediaFile.type} file: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        return {
            url: URL.createObjectURL(file),
            type: mediaFile.type,
            filename: mediaFile.filename
        };
    }





    /**
     * Check if directory has been selected
     */
    isDirectorySelected() {
        return this.directoryHandle !== null;
    }

    /**
     * Get directory name
     */
    getDirectoryName() {
        return this.directoryHandle?.name || 'No directory selected';
    }

    /**
     * Load SQLite database using sql.js
     */
    async loadSQLiteDatabase(dbFile) {
        try {
            // Initialize sql.js
            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });
            
            // Read database file as array buffer
            const dbBuffer = await dbFile.arrayBuffer();
            const db = new SQL.Database(new Uint8Array(dbBuffer));
            
            // Store database instance
            this.sqliteDb = db;
            
            // Test query to get comment count
            const result = db.exec("SELECT COUNT(*) as count FROM comments");
            const commentCount = result[0]?.values[0]?.[0] || 0;
            console.log(`📊 SQLite database loaded with ${commentCount.toLocaleString()} comments`);
            
            return db;
        } catch (error) {
            console.error('❌ Failed to load SQLite database:', error);
            throw error;
        }
    }

    /**
     * Get comments for a specific shortcode from SQLite database
     */
    getCommentsForShortcode(shortcode) {
        if (!this.sqliteDb) {
            console.warn('SQLite database not loaded');
            return [];
        }

        try {
            const result = this.sqliteDb.exec(`
                SELECT comment_data 
                FROM comments 
                WHERE shortcode = ? 
                ORDER BY id
            `, [shortcode]);
            
            if (result.length === 0) {
                return [];
            }
            
            const comments = [];
            result[0].values.forEach(row => {
                try {
                    const commentData = JSON.parse(row[0]);
                    
                    // Debug the actual structure of commentData for the first few comments
                    if (comments.length < 3) {
                        console.log(`🔍 Debug comment data structure for ${shortcode}:`, commentData);
                        console.log(`🔍 Available keys:`, Object.keys(commentData));
                    }
                    
                    // Try multiple possible field names for text content
                    const text = commentData.text || 
                                commentData.content || 
                                commentData.comment || 
                                commentData.body || 
                                commentData.message || 
                                '';
                    
                    // Try multiple possible field names for author
                    const author = commentData.author || 
                                  commentData.username || 
                                  commentData.user || 
                                  commentData.name || 
                                  commentData.owner || 
                                  'Anonymous';
                    
                    // Try multiple possible field names for likes
                    const likes = parseInt(
                        commentData.like_count || 
                        commentData.likes || 
                        commentData.reactions || 
                        commentData.thumbsUp || 
                        0
                    );
                    
                    // Try multiple possible field names for timestamp
                    const timestamp = commentData.timestamp || 
                                     commentData.created_at || 
                                     commentData.date || 
                                     commentData.published_at || 
                                     commentData.time || 
                                     Date.now();
                    
                    // Convert to our expected format
                    const processedComment = {
                        id: commentData.id || `comment_${Date.now()}_${Math.random()}`,
                        text: text,
                        author: author,
                        like_count: likes,
                        published_at: new Date(timestamp),
                        is_reply: Boolean(commentData.is_reply || commentData.parent_id),
                        parent_comment_id: commentData.parent_id || null
                    };
                    
                    comments.push(processedComment);
                    
                } catch (parseError) {
                    console.warn('Failed to parse comment data:', parseError, 'Raw data:', row[0]);
                }
            });
            
            if (comments.length > 0) {
                console.log(`📝 Found ${comments.length} comments for shortcode ${shortcode}`);
                console.log(`📝 Sample comment:`, comments[0]);
            }
            return comments;
        } catch (error) {
            console.error('❌ Failed to query comments:', error);
            return [];
        }
    }

    /**
     * Get all posts data with media files
     */
    getPostsData() {
        if (!this.csvData) {
            return [];
        }

        return this.csvData.map(post => {
            const shortcode = post.Shortcode;
            const mediaFile = this.mediaFiles.get(shortcode);
            
            return {
                shortcode: shortcode,
                url: post.Post,
                title: post.Captions ? post.Captions.substring(0, 100) + '...' : 'No caption',
                description: post.Captions || '',
                createDate: post['Create Date'],
                likes: parseInt(post.Likes) || 0,
                comments: parseInt(post.Comments) || 0,
                hasMedia: !!mediaFile,
                mediaType: mediaFile?.type || 'unknown',
                mediaFilename: mediaFile?.filename || null
            };
        });
    }

    /**
     * Clear current directory selection
     */
    clearDirectory() {
        this.directoryHandle = null;
        this.mediaFiles.clear();
        this.csvData = null;
        this.dbData = null;
        
        // Revoke any blob URLs to free memory
        this.mediaFiles.forEach(mediaInfo => {
            if (mediaInfo.url && mediaInfo.url.startsWith('blob:')) {
                URL.revokeObjectURL(mediaInfo.url);
            }
        });
    }
}

// Export for use in other modules
window.DirectoryManager = DirectoryManager; 