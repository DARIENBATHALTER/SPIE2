/**
 * VideoPlayer - Handles both local video playback and YouTube embeds
 * Manages video loading, error handling, and player controls
 * Version: 4.0 (YouTube + Local support via ModeManager)
 */
class VideoPlayer {
    constructor(videoElement, fallbackElement, modeManager = null, instagramDirectoryManager = null) {
        this.videoElement = videoElement;
        this.fallbackElement = fallbackElement;
        this.modeManager = modeManager;
        this.instagramDirectoryManager = instagramDirectoryManager;
        this.currentVideo = null;
        this.isPlaying = false;
        this.videoContainer = videoElement.closest('.video-container');
        this.playOverlay = document.getElementById('videoPlayOverlay');
        this.youtubeIframe = null;
        this.currentPlayerType = null; // 'local', 'youtube', or 'instagram'
        
        // Instagram-specific properties
        this.currentMediaIndex = 0;
        this.mediaFiles = [];
        this.imageElement = null;
        this.carouselControls = null;
        this.mediaIndicators = null;
        
        // Custom control elements
        this.customControls = document.getElementById('customControls');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        
        console.log('🎥 VideoPlayer v4.0 initialized (YouTube + Local + Instagram support)');
        this.setupEventListeners();
        this.setupCustomControls();
        this.createInstagramElements();
    }

    /**
     * Set up video player event listeners
     */
    setupEventListeners() {
        // Video loading events
        this.videoElement.addEventListener('loadstart', () => {
            this.showLoading(true);
        });

        this.videoElement.addEventListener('canplay', () => {
            this.showLoading(false);
            this.hideError();
        });

        this.videoElement.addEventListener('error', (e) => {
            console.warn('🎥 Video playback error:', e);
            this.handleVideoError();
        });

        // Playback events
        this.videoElement.addEventListener('play', () => {
            this.isPlaying = true;
            this.hidePlayOverlay();
            this.updatePlayPauseIcon();
            this.updateProgress();
        });

        this.videoElement.addEventListener('pause', () => {
            this.isPlaying = false;
            this.showPlayOverlay();
            this.updatePlayPauseIcon();
        });

        this.videoElement.addEventListener('ended', () => {
            this.isPlaying = false;
            this.showPlayOverlay();
            this.updatePlayPauseIcon();
        });

        // Play overlay click handler
        if (this.playOverlay) {
            this.playOverlay.addEventListener('click', () => {
                if (this.videoElement.src) {
                    this.play();
                }
        });
        }

        // Network events
        this.videoElement.addEventListener('stalled', () => {
            console.warn('🎥 Video playback stalled');
        });

        this.videoElement.addEventListener('waiting', () => {
            console.warn('🎥 Video buffering...');
        });

        // Time updates for custom controls
        this.videoElement.addEventListener('timeupdate', () => {
            this.updateProgress();
        });

        this.videoElement.addEventListener('loadedmetadata', () => {
            this.updateTimeDisplay();
            console.log(`🎥 Video metadata loaded - Duration: ${this.videoElement.duration}s`);
        });

        this.videoElement.addEventListener('loadeddata', () => {
            console.log(`🎥 Video data loaded - can now seek`);
        });

        this.videoElement.addEventListener('seeked', () => {
            console.log(`🎥 Seek completed - Current time: ${this.videoElement.currentTime}s`);
            this.updateProgress();
        });

        this.videoElement.addEventListener('seeking', () => {
            console.log(`🎥 Seeking started - Target: ${this.videoElement.currentTime}s`);
        });

        this.videoElement.addEventListener('error', (e) => {
            console.error(`🎥 Video error during playback:`, e);
        });

        // Debug: Monitor any unexpected currentTime changes
        let lastTime = 0;
        this.videoElement.addEventListener('timeupdate', () => {
            if (Math.abs(this.videoElement.currentTime - lastTime) > 10) {
                console.log(`🕐 Large time jump: ${lastTime}s → ${this.videoElement.currentTime}s`);
            }
            lastTime = this.videoElement.currentTime;
        });

        // Keyboard navigation for Instagram carousel
        document.addEventListener('keydown', (e) => {
            if (this.currentPlayerType === 'instagram' && this.mediaFiles.length > 1) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.previousMedia();
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.nextMedia();
                }
            }
        });
    }

    /**
     * Set up custom video controls
     */
    setupCustomControls() {
        // Play/Pause button
        this.playPauseBtn?.addEventListener('click', () => {
            this.togglePlay();
        });

        // Progress bar clicking
        this.progressContainer?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const rect = this.progressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const duration = this.videoElement.duration;
            
            console.log(`🎯 Progress click debug:`);
            console.log(`  - Click X: ${e.clientX}, Rect left: ${rect.left}, Relative: ${clickX}`);
            console.log(`  - Container width: ${rect.width}`);
            console.log(`  - Calculated percentage: ${percentage * 100}%`);
            console.log(`  - Video duration: ${duration}`);
            
            if (duration && !isNaN(duration) && duration > 0) {
                const newTime = duration * percentage;
                console.log(`  - Seeking to: ${newTime}s`);
                console.log(`  - Video ready state: ${this.videoElement.readyState}`);
                console.log(`  - Video current time before: ${this.videoElement.currentTime}s`);
                console.log(`  - Video seekable ranges: ${this.videoElement.seekable.length}`);
                
                if (this.videoElement.readyState >= 2 && this.videoElement.seekable.length > 0) {
                    try {
                        // Check if the seek target is within seekable range
                        const seekableStart = this.videoElement.seekable.start(0);
                        const seekableEnd = this.videoElement.seekable.end(0);
                        const clampedTime = Math.max(seekableStart, Math.min(seekableEnd, newTime));
                        
                        console.log(`  - Seekable range: ${seekableStart}s to ${seekableEnd}s`);
                        console.log(`  - Clamped seek time: ${clampedTime}s`);
                        
                        // Pause video before seeking (some browsers require this)
                        const wasPlaying = !this.videoElement.paused;
                        if (wasPlaying) {
                            this.videoElement.pause();
                            console.log(`  - Video paused for seeking`);
                        }
                        
                        // Try a more robust seek approach
                        this.performSeek(clampedTime, wasPlaying);
                        
                    } catch (error) {
                        console.error(`  - Seek failed:`, error);
                    }
                } else {
                    console.log(`  - Video not ready for seeking (readyState: ${this.videoElement.readyState}, seekable: ${this.videoElement.seekable.length})`);
                }
                
                // Force update after a small delay to ensure the seek completed
                setTimeout(() => {
                    console.log(`  - After timeout, current time: ${this.videoElement.currentTime}s`);
                    this.updateProgress();
                }, 200);
            } else {
                console.log(`  - Cannot seek: duration=${duration}`);
            }
        });

        // Add mousedown/mousemove for dragging
        let isDragging = false;
        
        this.progressContainer?.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.handleProgressDrag(e);
        });

        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.handleProgressDrag(e);
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });

        // Volume controls
        this.muteBtn?.addEventListener('click', () => {
            this.toggleMute();
        });

        this.volumeSlider?.addEventListener('input', (e) => {
            const volume = e.target.value / 100;
            this.videoElement.volume = volume;
            this.updateVolumeIcon();
        });

        // Fullscreen button
        this.fullscreenBtn?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
    }

    /**
     * Load video based on current mode (local or YouTube) or Instagram media
     */
    async loadVideo(videoData, dataManager) {
        try {
            this.currentVideo = videoData;
            this.hideError();
            this.showLoading(true);
            this.resetMedia(); // Reset any previous media state

            console.log(`🔍 DEBUG - Video ID: ${videoData.video_id}`);
            console.log(`🔍 DEBUG - Video Title: ${videoData.title}`);
            console.log(`🔍 DEBUG - Current Mode: ${this.modeManager?.getCurrentMode()}`);
            console.log(`🔍 DEBUG - Media Files:`, videoData.media_files);
            
            // Check if this is Instagram content (has shortcode)
            if (dataManager.dataSource === 'instagram' && videoData.shortcode) {
                console.log('📸 Loading Instagram media for shortcode:', videoData.shortcode);
                await this.loadInstagramMedia(videoData, dataManager);
            } else if (videoData.media_files && videoData.media_files.length > 0) {
                console.log('📸 Loading Instagram media from media_files:', videoData.media_files);
                await this.loadInstagramMedia(videoData, dataManager);
            } else if (this.modeManager?.isYouTubeMode()) {
                // YouTube mode - embed YouTube video
                console.log('🔗 Loading YouTube embed for video:', videoData.title);
                await this.loadYouTubeVideo(videoData);
            } else {
                // Local mode - try to load local video file
                const localPath = dataManager.getVideoFilePath(videoData.video_id);
                console.log(`🔍 DEBUG - getVideoFilePath returned: ${localPath}`);
                
                if (localPath) {
                    console.log(`🎥 Attempting to load local video: ${localPath}`);
                    try {
                        await this.loadLocalVideo(localPath, videoData);
                    } catch (error) {
                        console.log(`🔗 Local video failed to load, showing YouTube fallback`);
                        this.showYouTubeFallback(videoData, dataManager);
                    }
                } else {
                    console.log(`🔗 No local video mapping found, showing YouTube fallback`);
                this.showYouTubeFallback(videoData, dataManager);
                }
            }

        } catch (error) {
            console.error('🎥 Failed to load video:', error);
            this.showYouTubeFallback(videoData, dataManager);
        }
    }

    /**
     * Load YouTube video as iframe embed
     */
    async loadYouTubeVideo(videoData) {
        return new Promise((resolve) => {
            console.log(`🔗 Creating YouTube embed for: ${videoData.title}`);
            
            // Hide local video element and custom controls
            this.videoElement.style.display = 'none';
            this.hidePlayOverlay();
            this.customControls.style.display = 'none';
            
            // Remove existing iframe if present
            if (this.youtubeIframe) {
                this.youtubeIframe.remove();
            }
            
            // Create YouTube iframe
            this.youtubeIframe = document.createElement('iframe');
            this.youtubeIframe.src = `https://www.youtube.com/embed/${videoData.video_id}?enablejsapi=1&modestbranding=1&rel=0`;
            this.youtubeIframe.className = 'youtube-embed';
            this.youtubeIframe.style.cssText = `
                width: 100%;
                height: 100%;
                border: none;
                border-radius: 8px;
            `;
            this.youtubeIframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            this.youtubeIframe.allowFullscreen = true;
            
            // Insert iframe into video container
            this.videoContainer.appendChild(this.youtubeIframe);
            
            this.currentPlayerType = 'youtube';
            this.showLoading(false);
            
            console.log(`✅ YouTube embed loaded for: ${videoData.title}`);
            resolve();
        });
    }

    /**
     * Load local video file
     */
    async loadLocalVideo(filePath, videoData) {
        return new Promise(async (resolve, reject) => {
            console.log(`🎬 VideoPlayer v4.0: Setting video source to: ${filePath}`);
            
            // Show local video element and custom controls
            this.videoElement.style.display = 'block';
            this.customControls.style.display = 'block';
            
            // Hide any existing YouTube iframe
            if (this.youtubeIframe) {
                this.youtubeIframe.style.display = 'none';
            }
            
            // Configure video element
            this.videoElement.preload = 'metadata';
            this.videoElement.autoplay = false;
            
            try {
                // Set video source based on mode
                if (this.modeManager?.isLocalMode() && this.modeManager.directoryManager?.isDirectorySelected()) {
                    // Use File System Access API to get blob URL
                    console.log('🌐 Using File System Access API - creating blob URL');
                    const blobUrl = await this.modeManager.getVideoSource(videoData.video_id, filePath);
                    this.videoElement.src = blobUrl;
                } else {
                    // Use traditional local server approach
                    console.log('🖥️ Using local server mode');
            this.videoElement.src = filePath;
                }
            
            // Set poster if available (could use YouTube thumbnail)
            this.setVideoPoster(videoData.video_id);

            } catch (blobError) {
                console.error('🚨 Failed to create blob URL, falling back to direct path:', blobError);
                this.videoElement.src = filePath;
            }

            // Add timeout for loading
            const loadTimeout = setTimeout(() => {
                this.videoElement.removeEventListener('canplay', handleCanPlay);
                this.videoElement.removeEventListener('error', handleError);
                this.videoElement.removeEventListener('loadstart', handleLoadStart);
                console.error(`🚨 VideoPlayer v4.0: Timeout loading video: ${filePath}`);
                reject(new Error('Video loading timeout'));
            }, 10000); // 10 second timeout

            // Handle successful load
            const handleCanPlay = () => {
                clearTimeout(loadTimeout);
                this.videoElement.removeEventListener('canplay', handleCanPlay);
                this.videoElement.removeEventListener('error', handleError);
                this.videoElement.removeEventListener('loadstart', handleLoadStart);
                console.log(`✅ VideoPlayer v4.0: Video loaded successfully: ${filePath}`);
                this.currentPlayerType = 'local';
                this.showVideo();
                resolve();
            };

            // Handle load error
            const handleError = (e) => {
                clearTimeout(loadTimeout);
                this.videoElement.removeEventListener('canplay', handleCanPlay);
                this.videoElement.removeEventListener('error', handleError);
                this.videoElement.removeEventListener('loadstart', handleLoadStart);
                console.error(`🚨 VideoPlayer v4.0: Video error for ${filePath}:`, e);
                console.error(`🚨 Error details - Type: ${e.type}, Target: ${e.target?.tagName}, Src: ${e.target?.src}`);
                reject(new Error(`Failed to load video: ${e.type}`));
            };

            // Handle load start (shows we're getting data)
            const handleLoadStart = () => {
                console.log(`🎯 VideoPlayer v4.0: Video load started: ${filePath}`);
            };

            this.videoElement.addEventListener('canplay', handleCanPlay);
            this.videoElement.addEventListener('error', handleError);
            this.videoElement.addEventListener('loadstart', handleLoadStart);

            // Load the video
            this.videoElement.load();
        });
    }

    /**
     * Show YouTube fallback when local video fails
     */
    showYouTubeFallback(videoData, dataManager) {
        console.log(`🔗 Local video failed, loading YouTube player as fallback for: ${videoData.title}`);
        
        // Hide the fallback message since we're showing the actual video
        this.fallbackElement.style.display = 'none';
        
        // Load the YouTube video directly instead of just showing a link
        this.loadYouTubeVideo(videoData);
    }

    /**
     * Handle video playback errors
     */
    handleVideoError() {
        this.showLoading(false);
        
        if (this.currentVideo) {
            console.warn(`🎥 Local video failed for ${this.currentVideo.video_id}, showing fallback`);
            // You could implement retry logic here or immediately show YouTube fallback
            this.showError('Video playback failed. Please try the YouTube link.');
        }
    }

    /**
     * Show video player
     */
    showVideo() {
        this.videoElement.style.display = 'block';
        this.fallbackElement.style.display = 'none';
        this.showLoading(false);
        this.showPlayOverlay(); // Show play button when video loads
    }

    /**
     * Hide video player
     */
    hideVideo() {
        this.videoElement.style.display = 'none';
        this.hidePlayOverlay(); // Hide play button when video is hidden
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        if (show) {
            this.videoElement.classList.add('video-loading');
        } else {
            this.videoElement.classList.remove('video-loading');
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.fallbackElement.style.display = 'block';
        const alertElement = this.fallbackElement.querySelector('.alert');
        if (alertElement) {
            alertElement.innerHTML = `
                <i class="bi bi-exclamation-triangle"></i>
                ${message} <a href="#" id="openYouTubeLink" target="_blank">Watch on YouTube</a>
            `;
        }
    }

    /**
     * Hide error message
     */
    hideError() {
        this.fallbackElement.style.display = 'none';
    }

    /**
     * Show play overlay button
     */
    showPlayOverlay() {
        if (this.playOverlay) {
            this.playOverlay.style.display = 'flex';
        }
        if (this.videoContainer) {
            this.videoContainer.classList.remove('playing');
        }
    }

    /**
     * Hide play overlay button
     */
    hidePlayOverlay() {
        if (this.playOverlay) {
            this.playOverlay.style.display = 'none';
        }
        if (this.videoContainer) {
            this.videoContainer.classList.add('playing');
        }
    }

    /**
     * Play video
     */
    play() {
        if (this.videoElement.src) {
            return this.videoElement.play();
        }
    }

    /**
     * Pause video
     */
    pause() {
        this.videoElement.pause();
    }

    /**
     * Toggle play/pause
     */
    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Set video time
     */
    setTime(seconds) {
        this.videoElement.currentTime = seconds;
    }

    /**
     * Perform a robust seek operation
     */
    performSeek(targetTime, wasPlaying) {
        console.log(`🎯 Performing robust seek to: ${targetTime}s`);
        
        // Ensure video is in the right state
        if (this.videoElement.readyState < 2) {
            console.log(`❌ Video not ready for seeking (readyState: ${this.videoElement.readyState})`);
            return;
        }

        return new Promise((resolve) => {
            let seekAttempts = 0;
            const maxAttempts = 3;
            
            const attemptSeek = () => {
                seekAttempts++;
                console.log(`  - Seek attempt ${seekAttempts}: setting currentTime to ${targetTime}s`);
                
                // Store the target for verification
                const targetTimeToSet = targetTime;
                
                // Set the time
                this.videoElement.currentTime = targetTimeToSet;
                
                // Check immediately if it was set correctly
                setTimeout(() => {
                    const actualTime = this.videoElement.currentTime;
                    console.log(`  - After setting: target=${targetTimeToSet}s, actual=${actualTime}s`);
                    
                    // If the time wasn't set correctly and we haven't exhausted attempts
                    if (Math.abs(actualTime - targetTimeToSet) > 1 && seekAttempts < maxAttempts) {
                        console.log(`  - Seek didn't stick, retrying... (attempt ${seekAttempts + 1})`);
                        setTimeout(attemptSeek, 100);
                    } else {
                        // Seek completed (or we've exhausted attempts)
                        console.log(`  - Seek ${seekAttempts < maxAttempts ? 'completed' : 'failed'} at ${actualTime}s`);
                        
                        // Resume playback if it was playing
                        if (wasPlaying) {
                            console.log(`  - Resuming playback`);
                            this.videoElement.play().catch(e => console.log('Play after seek failed:', e));
                        }
                        
                        resolve(actualTime);
                    }
                }, 50);
            };
            
            // Start the seek attempt
            attemptSeek();
        });
    }

    /**
     * Get video duration
     */
    getDuration() {
        return this.videoElement.duration || 0;
    }

    /**
     * Get current time
     */
    getCurrentTime() {
        return this.videoElement.currentTime || 0;
    }

    /**
     * Set volume (0-1)
     */
    setVolume(volume) {
        this.videoElement.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Get volume (0-1)
     */
    getVolume() {
        return this.videoElement.volume;
    }

    /**
     * Set muted state
     */
    setMuted(muted) {
        this.videoElement.muted = muted;
    }

    /**
     * Check if muted
     */
    isMuted() {
        return this.videoElement.muted;
    }

    /**
     * Enter fullscreen
     */
    enterFullscreen() {
        if (this.videoElement.requestFullscreen) {
            this.videoElement.requestFullscreen();
        } else if (this.videoElement.webkitRequestFullscreen) {
            this.videoElement.webkitRequestFullscreen();
        } else if (this.videoElement.mozRequestFullScreen) {
            this.videoElement.mozRequestFullScreen();
        }
    }

    /**
     * Exit fullscreen
     */
    exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        }
    }

    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (this.isFullscreen()) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    /**
     * Check if in fullscreen
     */
    isFullscreen() {
        return !!(document.fullscreenElement || 
                 document.webkitFullscreenElement || 
                 document.mozFullScreenElement);
    }

    /**
     * Get video metadata
     */
    getMetadata() {
        return {
            duration: this.getDuration(),
            currentTime: this.getCurrentTime(),
            volume: this.getVolume(),
            muted: this.isMuted(),
            paused: this.videoElement.paused,
            ended: this.videoElement.ended,
            readyState: this.videoElement.readyState,
            videoWidth: this.videoElement.videoWidth,
            videoHeight: this.videoElement.videoHeight
        };
    }

    /**
     * Update progress bar
     */
    updateProgress() {
        if (this.videoElement.duration) {
            const percentage = (this.videoElement.currentTime / this.videoElement.duration) * 100;
            
            if (this.progressBar) {
                this.progressBar.style.width = `${percentage}%`;
            }
            this.updateTimeDisplay();
        }
    }

    /**
     * Update time display
     */
    updateTimeDisplay() {
        if (this.timeDisplay) {
            const current = this.formatTime(this.videoElement.currentTime || 0);
            const duration = this.formatTime(this.videoElement.duration || 0);
            this.timeDisplay.textContent = `${current} / ${duration}`;
        }
    }

    /**
     * Update play/pause icon
     */
    updatePlayPauseIcon() {
        if (this.playPauseBtn) {
            const icon = this.playPauseBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        }
    }

    /**
     * Update volume icon
     */
    updateVolumeIcon() {
        if (this.muteBtn) {
            const icon = this.muteBtn.querySelector('i');
            if (icon) {
                const volume = this.videoElement.volume;
                if (this.videoElement.muted || volume === 0) {
                    icon.className = 'fas fa-volume-mute';
                } else if (volume < 0.5) {
                    icon.className = 'fas fa-volume-down';
                } else {
                    icon.className = 'fas fa-volume-up';
                }
            }
        }
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.videoElement.muted = !this.videoElement.muted;
        this.updateVolumeIcon();
        if (this.volumeSlider) {
            this.volumeSlider.value = this.videoElement.muted ? 0 : this.videoElement.volume * 100;
        }
    }

    /**
     * Handle progress bar dragging
     */
    handleProgressDrag(e) {
        if (!this.progressContainer) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        const rect = this.progressContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, clickX / rect.width));
        const duration = this.videoElement.duration;
        
        console.log(`🎯 Drag: ${percentage * 100}% at ${clickX}px of ${rect.width}px`);
        
        if (duration && !isNaN(duration) && duration > 0) {
            const newTime = duration * percentage;
            this.videoElement.currentTime = newTime;
            this.updateProgress(); // Force immediate visual update
        }
    }

    /**
     * Format time helper
     */
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Create Instagram-specific UI elements
     */
    createInstagramElements() {
        // Create image element for Instagram photos
        this.imageElement = document.createElement('img');
        this.imageElement.className = 'instagram-image';
        this.imageElement.style.cssText = `
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: none;
            background: #000;
            border-radius: 8px;
        `;
        this.videoContainer.appendChild(this.imageElement);
        
        // Create carousel controls container
        this.carouselControls = document.createElement('div');
        this.carouselControls.className = 'instagram-carousel-controls';
        this.carouselControls.style.cssText = `
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            transform: translateY(-50%);
            display: none;
            justify-content: space-between;
            padding: 0 20px;
            pointer-events: none;
            z-index: 5;
        `;
        
        // Create previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-nav-btn prev';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.style.cssText = `
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            pointer-events: auto;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        `;
        prevBtn.addEventListener('click', () => this.previousMedia());
        
        // Create next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-nav-btn next';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.style.cssText = prevBtn.style.cssText;
        nextBtn.addEventListener('click', () => this.nextMedia());
        
        this.carouselControls.appendChild(prevBtn);
        this.carouselControls.appendChild(nextBtn);
        this.videoContainer.appendChild(this.carouselControls);
        
        // Create media indicators
        this.mediaIndicators = document.createElement('div');
        this.mediaIndicators.className = 'instagram-media-indicators';
        this.mediaIndicators.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            display: none;
            gap: 4px;
            z-index: 5;
        `;
        this.videoContainer.appendChild(this.mediaIndicators);
        
        // Create media counter display
        this.mediaCounter = document.createElement('div');
        this.mediaCounter.className = 'instagram-media-counter';
        this.mediaCounter.style.cssText = `
            position: absolute;
            top: 15px;
            right: 15px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
            display: none;
            z-index: 5;
        `;
        this.videoContainer.appendChild(this.mediaCounter);
        
        // Add touch/swipe support for mobile
        this.setupTouchNavigation();
    }
    
    /**
     * Set up touch/swipe navigation for Instagram carousel
     */
    setupTouchNavigation() {
        let startX = null;
        let startTime = null;
        
        this.videoContainer.addEventListener('touchstart', (e) => {
            if (this.currentPlayerType === 'instagram' && this.mediaFiles.length > 1) {
                startX = e.touches[0].clientX;
                startTime = Date.now();
            }
        }, { passive: true });
        
        this.videoContainer.addEventListener('touchend', (e) => {
            if (this.currentPlayerType === 'instagram' && this.mediaFiles.length > 1 && startX !== null) {
                const endX = e.changedTouches[0].clientX;
                const endTime = Date.now();
                const diffX = startX - endX;
                const diffTime = endTime - startTime;
                
                // Only register as swipe if it's fast enough and far enough
                if (diffTime < 300 && Math.abs(diffX) > 50) {
                    if (diffX > 0) {
                        // Swiped left - go to next
                        this.nextMedia();
                    } else {
                        // Swiped right - go to previous
                        this.previousMedia();
                    }
                }
                
                startX = null;
                startTime = null;
            }
        }, { passive: true });
    }
    
    /**
     * Load Instagram media (images or videos)
     */
    async loadInstagramMedia(videoData, dataManager) {
        // Determine media files based on data source
        if (dataManager.dataSource === 'instagram' && videoData.shortcode && this.instagramDirectoryManager) {
            // For real Instagram archive mode with directory manager
            const mediaFile = this.instagramDirectoryManager.mediaFiles.get(videoData.shortcode);
            if (mediaFile) {
                this.mediaFiles = [{
                    filename: mediaFile.filename,
                    type: mediaFile.type
                }];
            } else {
                // No media file found for this shortcode
                this.mediaFiles = [];
                console.warn(`No media file found for shortcode: ${videoData.shortcode}`);
            }
        } else if (videoData.media_files) {
            // Demo mode or legacy format with media_files array
            this.mediaFiles = videoData.media_files;
        } else {
            // No media files available
            this.mediaFiles = [];
        }
        
        this.currentMediaIndex = 0;
        this.currentPlayerType = 'instagram';
        
        // Hide YouTube iframe if present
        if (this.youtubeIframe) {
            this.youtubeIframe.style.display = 'none';
        }
        
        // Update UI for Instagram content
        this.updateInstagramUI();
        
        // Load first media item if available
        if (this.mediaFiles.length > 0) {
            await this.loadMediaAtIndex(0, dataManager);
        } else {
            // Show error if no media available
            this.showError('No media files available for this post');
        }
        
        this.showLoading(false);
    }
    
    /**
     * Update Instagram UI elements
     */
    updateInstagramUI() {
        // Update aspect ratio for Instagram content
        if (this.videoContainer) {
            // Remove existing Instagram classes
            this.videoContainer.classList.remove('instagram-square', 'instagram-portrait', 'instagram-story');
            
            // Try to detect aspect ratio from post URL or assume square for Instagram
            const postUrl = this.currentVideo.url || '';
            if (postUrl.includes('/reel/') || postUrl.includes('/tv/')) {
                // Instagram Reels are typically 9:16 (vertical)
                this.videoContainer.style.aspectRatio = '9/16';
                this.videoContainer.classList.add('instagram-story');
            } else if (postUrl.includes('/p/')) {
                // Regular Instagram posts are typically square or portrait
                this.videoContainer.style.aspectRatio = '1/1';
                this.videoContainer.classList.add('instagram-square');
            } else {
                // Default to square for Instagram content
                this.videoContainer.style.aspectRatio = '1/1';
                this.videoContainer.classList.add('instagram-square');
            }
        }
        
        // Show/hide carousel controls based on media count
        if (this.mediaFiles.length > 1) {
            this.carouselControls.style.display = 'flex';
            this.mediaIndicators.style.display = 'flex';
            this.mediaCounter.style.display = 'block';
            this.createMediaIndicators();
            this.updateMediaCounter();
        } else {
            this.carouselControls.style.display = 'none';
            this.mediaIndicators.style.display = 'none';
            this.mediaCounter.style.display = 'none';
        }
    }
    
    /**
     * Create media indicator dots
     */
    createMediaIndicators() {
        this.mediaIndicators.innerHTML = '';
        
        for (let i = 0; i < this.mediaFiles.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'media-indicator-dot';
            dot.style.cssText = `
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.5);
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            
            if (i === this.currentMediaIndex) {
                dot.style.background = 'rgba(255, 255, 255, 1)';
                dot.style.transform = 'scale(1.2)';
            }
            
            dot.addEventListener('click', () => this.goToMedia(i));
            this.mediaIndicators.appendChild(dot);
        }
    }
    
    /**
     * Load media at specific index
     */
    async loadMediaAtIndex(index, dataManager) {
        const media = this.mediaFiles[index];
        if (!media) return;
        
        this.currentMediaIndex = index;
        this.updateMediaIndicators();
        this.updateMediaCounter();
        
        try {
            let mediaUrl;
            
            // Get media URL based on data source
            if (this.instagramDirectoryManager && dataManager.dataSource === 'instagram') {
                // Use DirectoryManager to get media URL
                mediaUrl = await this.instagramDirectoryManager.getFileURL(this.currentVideo.shortcode);
                const mediaInfo = this.instagramDirectoryManager.mediaFiles.get(this.currentVideo.shortcode);
                console.log(`📸 Loaded Instagram ${mediaInfo?.type || 'media'} from DirectoryManager: ${mediaInfo?.name || 'unknown'}`);
            } else {
                // Fallback to traditional path construction
                mediaUrl = `instadata/posts/${media.filename}`;
                console.log(`📸 Using traditional path: ${mediaUrl}`);
            }
            
            if (media.type && media.type.startsWith('image/')) {
                // Show image, hide video
                this.videoElement.style.display = 'none';
                this.imageElement.style.display = 'block';
                this.customControls.style.display = 'none';
                this.hidePlayOverlay();
                
                // Load image with error handling
                this.imageElement.onerror = () => {
                    console.error(`Failed to load Instagram image: ${media.filename}`);
                    this.showError('Failed to load Instagram image');
                };
                
                this.imageElement.onload = () => {
                    console.log(`📸 Instagram image loaded successfully: ${media.filename}`);
                };
                
                this.imageElement.src = mediaUrl;
                this.imageElement.alt = this.currentVideo.title;
            } else if (media.type && media.type.startsWith('video/')) {
                // Show video, hide image
                this.imageElement.style.display = 'none';
                this.videoElement.style.display = 'block';
                this.customControls.style.display = 'block';
                
                // Load video
                this.videoElement.src = mediaUrl;
                console.log(`🎥 Instagram video loaded: ${media.filename}`);
            }
        } catch (error) {
            console.error('Failed to load Instagram media:', error);
            this.showError('Failed to load Instagram media');
        }
        
        // Update navigation buttons
        this.updateNavigationButtons();
    }
    
    /**
     * Navigate to previous media
     */
    previousMedia() {
        if (this.currentMediaIndex > 0) {
            this.loadMediaAtIndex(this.currentMediaIndex - 1, window.app?.dataManager);
        }
    }
    
    /**
     * Navigate to next media
     */
    nextMedia() {
        if (this.currentMediaIndex < this.mediaFiles.length - 1) {
            this.loadMediaAtIndex(this.currentMediaIndex + 1, window.app?.dataManager);
        }
    }
    
    /**
     * Go to specific media by index
     */
    goToMedia(index) {
        if (index >= 0 && index < this.mediaFiles.length) {
            this.loadMediaAtIndex(index, window.app?.dataManager);
        }
    }
    
    /**
     * Update media indicator dots
     */
    updateMediaIndicators() {
        const dots = this.mediaIndicators.querySelectorAll('.media-indicator-dot');
        dots.forEach((dot, i) => {
            if (i === this.currentMediaIndex) {
                dot.style.background = 'rgba(255, 255, 255, 1)';
                dot.style.transform = 'scale(1.2)';
            } else {
                dot.style.background = 'rgba(255, 255, 255, 0.5)';
                dot.style.transform = 'scale(1)';
            }
        });
    }
    
    /**
     * Update media counter display
     */
    updateMediaCounter() {
        if (this.mediaCounter && this.mediaFiles.length > 1) {
            this.mediaCounter.textContent = `${this.currentMediaIndex + 1}/${this.mediaFiles.length}`;
        }
    }
    
    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const prevBtn = this.carouselControls.querySelector('.prev');
        const nextBtn = this.carouselControls.querySelector('.next');
        
        if (prevBtn) {
            prevBtn.style.opacity = this.currentMediaIndex === 0 ? '0.5' : '1';
            prevBtn.disabled = this.currentMediaIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.style.opacity = this.currentMediaIndex === this.mediaFiles.length - 1 ? '0.5' : '1';
            nextBtn.disabled = this.currentMediaIndex === this.mediaFiles.length - 1;
        }
    }
    
    /**
     * Reset media state
     */
    resetMedia() {
        this.currentMediaIndex = 0;
        this.mediaFiles = [];
        
        // Hide Instagram elements
        if (this.imageElement) {
            this.imageElement.style.display = 'none';
            this.imageElement.src = '';
        }
        
        if (this.carouselControls) {
            this.carouselControls.style.display = 'none';
        }
        
        if (this.mediaIndicators) {
            this.mediaIndicators.style.display = 'none';
            this.mediaIndicators.innerHTML = '';
        }
        
        if (this.mediaCounter) {
            this.mediaCounter.style.display = 'none';
        }
        
        // Reset aspect ratio to default and remove Instagram classes
        if (this.videoContainer) {
            this.videoContainer.style.aspectRatio = '16/9';
            this.videoContainer.classList.remove('instagram-square', 'instagram-portrait', 'instagram-story');
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        this.pause();
        this.videoElement.src = '';
        this.videoElement.load();
        this.currentVideo = null;
        this.resetMedia();
    }

    /**
     * Set video poster with fallback logic
     */
    async setVideoPoster(videoId) {
        const thumbnailUrls = [
            `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
            `https://img.youtube.com/vi/${videoId}/default.jpg`
        ];
        
        for (const url of thumbnailUrls) {
            try {
                const success = await this.testThumbnailUrl(url);
                if (success) {
                    this.videoElement.poster = url;
                    console.log(`🎞️ Set video poster: ${url}`);
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        
        // If all fail, don't set a poster
        console.log(`🎞️ No valid poster found for video: ${videoId}`);
    }

    /**
     * Test if a thumbnail URL is valid
     */
    testThumbnailUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                if (img.naturalWidth > 120 && img.naturalHeight > 90) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            
            img.onerror = () => resolve(false);
            
            setTimeout(() => resolve(false), 2000);
            
            img.src = url;
        });
    }
}

// Utility functions for video handling
class VideoUtils {
    /**
     * Generate video thumbnail URL from YouTube
     */
    static getYouTubeThumbnail(videoId, quality = 'maxresdefault') {
        // Available qualities: default, mqdefault, hqdefault, sddefault, maxresdefault
        return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
    }

    /**
     * Extract video ID from YouTube URL
     */
    static extractVideoId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    /**
     * Generate YouTube embed URL
     */
    static getYouTubeEmbedUrl(videoId, options = {}) {
        const params = new URLSearchParams({
            autoplay: options.autoplay ? '1' : '0',
            mute: options.mute ? '1' : '0',
            controls: options.controls !== false ? '1' : '0',
            start: options.start || '0',
            ...options.extraParams
        });
        
        return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }

    /**
     * Check if browser supports video format
     */
    static canPlayFormat(format) {
        const video = document.createElement('video');
        return video.canPlayType(format) !== '';
    }

    /**
     * Get supported video formats
     */
    static getSupportedFormats() {
        const video = document.createElement('video');
        const formats = {
            mp4: video.canPlayType('video/mp4'),
            webm: video.canPlayType('video/webm'),
            ogg: video.canPlayType('video/ogg'),
            mov: video.canPlayType('video/quicktime')
        };
        
        return Object.entries(formats)
            .filter(([format, support]) => support !== '')
            .map(([format, support]) => ({ format, support }));
    }
}

// Export for use in other modules
window.VideoPlayer = VideoPlayer;
window.VideoUtils = VideoUtils; 