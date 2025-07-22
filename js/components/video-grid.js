/**
 * VideoGrid Component - Handles video/post grid rendering and interactions
 * This component supports both YouTube videos and Instagram posts
 */
class VideoGridComponent {
    constructor(container, dataManager, instagramDirectoryManager = null) {
        this.container = container;
        this.dataManager = dataManager;
        this.instagramDirectoryManager = instagramDirectoryManager;
        this.videos = [];
        this.isLoading = false;
        this.thumbnailCache = new Map(); // Cache for generated thumbnails
        
        this.setupEventHandlers();
    }

    /**
     * Setup event handlers for video grid
     */
    setupEventHandlers() {
        this.container.addEventListener('click', (e) => {
            const videoCard = e.target.closest('.video-card');
            const instagramGridItem = e.target.closest('.instagram-grid-item');
            
            if (!this.isLoading) {
                if (videoCard) {
                    const videoId = videoCard.dataset.videoId;
                    this.onVideoClick?.(videoId);
                } else if (instagramGridItem) {
                    const videoId = instagramGridItem.dataset.videoId;
                    this.onVideoClick?.(videoId);
                }
            }
        });

        // Lazy loading for images
        this.setupLazyLoading();
    }

    /**
     * Setup lazy loading for video thumbnails
     */
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            this.imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
        }
    }

    /**
     * Render videos in the grid
     */
    render(videos) {
        this.videos = videos;
        this.isLoading = true;

        const html = videos.map(video => this.createVideoCard(video)).join('');
        this.container.innerHTML = html;

        this.isLoading = false;

        // Load actual thumbnails for Instagram archive posts
        setTimeout(() => {
            this.loadAsyncThumbnails();
        }, 100);
    }

    /**
     * Create Instagram-style grid item HTML
     */
    createVideoCard(video) {
        let thumbnail;
        let mediaType = 'image';
        let hasMultipleMedia = false;
        
        // Handle Instagram archive format (with shortcode)
        if (video.shortcode && video.hasMedia && this.dataManager.dataSource === 'instagram') {
            mediaType = video.mediaType || 'image';
            
            // Start with placeholder - we'll load actual thumbnail async
            thumbnail = this.getPlaceholderThumbnail(mediaType);
            
            console.log(`Creating Instagram archive card for ${video.shortcode}: media type: ${mediaType}`);
        }
        // Handle legacy Instagram posts (with media_files)
        else if (video.media_files && video.media_files.length > 0) {
            const firstMedia = video.media_files[0];
            hasMultipleMedia = video.media_files.length > 1;
            
            if (firstMedia.type === 'video' && firstMedia.thumbnail) {
                thumbnail = `instadata/posts/${firstMedia.thumbnail}`;
                mediaType = 'video';
            } else {
                thumbnail = `instadata/posts/${firstMedia.filename}`;
            }
            
            console.log(`Creating legacy card for ${video.video_id}: ${thumbnail}, media type: ${mediaType}`);
        } else {
            // Fallback to YouTube thumbnail
            thumbnail = `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
            console.log(`Fallback YouTube thumbnail for ${video.video_id}: ${thumbnail}`);
        }
        
        const likes = this.formatNumber(video.like_count || video.view_count);
        const comments = this.formatNumber(video.comment_count);
        
        // Format date for overlay
        const date = new Date(video.published_at);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        let dateText;
        if (diffDays < 1) {
            dateText = 'Today';
        } else if (diffDays < 7) {
            dateText = `${diffDays}d`;
        } else if (diffDays < 30) {
            dateText = `${Math.floor(diffDays / 7)}w`;
        } else if (diffDays < 365) {
            dateText = `${Math.floor(diffDays / 30)}mo`;
        } else {
            dateText = `${Math.floor(diffDays / 365)}y`;
        }
        
        return `
            <div class="col-3 p-1">
                <div class="instagram-grid-item position-relative" data-video-id="${video.video_id}">
                    <div class="instagram-thumbnail">
                        <img class="w-100 h-100" 
                             src="${thumbnail}" 
                             alt="${this.escapeHTML(video.title)}" 
                             loading="lazy"
                             style="object-fit: cover;"
                             onerror="this.style.background='#f0f0f0'; this.style.display='block'; console.error('Failed to load image:', this.src); this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik0xNTAgMTIwQzEzNi4xOTMgMTIwIDEyNSAxMzEuMTkzIDEyNSAxNDVDMTI1IDE1OC44MDcgMTM2LjE5MyAxNzAgMTUwIDE3MEMxNjMuODA3IDE3MCAxNzUgMTU4LjgwNyAxNzUgMTQ1QzE3NSAxMzEuMTkzIDE2My44MDcgMTIwIDE1MCAxMjBaIiBmaWxsPSIjQzBDMEMwIi8+CjxwYXRoIGQ9Ik0xMDAgMjAwSDE4MFYxODBIMTAwVjIwMFoiIGZpbGw9IiNDMEMwQzAiLz4KPC9zdmc+'">
                    </div>
                    
                    <!-- Multiple media indicator (top-right) -->
                    <div class="media-indicators position-absolute" style="top: 8px; right: 8px;">
                        ${hasMultipleMedia ? '<i class="fas fa-clone text-white"></i>' : ''}
                    </div>
                    
                    <!-- Hover overlay with stats -->
                    <div class="hover-overlay position-absolute w-100 h-100 d-flex align-items-center justify-content-center">
                        <div class="text-white text-center">
                            <div class="mb-3">
                                <i class="${mediaType === 'video' ? 'fas fa-play' : 'fas fa-eye'}" style="font-size: 28px;"></i>
                            </div>
                            <div class="mb-2">
                                <i class="fas fa-calendar-alt me-1"></i>
                                <span>${dateText}</span>
                            </div>
                            <div class="d-flex align-items-center justify-content-center gap-3">
                                <div>
                                    <i class="fas fa-heart me-1"></i>
                                    <span>${likes}</span>
                                </div>
                                <div>
                                    <i class="fas fa-comment me-1"></i>
                                    <span>${comments}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Add skeleton loading cards
     */
    renderSkeleton(count = 12) {
        const skeletonCards = Array(count).fill(0).map(() => `
            <div class="col-3 p-1">
                <div class="instagram-grid-item skeleton">
                    <div class="instagram-thumbnail" style="background: #f0f0f0;">
                        <div class="w-100 h-100"></div>
                    </div>
                </div>
            </div>
        `).join('');

        this.container.innerHTML = skeletonCards;
    }

    /**
     * Format numbers (1000 -> 1K)
     */
    formatNumber(num) {
        // Handle undefined, null, or non-numeric values
        if (num === undefined || num === null || isNaN(num)) {
            return '0';
        }
        
        // Convert to number if it's a string
        const numValue = typeof num === 'string' ? parseInt(num) || 0 : num;
        
        if (numValue >= 1000000) {
            return (numValue / 1000000).toFixed(1).replace('.0', '') + 'M';
        }
        if (numValue >= 1000) {
            return (numValue / 1000).toFixed(1).replace('.0', '') + 'K';
        }
        return numValue.toString();
    }

    /**
     * Escape HTML
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Set video click handler
     */
    setVideoClickHandler(handler) {
        this.onVideoClick = handler;
    }

    /**
     * Get placeholder thumbnail based on media type
     */
    getPlaceholderThumbnail(mediaType) {
        if (mediaType === 'video') {
            // Video placeholder with play icon
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNGY0ZjRmIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNDAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOCIvPgo8cGF0aCBkPSJNMTM1IDE0MEwxNzAgMTUwTDEzNSAxNjBWMTQwWiIgZmlsbD0iIzRmNGY0ZiIvPgo8L3N2Zz4=';
        } else {
            // Image placeholder
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjZjBmMGYwIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjEyMCIgcj0iMjUiIGZpbGw9IiNjMGMwYzAiLz4KPHBhdGggZD0iTTEwMCAyMDBIMjAwVjE4MEwxNzAgMTUwTDE0MCAyMDBIMTAwWiIgZmlsbD0iI2MwYzBjMCIvPgo8L3N2Zz4=';
        }
    }

    /**
     * Load actual thumbnail for Instagram archive posts
     */
    async loadInstagramThumbnail(video, imgElement) {
        if (!this.instagramDirectoryManager || !video.shortcode) {
            return;
        }

        try {
            // Check cache first
            if (this.thumbnailCache.has(video.shortcode)) {
                imgElement.src = this.thumbnailCache.get(video.shortcode);
                return;
            }

            // Load media file and use it as thumbnail
            const mediaUrl = await this.instagramDirectoryManager.getFileURL(video.shortcode);
            
            if (mediaUrl) {
                const mediaInfo = this.instagramDirectoryManager.mediaFiles.get(video.shortcode);
                
                if (mediaInfo && mediaInfo.type.startsWith('image/')) {
                    // For images, use the image directly
                    imgElement.src = mediaUrl;
                    this.thumbnailCache.set(video.shortcode, mediaUrl);
                } else if (mediaInfo && mediaInfo.type.startsWith('video/')) {
                    // For videos, we need to generate a thumbnail from the video
                    this.generateVideoThumbnail(mediaUrl, imgElement, video.shortcode);
                }
            }
        } catch (error) {
            console.warn(`Failed to load thumbnail for ${video.shortcode}:`, error);
            // Keep placeholder
        }
    }

    /**
     * Generate thumbnail from video file
     */
    generateVideoThumbnail(videoUrl, imgElement, shortcode) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        video.addEventListener('loadeddata', () => {
            // Seek to 1 second or 10% of duration, whichever is smaller
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
        });
        
        video.addEventListener('seeked', () => {
            // Create canvas and draw video frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Use Instagram aspect ratio (625:830) with higher resolution
            const instagramAspect = 625 / 830;
            canvas.width = 625;
            canvas.height = 830;
            
            // Calculate how to fit video into Instagram aspect ratio
            const videoAspect = video.videoWidth / video.videoHeight;
            let drawWidth, drawHeight, drawX, drawY;
            
            if (videoAspect > instagramAspect) {
                // Video is wider than Instagram format - fit to height
                drawHeight = canvas.height;
                drawWidth = drawHeight * videoAspect;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                // Video is taller than Instagram format - fit to width
                drawWidth = canvas.width;
                drawHeight = drawWidth / videoAspect;
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            }
            
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
            
            // Convert to blob and set as image source
            canvas.toBlob((blob) => {
                const thumbnailUrl = URL.createObjectURL(blob);
                imgElement.src = thumbnailUrl;
                this.thumbnailCache.set(shortcode, thumbnailUrl);
            }, 'image/jpeg', 0.8);
        });
        
        video.src = videoUrl;
    }

    /**
     * Update rendered grid with async thumbnails
     */
    async loadAsyncThumbnails() {
        if (this.dataManager.dataSource === 'instagram' && this.instagramDirectoryManager) {
            const imgElements = this.container.querySelectorAll('.instagram-grid-item img');
            
            for (const img of imgElements) {
                const gridItem = img.closest('.instagram-grid-item');
                const videoId = gridItem?.dataset.videoId;
                
                if (videoId) {
                    const video = this.videos.find(v => v.video_id === videoId);
                    if (video && video.shortcode) {
                        await this.loadInstagramThumbnail(video, img);
                    }
                }
            }
        }
    }
}

// Export for use in other modules
window.VideoGridComponent = VideoGridComponent; 