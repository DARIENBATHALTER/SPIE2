export class InstagramDataParser {
    constructor() {
        this.posts = [];
        this.comments = {};
        this.mediaMapping = {};
    }

    // Convert date from CSV format to filename format
    convertDateToFilenameFormat(csvDate) {
        // Parse "6/15/2025, 9:54:56 AM" to "2025_06_15.09.54"
        const [datePart, timePart] = csvDate.split(', ');
        const [month, day, year] = datePart.split('/');
        const [time, period] = timePart.split(' ');
        const [hours, minutes, seconds] = time.split(':');
        
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
        
        const formattedMonth = month.padStart(2, '0');
        const formattedDay = day.padStart(2, '0');
        const formattedHour = hour24.toString().padStart(2, '0');
        const formattedMinute = minutes.padStart(2, '0');
        
        return `${year}_${formattedMonth}_${formattedDay}.${formattedHour}.${formattedMinute}`;
    }

    // Parse CSV text into array of objects
    parseCSV(csvText, hasHeaders = true) {
        const rows = [];
        let currentRow = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    currentField += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                currentRow.push(currentField);
                currentField = '';
            } else if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') i++;
                if (currentRow.length > 0 || currentField) {
                    currentRow.push(currentField);
                    rows.push(currentRow);
                    currentRow = [];
                    currentField = '';
                }
            } else {
                currentField += char;
            }
        }
        
        // Don't forget the last field/row
        if (currentField || currentRow.length > 0) {
            currentRow.push(currentField);
            rows.push(currentRow);
        }
        
        if (rows.length === 0) return [];
        
        const headers = hasHeaders ? rows[0] : null;
        const startIndex = hasHeaders ? 1 : 0;
        const data = [];
        
        for (let i = startIndex; i < rows.length; i++) {
            const values = rows[i];
            if (hasHeaders) {
                const obj = {};
                headers.forEach((header, index) => {
                    obj[header] = values[index] || '';
                });
                data.push(obj);
            } else {
                data.push(values);
            }
        }
        
        return data;
    }

    // Parse a single CSV line handling quoted values
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
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
        return result;
    }

    // Load and parse the main posts CSV
    async loadPostsData(csvText) {
        const rawPosts = this.parseCSV(csvText);
        
        this.posts = rawPosts.map((post, index) => {
            const filenameDate = this.convertDateToFilenameFormat(post['Create Date']);
            const postId = this.extractPostIdFromUrl(post['Post']);
            
            return {
                id: postId || `post_${index}`,
                profile: post['Profile'],
                url: post['Post'],
                createDate: post['Create Date'],
                filenameDatePrefix: filenameDate,
                likes: parseInt(post['Likes']) || 0,
                commentsCount: parseInt(post['Comments']) || 0,
                caption: post['Captions'],
                mediaFiles: [],
                commentFiles: []
            };
        });
        
        // Sort posts by date for proper ordering
        this.posts.sort((a, b) => new Date(a.createDate) - new Date(b.createDate));
        
        return this.posts;
    }

    // Extract post ID from Instagram URL
    extractPostIdFromUrl(url) {
        const match = url.match(/\/p\/([^\/]+)\//);
        return match ? match[1] : null;
    }

    // Match media files to posts based on date/time
    async matchMediaFiles(mediaFiles) {
        // Group media files by date prefix
        const mediaByDate = {};
        
        mediaFiles.forEach(filename => {
            const match = filename.match(/^(\d{4}_\d{2}_\d{2}\.\d{2}\.\d{2})/);
            if (match) {
                const datePrefix = match[1];
                if (!mediaByDate[datePrefix]) {
                    mediaByDate[datePrefix] = [];
                }
                mediaByDate[datePrefix].push(filename);
            }
        });
        
        // Match posts to media files
        this.posts.forEach(post => {
            const matchingMedia = mediaByDate[post.filenameDatePrefix] || [];
            
            matchingMedia.forEach(filename => {
                if (filename.endsWith('.mp4')) {
                    post.mediaFiles.push({
                        type: 'video',
                        filename: filename,
                        thumbnail: filename.replace('.mp4', '.thumbnail.jpg')
                    });
                } else if (!filename.includes('.thumbnail.')) {
                    post.mediaFiles.push({
                        type: 'image',
                        filename: filename
                    });
                }
            });
            
            // Create mapping for quick lookup
            if (post.mediaFiles.length > 0) {
                this.mediaMapping[post.id] = post.mediaFiles;
            }
        });
        
        return this.mediaMapping;
    }

    // Parse comment files and match to posts
    async loadComments(commentFiles) {
        console.log('📝 Matching comments to posts...');
        
        // Group posts by date for better matching
        const postsByDate = {};
        this.posts.forEach(post => {
            const postDate = new Date(post.createDate);
            const dateKey = `${postDate.getFullYear()}-${(postDate.getMonth() + 1).toString().padStart(2, '0')}-${postDate.getDate().toString().padStart(2, '0')}`;
            
            if (!postsByDate[dateKey]) {
                postsByDate[dateKey] = [];
            }
            postsByDate[dateKey].push(post);
        });
        
        // Sort posts within each date by time (filename order)
        Object.values(postsByDate).forEach(posts => {
            posts.sort((a, b) => {
                const timeA = a.filenameDatePrefix.split('.')[1] || '00.00';
                const timeB = b.filenameDatePrefix.split('.')[1] || '00.00';
                return timeA.localeCompare(timeB);
            });
        });
        
        for (const [filename, content] of Object.entries(commentFiles)) {
            console.log(`📝 Processing comment file: ${filename}`);
            
            // Extract date and post number from filename (e.g., "June 15 - post 3 comments.csv")
            const match = filename.match(/(\w+\s+\d+)\s+-\s+post\s+(\d+)/i);
            if (match) {
                const dateStr = match[1]; // "June 15"
                const postNum = parseInt(match[2]); // 3
                
                console.log(`   Date: ${dateStr}, Post #: ${postNum}`);
                
                // Convert comment date to standardized format
                let targetDate = null;
                try {
                    // Parse "June 15" with current year
                    const currentYear = new Date().getFullYear();
                    const tempDate = new Date(`${dateStr} ${currentYear}`);
                    if (!isNaN(tempDate.getTime())) {
                        targetDate = `${tempDate.getFullYear()}-${(tempDate.getMonth() + 1).toString().padStart(2, '0')}-${tempDate.getDate().toString().padStart(2, '0')}`;
                    }
                } catch (e) {
                    console.warn(`   Could not parse date: ${dateStr}`);
                    continue;
                }
                
                // Find posts on this date
                const postsOnDate = postsByDate[targetDate] || [];
                console.log(`   Found ${postsOnDate.length} posts on ${targetDate}`);
                
                // Match to specific post by order (1-indexed)
                if (postsOnDate[postNum - 1]) {
                    const post = postsOnDate[postNum - 1];
                    console.log(`   Matching to post: ${post.id} (${post.title})`);
                    
                    const comments = this.parseCSV(content);
                    console.log(`   Loaded ${comments.length} comments`);
                    
                    this.comments[post.id] = comments.map(comment => ({
                        id: comment['Id'] || `comment_${Date.now()}_${Math.random()}`,
                        userId: comment['UserId'],
                        avatar: comment['Avatar'],
                        author: comment['Author'],
                        content: comment['Content'],
                        reactionsCount: parseInt(comment['ReactionsCount']) || 0,
                        depth: parseInt(comment['Depth']) || 0,
                        subCommentsCount: parseInt(comment['SubCommentsCount']) || 0,
                        commentAt: comment['CommentAt'] || new Date().toISOString()
                    }));
                    
                    post.commentFiles.push(filename);
                } else {
                    console.warn(`   Post #${postNum} not found for date ${targetDate}`);
                }
            } else {
                console.warn(`   Could not parse filename: ${filename}`);
            }
        }
        
        console.log(`📝 Total posts with comments: ${Object.keys(this.comments).length}`);
        return this.comments;
    }

    // Get all parsed data
    getData() {
        return {
            posts: this.posts,
            comments: this.comments,
            mediaMapping: this.mediaMapping
        };
    }

    // Convert to format similar to existing videos.json
    toVideosFormat() {
        return this.posts.map(post => ({
            video_id: post.id,
            title: `@${post.profile} - ${new Date(post.createDate).toLocaleDateString()}`,
            description: post.caption,
            published_at: new Date(post.createDate).toISOString(),
            channel_id: post.profile,
            view_count: post.likes, // Using likes as a proxy for views
            like_count: post.likes,
            comment_count: post.commentsCount,
            url: post.url,
            media_files: post.mediaFiles,
            scraped_at: new Date().toISOString()
        }));
    }
}