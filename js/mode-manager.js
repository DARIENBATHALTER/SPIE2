/**
 * ModeManager - Handles Instagram Archive mode
 * Provides unified interface for Instagram media sources
 */
class ModeManager {
    constructor() {
        this.currentMode = 'instagram'; // Default to Instagram mode
        this.directoryManager = new DirectoryManager();
        this.videoMapping = null;
        
        console.log('🎛️ ModeManager initialized for Instagram');
    }

    /**
     * Set application mode
     */
    setMode(mode) {
        this.currentMode = mode;
        console.log(`🎛️ Mode set to: ${mode}`);
        
        // Update UI to reflect current mode
        this.updateModeIndicator();
    }

    /**
     * Get current mode
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * Check if current mode is local archive
     */
    isLocalMode() {
        return this.currentMode === 'local';
    }

    /**
     * Check if current mode is YouTube
     */
    isYouTubeMode() {
        return this.currentMode === 'youtube';
    }

    /**
     * Check if current mode is Instagram
     */
    isInstagramMode() {
        return this.currentMode === 'instagram';
    }

    /**
     * Initialize Local Archive mode
     */
    async initializeLocalMode() {
        try {
            console.log('🎛️ Initializing Local Archive mode...');
            
            // Check File System Access API support
            if (this.directoryManager.isSupported) {
                // Request directory access
                await this.directoryManager.requestDirectory();
                
                // Scan directory for files
                const scanResult = await this.directoryManager.scanDirectory();
                
                // Load video mapping from server
                const response = await fetch('data/video-mapping.json');
                if (!response.ok) {
                    throw new Error('video-mapping.json not found on server');
                }
                this.videoMapping = await response.json();
                
                console.log(`🎛️ Local mode initialized: ${scanResult.videoFiles.size} files found`);
                return {
                    success: true,
                    directoryName: this.directoryManager.getDirectoryName(),
                    fileCount: scanResult.videoFiles.size
                };
            } else {
                // Fallback to local server mode
                console.log('🎛️ Using local server fallback');
                return {
                    success: true,
                    directoryName: 'Local Server',
                    fileCount: 'Available via localhost:8080'
                };
            }
        } catch (error) {
            console.error('🎛️ Failed to initialize local mode:', error);
            throw error;
        }
    }

    /**
     * Initialize YouTube mode
     */
    async initializeYouTubeMode() {
        try {
            console.log('🎛️ Initializing YouTube mode...');
            
            // Just load the video mapping for metadata
            const response = await fetch('data/video-mapping.json');
            if (!response.ok) {
                throw new Error('video-mapping.json not found on server');
            }
            this.videoMapping = await response.json();
            
            console.log('🎛️ YouTube mode initialized successfully');
            return {
                success: true,
                message: 'YouTube mode ready - videos will stream from YouTube'
            };
        } catch (error) {
            console.error('🎛️ Failed to initialize YouTube mode:', error);
            throw error;
        }
    }

    /**
     * Get video source URL based on current mode
     */
    async getVideoSource(videoId, filePath) {
        if (this.currentMode === 'local') {
            if (this.directoryManager.isSupported && this.directoryManager.isDirectorySelected()) {
                // Use File System Access API
                return await this.directoryManager.getVideoBlob(filePath);
            } else {
                // Use local server
                return filePath;
            }
        } else if (this.currentMode === 'youtube') {
            // Return YouTube embed URL
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
        }
        
        throw new Error(`Unknown mode: ${this.currentMode}`);
    }

    /**
     * Get video player type based on current mode
     */
    getPlayerType() {
        return this.currentMode === 'youtube' ? 'youtube' : 'local';
    }

    /**
     * Update mode indicator in header
     */
    updateModeIndicator() {
        const header = document.querySelector('.navbar-brand span');
        if (header) {
            // Keep the title simple, let the badge show the mode
            header.textContent = 'MM Instagram Archive Explorer';
        }

        // Remove any existing mode badge
        const existingBadge = document.querySelector('.mode-badge');
        if (existingBadge) {
            existingBadge.remove();
        }
    }

    /**
     * Switch modes (for future enhancement)
     */
    async switchMode(newMode) {
        if (newMode === this.currentMode) {
            return;
        }

        console.log(`🎛️ Switching from ${this.currentMode} to ${newMode}`);
        
        if (newMode === 'local') {
            await this.initializeLocalMode();
        } else if (newMode === 'youtube') {
            await this.initializeYouTubeMode();
        }

        this.setMode(newMode);
    }

    /**
     * Get statistics for current mode
     */
    getStats() {
        return {
            mode: this.currentMode,
            isLocalMode: this.isLocalMode(),
            isYouTubeMode: this.isYouTubeMode(),
            hasDirectoryAccess: this.directoryManager?.isDirectorySelected() || false,
            directoryName: this.directoryManager?.getDirectoryName() || null
        };
    }
}

// Export for use in other modules
window.ModeManager = ModeManager; 