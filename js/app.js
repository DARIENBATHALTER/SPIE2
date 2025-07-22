/**
 * Medical Medium Archive Explorer - Main Application
 * Coordinates all components and manages application state
 */
class ArchiveExplorer {
    constructor() {
        this.dataManager = new DataManager();
        this.exportService = new ExportService();
        this.modeManager = new ModeManager();
        this.videoPlayer = null;
        
        // Application state
        this.currentView = 'videos'; // 'videos' or 'video-detail'
        this.currentVideo = null;
        this.currentFilters = {};
        this.currentPagination = { page: 1, limit: 24 };
        this.currentCommentPagination = { page: 1, limit: 50 };
        
        // UI elements
        this.elements = {};
        
        // Components
        this.videoGridComponent = null;
        this.commentListComponent = null;
        
        // View mode
        this.currentViewMode = 'grid';
        
        // List view sorting state
        this.currentListSort = { field: 'date', direction: 'desc' };
        
        // Analytics filter state
        this.analyticsFilter = null;
        this.originalComments = null;
        
        this.initializeApp();
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(message, percentage) {
        const loadingStatus = document.getElementById('loadingStatus');
        const loadingProgress = document.getElementById('loadingProgress');
        
        if (loadingStatus) {
            loadingStatus.textContent = message;
        } else {
            console.log(`⚠️ Loading progress elements not available: ${message} ${percentage}`);
        }
        
        if (loadingProgress) {
            loadingProgress.style.width = `${percentage}%`;
            loadingProgress.setAttribute('aria-valuenow', percentage);
        }
        
        console.log(`📊 Loading: ${percentage}% - ${message}`);
        
        // Also update app loading overlay
        this.updateAppLoadingProgress(message, percentage);
    }
    
    /**
     * Update app loading overlay progress
     */
    updateAppLoadingProgress(message, percentage) {
        const appLoadingStatus = document.getElementById('appLoadingStatus');
        
        if (appLoadingStatus) appLoadingStatus.textContent = message;
    }
    
    /**
     * Hide app loading overlay with fade animation
     */
    hideAppLoadingOverlay() {
        const overlay = document.getElementById('appLoadingOverlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 500); // Match CSS transition duration
        }
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        try {
            // Cache DOM elements first
            this.cacheElements();
            
            // Check if we have pending custom post data
            if (window.pendingCustomPost) {
                console.log('🚀 SPIE: Loading custom post from upload...');
                // Show loading screen for custom post
                document.getElementById('loadingScreen').style.display = 'flex';
                document.getElementById('directorySelectionModal').style.display = 'none';
                await this.loadCustomPost(window.pendingCustomPost);
                window.pendingCustomPost = null;
                return;
            }
            
            // SPIE: Show welcome screen on initial load
            console.log('🚀 SPIE: Showing welcome screen...');
            
            // Show welcome modal 
            document.getElementById('directorySelectionModal').style.display = 'flex';
            // Hide loading screens initially
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('appLoadingOverlay').style.display = 'none';
            document.getElementById('app').style.display = 'none';
            
            // If no custom data, wait for user input
            return;
            
            // Update loading progress
            this.updateLoadingProgress('Finalizing...', 90);
            
            // Small delay to show completion
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Complete loading
            this.updateLoadingProgress('Complete!', 100);
            
            // Another small delay before hiding loader
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Hide both loading screens and show app
            this.hideAppLoadingOverlay();
            this.elements.loadingScreen.style.display = 'none';
            this.elements.app.style.display = 'block';
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to load the post. Please refresh the page.');
        }
    }

    /**
     * Load archive directly without welcome screen
     */
    async loadArchiveDirectly() {
        try {
            console.log('🚀 Loading archive directly...');
            
            // Transform modal to loading state instead of hiding/showing
            this.transformModalToLoading();
            
            // Set Instagram mode (default)
            this.modeManager.setMode('instagram');
            this.dataManager.dataSource = 'instagram';
            
            // Start the app (bypass old loading screen)
            this.bypassOldLoading = true;
            await this.startApp();
            
            // Hide loading and show app
            this.hideUnifiedLoading();
            this.elements.app.style.display = 'block';
            
        } catch (error) {
            console.error('❌ Failed to load archive directly:', error);
            this.hideUnifiedLoading();
            this.elements.app.style.display = 'block';
            this.showError('Failed to load the archive. Please try refreshing the page.');
        }
    }

    /**
     * Show minimal loading indicator (just progress wheel)
     */
    showMinimalLoading() {
        // Setup console output capture and progress tracking immediately
        this.setupConsoleCapture();
        this.commentLoadingProgress = 0;
        this.totalExpectedComments = 2400000; // Updated for 2.4M comments
        
        // Create a simple spinner if it doesn't exist
        let spinner = document.getElementById('minimalSpinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'minimalSpinner';
            spinner.innerHTML = `
                <div style="
                    position: fixed; 
                    top: 0; 
                    left: 0; 
                    width: 100vw; 
                    height: 100vh; 
                    background: #050505; 
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <canvas id="loadingNetworkCanvas" style="
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        z-index: 1;
                    "></canvas>
                    <div class="gradient-background">
                        <div class="sphere-1 gradient-sphere"></div>
                        <div class="sphere-2 gradient-sphere"></div>
                        <div class="sphere-3 gradient-sphere"></div>
                        <div class="glow"></div>
                        <div class="noise-overlay"></div>
                        <div class="grid-overlay"></div>
                    </div>
                    <div style="
                        background: white;
                        padding: 40px;
                        border-radius: 16px;
                        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 2px 10px rgba(0, 0, 0, 0.1);
                        max-width: 400px;
                        width: 90%;
                        text-align: center;
                        position: relative;
                        z-index: 10;
                    ">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted" style="font-size: 14px;">Loading Instagram Archive</p>
                    </div>
                    <div id="consoleOutput" style="
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        width: 450px;
                        max-height: 180px;
                        overflow: hidden;
                        font-family: 'Monaco', 'Menlo', monospace;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #e8e8e8;
                        pointer-events: none;
                        z-index: 10;
                    "></div>
                </div>
            `;
            document.body.appendChild(spinner);
        }
        spinner.style.display = 'block';
        
        // Start network animation after a short delay to ensure canvas is in DOM
        setTimeout(() => {
            if (!this.loadingNetworkAnimation) {
                this.loadingNetworkAnimation = new NetworkAnimation('loadingNetworkCanvas');
            }
        }, 50);
    }

    /**
     * Transform modal to loading state for seamless transition
     */
    transformModalToLoading() {
        // Setup console output capture and progress tracking immediately
        this.setupConsoleCapture();
        this.commentLoadingProgress = 0;
        this.totalExpectedComments = 2400000; // Updated for 2.4M comments
        
        const modal = document.getElementById('directorySelectionModal');
        const modalContent = modal.querySelector('.directory-modal-content');
        
        if (modal && modalContent) {
            // Keep the modal visible but transform its content
            modal.style.display = 'flex';
            
            // Smoothly fade out the current content
            modalContent.style.transition = 'opacity 0.3s ease';
            modalContent.style.opacity = '0';
            
            setTimeout(() => {
                // Replace modal content with loading content
                modalContent.innerHTML = `
                    <div style="
                        background: white;
                        padding: 40px;
                        border-radius: 16px;
                        text-align: center;
                        max-width: 400px;
                        width: 100%;
                        position: relative;
                        z-index: 10;
                    ">
                        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3 text-muted" style="font-size: 14px;">Loading Instagram Archive</p>
                    </div>
                    <div id="consoleOutput" style="
                        position: fixed;
                        bottom: 20px;
                        right: 20px;
                        width: 450px;
                        max-height: 180px;
                        overflow: hidden;
                        font-family: 'Monaco', 'Menlo', monospace;
                        font-size: 11px;
                        line-height: 1.4;
                        color: #e8e8e8;
                        pointer-events: none;
                        z-index: 10;
                    "></div>
                `;
                
                // Fade in the new content
                modalContent.style.opacity = '1';
            }, 300);
        }
    }

    /**
     * Hide unified loading screen
     */
    hideUnifiedLoading() {
        // Restore original console if we captured it
        this.restoreConsole();
        
        // Hide the modal
        const modal = document.getElementById('directorySelectionModal');
        if (modal) {
            modal.style.transition = 'opacity 0.3s ease';
            modal.style.opacity = '0';
            setTimeout(() => {
                modal.style.display = 'none';
                modal.style.opacity = '1'; // Reset for next time
            }, 300);
        }
        
        // Ensure any other loading screens are hidden
        this.elements.loadingScreen.style.display = 'none';
        const spinner = document.getElementById('minimalSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    /**
     * Hide loading indicators
     */
    hideLoading() {
        // Restore original console if we captured it
        this.restoreConsole();
        
        // Hide the minimal spinner
        const spinner = document.getElementById('minimalSpinner');
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // Ensure loading screen is hidden
        this.elements.loadingScreen.style.display = 'none';
    }
    
    /**
     * Setup console output capture for loading screen
     */
    setupConsoleCapture() {
        if (this.originalConsole) return; // Already setup
        
        this.originalConsole = console.log;
        this.consoleMessages = [];
        
        console.log = (...args) => {
            // Call original console.log
            this.originalConsole.apply(console, args);
            
            // Add to our display
            const message = args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
            ).join(' ');
            
            this.addConsoleMessage(message);
        };
        
        // Console capture is now active
        console.log('🎯 Console capture initialized');
    }
    
    /**
     * Restore original console
     */
    restoreConsole() {
        if (this.originalConsole) {
            console.log = this.originalConsole;
            this.originalConsole = null;
        }
    }
    
    /**
     * Add a message to the console output display
     */
    addConsoleMessage(message) {
        this.consoleMessages = this.consoleMessages || [];
        this.consoleMessages.push(message);
        
        // Keep only the last 6 messages
        if (this.consoleMessages.length > 6) {
            this.consoleMessages.shift();
        }
        
        this.updateConsoleDisplay();
    }
    
    /**
     * Update the console display with fade effect
     */
    updateConsoleDisplay() {
        const consoleOutput = document.getElementById('consoleOutput');
        if (!consoleOutput || !this.consoleMessages) return;
        
        const html = this.consoleMessages.map((message, index) => {
            const opacity = (index + 1) / 6; // Fade from 1/6 to 6/6 opacity
            return `<div style="opacity: ${opacity}; margin-bottom: 2px;">${this.escapeHTML(message)}</div>`;
        }).join('');
        
        consoleOutput.innerHTML = html;
    }
    
    /**
     * Update comment loading progress
     */
    updateCommentLoadingProgress(commentsLoaded, fileName = '') {
        this.commentLoadingProgress = commentsLoaded;
        const progressPercent = Math.min((commentsLoaded / this.totalExpectedComments) * 100, 100);
        
        // Throttle progress reporting - only update every 1000 comments or major milestones
        const shouldUpdate = commentsLoaded % 1000 === 0 || 
                           progressPercent >= 100 || 
                           commentsLoaded === 1 ||
                           commentsLoaded % 10000 === 0;
        
        if (shouldUpdate) {
            // Create ASCII progress bar
            const barLength = 30;
            const filledLength = Math.floor((progressPercent / 100) * barLength);
            const emptyLength = barLength - filledLength;
            const progressBar = '█'.repeat(filledLength) + '░'.repeat(emptyLength);
            
            // Log progress with ASCII bar
            console.log(`[${progressBar}] ${progressPercent.toFixed(1)}% - ${commentsLoaded.toLocaleString()} comments`);
        }
        
        // Log individual file loading only for first few files or errors
        if (fileName && (commentsLoaded <= 5000 || commentsLoaded % 5000 === 0)) {
            console.log(`📄 Latest: ${fileName}`);
        }
    }

    /**
     * Show mode selection modal
     */
    showModeSelection() {
        const modal = document.getElementById('directorySelectionModal');
        const modeSelection = document.getElementById('modeSelection');
        const localArchiveSetup = document.getElementById('localArchiveSetup');
        
        // Show modal and mode selection
        modal.style.display = 'flex';
        modeSelection.style.display = 'block';
        localArchiveSetup.style.display = 'none';
        
        // Set up mode selection event listeners
        this.setupModeEventListeners();
        
        // Start network animation for welcome screen
        setTimeout(() => {
            if (!this.welcomeNetworkAnimation) {
                this.welcomeNetworkAnimation = new NetworkAnimation('welcomeNetworkCanvas');
            }
        }, 50);
    }

    /**
     * Set up event listeners for mode selection
     */
    setupModeEventListeners() {
        const selectInstagramBtn = document.getElementById('selectInstagramBtn');
        
        // Make entire card clickable
        const instagramCard = document.getElementById('instagramCard');
        
        // Instagram Mode Selection (entire card clickable)
        if (instagramCard) {
            instagramCard.addEventListener('click', async (e) => {
                // Prevent double-click if clicking on button
                if (e.target.tagName === 'BUTTON') return;
                await this.handleInstagramModeSelection();
            });
        }
        
        if (selectInstagramBtn) {
            selectInstagramBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent card click
                await this.handleInstagramModeSelection();
            });
        }

        // Demo Mode Selection
        const demoCard = document.getElementById('demoCard');
        const selectDemoBtn = document.getElementById('selectDemoBtn');
        
        if (demoCard) {
            demoCard.addEventListener('click', async (e) => {
                // Prevent double-click if clicking on button
                if (e.target.tagName === 'BUTTON') return;
                await this.handleDemoModeSelection();
            });
        }
        
        if (selectDemoBtn) {
            selectDemoBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent card click
                await this.handleDemoModeSelection();
            });
        }

        // Directory selection button
        const selectDirectoryBtn = document.getElementById('selectDirectoryBtn');
        if (selectDirectoryBtn) {
            selectDirectoryBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.handleDirectorySelection();
            });
        }

        // Back to mode selection button
        const backToModeBtn = document.getElementById('backToModeSelection');
        if (backToModeBtn) {
            backToModeBtn.addEventListener('click', () => {
                this.showModeSelection();
            });
        }
    }

    /**
     * Handle mode selection using File System Access API
     */
    async handleModeSelection() {
        try {
            this.showModeStatus('Requesting mode access...');
            
            // Request mode access
            await this.modeManager.requestMode();
            
            this.showModeStatus('Scanning mode for videos...');
            
            // Scan mode for files (only video files, not metadata)
            const scanResult = await this.modeManager.scanMode();
            
            this.showModeStatus('Loading video metadata from server...');
            
            // Load video mapping from hosted data folder (not from user's directory)
            const response = await fetch('data/video-mapping.json');
            if (!response.ok) {
                throw new Error('video-mapping.json not found on server. Please ensure it\'s deployed with the app.');
            }
            const videoMapping = await response.json();
            
            // Update UI with success
            console.log(`📊 Mode scan results: ${scanResult.videoFiles.size} video files found`);
            
            this.showModeSuccess(
                this.modeManager.getModeName()
            );
            
            // Store the video mapping for later use
            this.videoMapping = videoMapping;
            
        } catch (error) {
            console.error('Mode selection failed:', error);
            this.showModeError(error.message);
        }
    }

    /**
     * Handle Instagram mode selection
     */
    async handleInstagramModeSelection() {
        try {
            console.log('🎛️ User selected Instagram mode');
            
            // Set mode and configure data manager
            this.modeManager.setMode('instagram');
            this.dataManager.dataSource = 'instagram';
            
            // Initialize directory manager for Instagram
            this.directoryManager = new ArchiveDirectoryManager();
            
            // Open file dialog immediately without showing intermediate screens
            await this.directoryManager.requestArchiveDirectory();
            
            // Hide the mode selection modal after successful selection
            this.hideModeSelection();
            
            // Show loading screen and process the archive
            this.showMinimalLoading();
            this.updateMinimalLoadingStatus('Loading Instagram Archive...');
            
            // Load archive data
            const scanResult = await this.directoryManager.loadArchiveData((status, percent) => {
                this.updateMinimalLoadingStatus(status);
            });
            
            console.log(`📊 Instagram scan results: ${scanResult.totalMedia} media files, ${scanResult.totalPosts} posts`);
            
            // Store for later use
            this.instagramDirectoryManager = this.directoryManager;
            
            // Start the app directly with Instagram archive
            await this.startAppWithInstagramArchive();
            
            // Hide loading and show app
            this.hideLoading();
            this.elements.app.style.display = 'block';
            
        } catch (error) {
            console.error('Instagram mode initialization failed:', error);
            this.hideLoading();
            this.showModeSelection();
            
            // Show user-friendly error message and suggest demo mode
            const userMessage = `Failed to load your Instagram archive. This might be due to corrupted files or access issues. You can try the Demo Mode to explore the interface with sample data.`;
            this.showModeError(userMessage);
            
            // Auto-suggest demo mode after a short delay
            setTimeout(() => {
                this.showDemoSuggestion();
            }, 3000);
        }
    }

    /**
     * Handle Demo mode selection
     */
    async handleDemoModeSelection() {
        try {
            console.log('🎛️ User selected Demo mode');
            
            this.showModeStatus('Loading demo data...');
            
            // Set mode and configure data manager for demo
            this.modeManager.setMode('instagram');
            this.dataManager.dataSource = 'instagram';
            
            // Auto-close modal and start app with demo data
            setTimeout(() => {
                this.hideModeSelection();
                this.startApp(); // Use original startApp method for demo
            }, 1000);
            
        } catch (error) {
            console.error('Demo mode initialization failed:', error);
            this.showModeError(error.message);
        }
    }

    /**
     * Show local archive setup screen
     */
    showLocalArchiveSetup() {
        const modeSelection = document.getElementById('modeSelection');
        const localArchiveSetup = document.getElementById('localArchiveSetup');
        const apiSupported = document.getElementById('directoryApiSupported');
        const apiNotSupported = document.getElementById('directoryApiNotSupported');
        
        // Hide mode selection, show local archive setup
        modeSelection.style.display = 'none';
        localArchiveSetup.style.display = 'block';
        
        // Check File System Access API support
        const tempDirectoryManager = new ArchiveDirectoryManager();
        if (tempDirectoryManager.isSupported) {
            apiSupported.style.display = 'block';
            apiNotSupported.style.display = 'none';
        } else {
            apiSupported.style.display = 'none';
            apiNotSupported.style.display = 'block';
        }
    }

    /**
     * Handle directory selection using File System Access API
     */
    async handleDirectorySelection() {
        try {
            this.showModeStatus('Requesting directory access...');
            
            if (this.dataSource === 'instagram' || this.dataManager.dataSource === 'instagram') {
                // Handle Instagram archive directory selection
                await this.handleInstagramDirectorySelection();
            } else {
                // Handle YouTube directory selection (original functionality)
                const result = await this.modeManager.initializeLocalMode();
                
                // Show success toast and auto-close modal
                this.showSuccessToast('Videos loaded successfully!');
                
                // Auto-close modal after brief delay
                setTimeout(() => {
                    this.hideModeSelection();
                    this.startApp();
                }, 1500);
            }
            
        } catch (error) {
            console.error('Directory selection failed:', error);
            this.showModeError(error.message);
        }
    }

    /**
     * Handle Instagram archive directory selection
     */
    async handleInstagramDirectorySelection() {
        try {
            // Initialize directory manager for Instagram
            this.directoryManager = new ArchiveDirectoryManager();
            
            this.showModeStatus('Select your mm_instagram_archive folder...');
            
            // Request directory access
            await this.directoryManager.requestArchiveDirectory();
            
            this.showModeStatus('Scanning Instagram archive...');
            
            // Load archive data
            const scanResult = await this.directoryManager.loadArchiveData((status, percent) => {
                this.showModeStatus(status);
            });
            
            console.log(`📊 Instagram scan results: ${scanResult.totalMedia} media files, ${scanResult.totalPosts} posts`);
            
            // Show success message
            this.showDirectorySuccess(
                this.directoryManager.getDirectoryName(),
                `${scanResult.totalPosts.toLocaleString()} posts, ${scanResult.totalMedia.toLocaleString()} media files`
            );
            
            // Store for later use
            this.instagramDirectoryManager = this.directoryManager;
            
        } catch (error) {
            console.error('Instagram directory selection failed:', error);
            this.showModeError(error.message);
        }
    }


    /**
     * Update minimal loading status
     */
    updateMinimalLoadingStatus(message) {
        const spinner = document.getElementById('minimalSpinner');
        if (spinner) {
            const statusText = spinner.querySelector('p');
            const countdownDiv = document.getElementById('loadingCountdown');
            
            if (statusText) {
                statusText.textContent = message;
                
                // Check if this is the final message
                if (message === 'Archive loaded successfully') {
                    statusText.innerHTML = 'Parsing comments and preparing interface, please wait.';
                }
            }
        }
    }

    /**
     * Show directory success status
     */
    showDirectorySuccess(directoryName, fileInfo) {
        const statusDiv = document.getElementById('directoryStatus');
        const errorDiv = document.getElementById('directoryError');
        const apiMethods = document.querySelectorAll('.api-method');
        
        // Hide other sections
        apiMethods.forEach(el => el.style.display = 'none');
        if (errorDiv) errorDiv.style.display = 'none';
        
        // Show success status
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i>
                    <strong>Archive loaded:</strong> ${directoryName}
                    <br>
                    <small>${fileInfo}</small>
                </div>
                <button id="continueToAppBtn" class="btn btn-success btn-lg">
                    <i class="bi bi-play-circle"></i> Continue to Explorer
                </button>
            `;
            statusDiv.style.display = 'block';
            
            // Add event listener to continue button
            const continueBtn = document.getElementById('continueToAppBtn');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    this.hideModeSelection();
                    this.startAppWithInstagramArchive();
                });
            }
        }
    }

    /**
     * Handle local server mode (fallback)
     */
    handleLocalServerMode() {
        // Set mode to local (non-File System Access API)
        this.modeManager.setMode('local');
        
        // Hide directory selection and start app normally
        this.hideModeSelection();
        this.startApp();
    }

    /**
     * Start app with Instagram archive
     */
    async startAppWithInstagramArchive() {
        try {
            // Show loading screen
            this.elements.loadingScreen.style.display = 'flex';
            
            const progressCallback = (message, progress) => {
                this.updateLoadingProgress(message, progress);
            };
            
            // Initialize data manager with Instagram archive
            await this.dataManager.initializeFromInstagramArchive(this.instagramDirectoryManager, progressCallback);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Initialize video player with directory manager for media access
            this.videoPlayer = new VideoPlayer(
                document.getElementById('videoPlayer'),
                document.getElementById('videoFallback'),
                this.modeManager,
                this.instagramDirectoryManager
            );
            
            // Load initial posts grid
            await this.loadVideoGrid();
            
            // Update stats
            this.updateStats();
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            console.log('🎉 Instagram Archive Explorer initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize Instagram archive:', error);
            
            // Try to hide loading screen even if initialization fails
            this.elements.loadingScreen.style.display = 'none';
            this.elements.app.style.display = 'block';
            
            this.showError('Failed to load the Instagram archive. Please refresh the page.');
        }
    }

    /**
     * Start the main application after mode setup
     */
    async startApp() {
        try {
            // Show loading screen only if not bypassing
            if (!this.bypassOldLoading) {
                this.elements.loadingScreen.style.display = 'flex';
                this.updateLoadingProgress('Initializing application...', 10);
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            if (!this.bypassOldLoading) {
                this.updateLoadingProgress('Loading video data...', 30);
            }
            
            // Initialize data manager based on current mode
            if (this.modeManager.isLocalMode() && this.modeManager.directoryManager.isDirectorySelected()) {
                // Use File System Access API data with server metadata
                await this.dataManager.initializeFromHostedMapping(this.modeManager.videoMapping);
            } else {
                // Use traditional local server approach or YouTube mode (both use same metadata)
                await this.dataManager.initialize();
            }
            
            if (!this.bypassOldLoading) {
                this.updateLoadingProgress('Optimizing search indexes...', 70);
                await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for user feedback
                this.updateLoadingProgress('Setting up export services...', 90);
            }
            
            // Initialize export service
            this.exportService = new ExportService();
            
            // Initialize video player with mode manager
            this.videoPlayer = new VideoPlayer(
                document.getElementById('videoPlayer'),
                document.getElementById('videoFallback'),
                this.modeManager
            );
            
            if (!this.bypassOldLoading) {
                this.updateLoadingProgress('Ready!', 100);
            }
            
            // Load initial video grid
            await this.loadVideoGrid();
            
            // Update stats
            this.updateStats();
            
            // Hide loading screen and show app (only if using old loading)
            if (!this.bypassOldLoading) {
                this.hideLoadingScreen();
            }
            
            // Check for enhanced ZIP capabilities
            setTimeout(() => {
                this.checkZipCapabilities();
            }, 1000);
            
            console.log(`🎉 Archive Explorer initialized successfully in ${this.modeManager.getCurrentMode()} mode!`);
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            
            // Try to hide loading screen even if initialization fails
            this.elements.loadingScreen.style.display = 'none';
            this.elements.app.style.display = 'block';
            
            this.showError('Failed to load the archive. Please refresh the page.');
        }
    }

    /**
     * UI helper methods for mode selection
     */
    showModeStatus(message) {
        const statusDiv = document.getElementById('directoryStatus');
        const errorDiv = document.getElementById('directoryError');
        const apiMethods = document.querySelectorAll('.api-method');
        
        // Hide other sections
        apiMethods.forEach(el => el.style.display = 'none');
        if (errorDiv) errorDiv.style.display = 'none';
        
        // Show status with loading message
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p>${message}</p>
                </div>
            `;
            statusDiv.style.display = 'block';
        }
    }

    showModeSuccess(modeName) {
        const statusDiv = document.getElementById('directoryStatus');
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    <i class="bi bi-check-circle"></i>
                    <strong>Mode loaded:</strong> ${modeName}
                    <br>
                    <small>Ready to explore videos</small>
                </div>
                <button id="continueToAppBtn" class="btn btn-success btn-lg">
                    <i class="bi bi-play-circle"></i> Continue to App
                </button>
            `;
            statusDiv.style.display = 'block';
            
            // Re-attach event listener
            const continueBtn = document.getElementById('continueToAppBtn');
            if (continueBtn) {
                continueBtn.addEventListener('click', () => {
                    this.hideModeSelection();
                    this.startApp();
                });
            }
        }
    }

    showModeError(message) {
        const errorDiv = document.getElementById('directoryError');
        const errorMessage = document.getElementById('errorMessage');
        const statusDiv = document.getElementById('directoryStatus');
        
        if (statusDiv) statusDiv.style.display = 'none';
        if (errorMessage) errorMessage.textContent = message;
        if (errorDiv) errorDiv.style.display = 'block';
    }

    hideModeError() {
        const errorDiv = document.getElementById('directoryError');
        if (errorDiv) errorDiv.style.display = 'none';
    }

    showDemoSuggestion() {
        const demoCard = document.getElementById('demoCard');
        if (demoCard) {
            // Add a subtle animation to draw attention to demo mode
            demoCard.style.border = '2px solid #007bff';
            demoCard.style.boxShadow = '0 8px 25px rgba(0, 123, 255, 0.3)';
            demoCard.style.transform = 'translateY(-4px)';
            
            // Add a "Try this instead" message
            const existingHint = demoCard.querySelector('.demo-hint');
            if (!existingHint) {
                const hint = document.createElement('p');
                hint.className = 'demo-hint text-primary small mt-2 mb-0';
                hint.innerHTML = '<i class="fas fa-arrow-left"></i> Try this instead';
                hint.style.fontWeight = '500';
                demoCard.appendChild(hint);
            }

            // Remove the suggestion after 5 seconds
            setTimeout(() => {
                demoCard.style.border = '';
                demoCard.style.boxShadow = '';
                demoCard.style.transform = '';
                const hint = demoCard.querySelector('.demo-hint');
                if (hint) hint.remove();
            }, 5000);
        }
    }

    hideModeSelection() {
        const modal = document.getElementById('directorySelectionModal');
        if (modal) modal.style.display = 'none';
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        // Critical elements that must exist
        const criticalElements = {
            loadingScreen: 'loadingScreen',
            loadingStatus: 'loadingStatus', 
            loadingProgress: 'loadingProgress',
            app: 'app'
        };
        
        // Optional elements that may not exist in all views
        const optionalElements = {
            searchInput: 'search-input',
            sortSelect: 'sort-select',
            statsBar: 'statsBar',
            resultCount: 'resultCount',
            totalComments: 'totalComments',
            videoGridView: 'videoGridView',
            videoListView: 'videoListView',
            videoDetailView: 'videoDetailView',
            videoGrid: 'videoGrid',
            videoListBody: 'videoListBody',
            videoPagination: 'videoPagination',
            videoListPagination: 'videoListPagination',
            gridViewToggle: 'gridViewToggle',
            listViewToggle: 'listViewToggle',
            videoTitle: 'videoTitle',
            videoDate: 'videoDate',
            videoViews: 'videoViews',
            videoCommentCount: 'videoCommentCount',
            videoDescription: 'videoDescription',
            captionComment: 'captionComment',
            captionTime: 'captionTime',
            commentsList: 'commentsList',
            commentSearch: 'commentSearch',
            commentSort: 'commentSort',
            loadMoreComments: 'loadMoreComments',
            exportSinglePostComments: 'exportSinglePostComments',
            exportProgress: 'exportProgress',
            exportProgressBar: 'exportProgressBar',
            exportProgressText: 'exportProgressText',
            exportProgressTitle: 'exportProgressTitle',
            currentVideoProgress: 'currentVideoProgress',
            currentVideoProgressBar: 'currentVideoProgressBar',
            currentVideoStats: 'currentVideoStats',
            overallProgressLabel: 'overallProgressLabel',
            overallProgressStats: 'overallProgressStats',
            exportAllPostsComments: 'exportAllPostsComments',
            commentInsights: 'commentInsights',
            wordCloud: 'wordCloud',
        };

        this.elements = {};
        
        // Cache critical elements and validate they exist
        for (const [key, id] of Object.entries(criticalElements)) {
            const element = document.getElementById(id);
            if (!element) {
                console.error(`❌ Critical element not found: ${id}`);
                throw new Error(`Critical element not found: ${id}`);
            }
            this.elements[key] = element;
        }
        
        // Cache optional elements (don't fail if missing)
        for (const [key, id] of Object.entries(optionalElements)) {
            const element = document.getElementById(id);
            if (element) {
                this.elements[key] = element;
                if (key === 'exportSinglePostComments' || key === 'exportAllPostsComments') {
                    console.log(`✅ Found export button: ${id}`, element);
                }
            } else {
                console.warn(`⚠️ Optional element not found: ${id}`);
                this.elements[key] = null;
            }
        }
        
        console.log('✅ DOM elements cached successfully');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        try {
            // View toggle listeners
            if (this.elements.gridViewToggle) {
                this.elements.gridViewToggle.addEventListener('change', () => {
                    if (this.elements.gridViewToggle.checked) {
                        this.switchToGridView();
                    }
                });
            }
            
            if (this.elements.listViewToggle) {
                this.elements.listViewToggle.addEventListener('change', () => {
                    if (this.elements.listViewToggle.checked) {
                        this.switchToListView();
                    }
                });
            }
            
            // Initialize VideoGridComponent
            if (this.elements.videoGrid) {
                this.videoGridComponent = new VideoGridComponent(
                    this.elements.videoGrid, 
                    this.dataManager, 
                    this.instagramDirectoryManager
                );
                this.videoGridComponent.setVideoClickHandler((videoId) => {
                    this.showVideoDetail(videoId);
                });
            }
            
            // Initialize CommentListComponent
            if (this.elements.commentsList) {
                this.commentListComponent = new CommentListComponent(this.elements.commentsList, this.exportService);
                // Set the export callback to handle format selection
                this.commentListComponent.onCommentExport = (commentId, format = 'comment-only') => {
                    console.log(`🎯 Export callback triggered: commentId=${commentId}, format=${format}`);
                    const comment = this.findCommentById(commentId);
                    console.log(`🔍 Found comment:`, !!comment, comment?.username);
                    if (comment) {
                        // Add compatibility layer for field name differences
                        if (!comment.author && comment.username) {
                            comment.author = comment.username;
                        }
                        if (!comment.text && comment.content) {
                            comment.text = comment.content;
                        }
                        if (!comment.published_at && comment.created_at) {
                            comment.published_at = comment.created_at;
                        }
                        if (!comment.like_count && comment.likes) {
                            comment.like_count = comment.likes;
                        }
                        const video = this.currentVideo;
                        const videoTitle = video ? (video.title || video.description || 'Instagram Post') : 'Instagram Post';
                        console.log(`📹 Video title: ${videoTitle}`);
                        console.log(`🚀 Calling exportSingleCommentWithFormat...`);
                        try {
                            this.exportService.exportSingleCommentWithFormat(comment, format, videoTitle);
                        } catch (error) {
                            console.error(`❌ Export error:`, error);
                        }
                    } else {
                        console.error(`❌ Comment not found for ID: ${commentId}`);
                    }
                };
            }
            
            // Add back button handler for Instagram post view
            const backToGridBtn = document.getElementById('backToGrid');
            if (backToGridBtn) {
                backToGridBtn.addEventListener('click', () => {
                    this.hideVideoDetail();
                });
            }
            
            // Header search (if elements exist)
            if (this.elements.searchInput) {
                this.elements.searchInput.addEventListener('input', this.debounce(() => {
                    // Only trigger live search when NOT in video detail view
                    if (this.currentView !== 'video-detail') {
                        this.handleSearch();
                    }
                }, 300));

                // Enter key in search (works from any view)
                this.elements.searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSearch();
                    }
                });
            }

            // Search button
            const searchBtn = document.getElementById('search-btn');
            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    this.handleSearch();
                });
            }

            // Header sort
            if (this.elements.sortSelect) {
                this.elements.sortSelect.addEventListener('change', () => {
                    this.handleSort(this.elements.sortSelect.value);
                });
            }


            // Comment search and sort
            if (this.elements.commentSearch) {
                this.elements.commentSearch.addEventListener('input', this.debounce(() => {
                    const searchTerm = this.elements.commentSearch.value;
                    // Set search term for highlighting
                    if (this.commentListComponent) {
                        this.commentListComponent.setSearchTerm(searchTerm);
                    }
                    this.loadComments();
                }, 300));
            }
            
            if (this.elements.commentSort) {
                this.elements.commentSort.addEventListener('change', () => {
                    this.loadComments();
                });
            }

            // Load more comments
            if (this.elements.loadMoreComments) {
                this.elements.loadMoreComments.addEventListener('click', () => {
                    this.loadMoreComments();
                });
            }

            // Export single post comments with menu (using delegation)
            document.addEventListener('click', (e) => {
                if (e.target.matches('#exportSinglePostComments') || e.target.closest('#exportSinglePostComments')) {
                    e.preventDefault();
                    console.log('🔥 Export single post comments clicked via delegation!');
                    const button = e.target.closest('#exportSinglePostComments') || e.target;
                    this.showExportAllMenu(button, 'single-video');
                }
            });
            
            // Post Analytics toggle is set up in setupAnalyticsToggle() method
            this.setupAnalyticsToggle();
            
            // Analytics tab switching
            this.setupAnalyticsTabs();

            // Export all posts comments with menu (using delegation)
            document.addEventListener('click', (e) => {
                if (e.target.matches('#exportAllPostsComments') || e.target.closest('#exportAllPostsComments')) {
                    e.preventDefault();
                    console.log('🔥 Export current post comments clicked via delegation!');
                    const button = e.target.closest('#exportAllPostsComments') || e.target;
                    this.showExportAllMenu(button, 'single-video');
                }
            });
            
            // List view export buttons (delegated event listener)
            document.addEventListener('click', (e) => {
                if (e.target.matches('.export-post-btn') || e.target.closest('.export-post-btn')) {
                    e.preventDefault();
                    const button = e.target.closest('.export-post-btn');
                    const videoId = button.dataset.videoId;
                    if (videoId) {
                        this.showExportAllMenu(button, 'single-video', videoId);
                    }
                }
            });

            // List view post clicks (delegated event listener)
            document.addEventListener('click', (e) => {
                const listRow = e.target.closest('#videoListTable tbody tr[data-video-id]');
                if (listRow) {
                    // Only handle clicks on thumbnail or title, not export button
                    if (e.target.classList.contains('post-thumbnail') || 
                        e.target.classList.contains('post-title') ||
                        e.target.closest('.post-thumbnail') ||
                        e.target.closest('.post-title')) {
                        const videoId = listRow.dataset.videoId;
                        if (videoId) {
                            this.showVideoDetail(videoId);
                        }
                    }
                }
            });

            // Export progress close - cancel export
            document.addEventListener('click', (e) => {
                if (e.target.matches('.close-progress')) {
                    console.log('🛑 User clicked close - cancelling export');
                    this.cancelExport();
                }
            });

            // Home link navigation
            const homeLink = document.getElementById('home-link');
            if (homeLink) {
                homeLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showVideoGrid();
                });
            }

            // Export single comment button is now handled by CommentListComponent
            // This handler has been moved to prevent conflicts with the export menu

            // Insights tab switching
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-tab]')) {
                    e.preventDefault();
                    this.switchInsightTab(e.target.dataset.tab);
                }
            });

            // List view sortable headers
            document.addEventListener('click', (e) => {
                if (e.target.matches('.sortable-header') || e.target.closest('.sortable-header')) {
                    e.preventDefault();
                    const header = e.target.closest('.sortable-header');
                    const sortField = header.dataset.sort;
                    this.handleListSort(sortField);
                }
            });
            
            console.log('✅ Event listeners set up successfully');
            
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }

    /**
     * Update loading progress
     */
    updateLoadingProgress(status, progress) {
        try {
            if (this.elements && this.elements.loadingStatus && this.elements.loadingProgress) {
                this.elements.loadingStatus.textContent = status;
                this.elements.loadingProgress.style.width = `${progress}%`;
                this.elements.loadingProgress.setAttribute('aria-valuenow', progress);
                
                // Add some visual feedback for long operations
                if (progress >= 30 && progress < 80) {
                    this.elements.loadingStatus.innerHTML = status;
                }
            } else {
                console.warn('⚠️ Loading progress elements not available:', status, progress);
            }
        } catch (error) {
            console.error('❌ Error updating loading progress:', error);
        }
    }

    /**
     * Hide loading screen and show app
     */
    hideLoadingScreen() {
        this.elements.loadingScreen.style.display = 'none';
        this.elements.app.style.display = 'block';
    }

    /**
     * Load and display video grid
     */
    async loadVideoGrid() {
        try {
            const filters = {
                ...this.currentFilters,
                search: this.elements.searchInput.value
            };
            
            const result = await this.dataManager.getVideos(filters, this.currentPagination);
            
            if (this.currentViewMode === 'grid') {
                this.renderVideoGrid(result.videos);
                this.renderPagination(result);
            } else {
                this.renderVideoList(result.videos);
                this.renderListPagination(result);
            }
            
            this.updateResultCount(result.total);
            
        } catch (error) {
            console.error('❌ Failed to load videos:', error);
            this.showError('Failed to load videos');
        }
    }

    /**
     * Render video grid
     */
    renderVideoGrid(videos) {
        if (this.videoGridComponent) {
            // Use the VideoGridComponent for Instagram-style grid
            this.videoGridComponent.render(videos);
        } else {
            // Fallback to old method if component not initialized
            const html = videos.map(video => this.createVideoCard(video)).join('');
            this.elements.videoGrid.innerHTML = html;
        }
    }

    /**
     * Switch to grid view
     */
    switchToGridView() {
        this.currentViewMode = 'grid';
        this.elements.videoGridView.style.display = 'block';
        this.elements.videoListView.style.display = 'none';
    }

    /**
     * Switch to list view
     */
    switchToListView() {
        this.currentViewMode = 'list';
        this.elements.videoGridView.style.display = 'none';
        this.elements.videoListView.style.display = 'block';
        this.updateSortHeaders(); // Initialize sort header indicators
        this.loadVideoList();
    }

    /**
     * Load and display video list
     */
    async loadVideoList() {
        try {
            const filters = {
                ...this.currentFilters,
                search: this.elements.searchInput.value
            };
            
            const result = await this.dataManager.getVideos(filters, this.currentPagination);
            
            // Videos are already sorted by the global sort in DataManager
            this.renderVideoList(result.videos);
            this.renderListPagination(result);
            this.updateResultCount(result.total);
            
            // Load actual thumbnails for Instagram archive posts
            this.loadListViewThumbnails(result.videos);
            
        } catch (error) {
            console.error('❌ Failed to load video list:', error);
            this.showError('Failed to load video list');
        }
    }


    /**
     * Load thumbnails for list view Instagram archive posts
     */
    async loadListViewThumbnails(videos) {
        if (!this.instagramDirectoryManager || this.dataManager.dataSource !== 'instagram') {
            return;
        }

        for (const video of videos) {
            // Only process Instagram archive posts with shortcode and media
            if (video.shortcode && video.hasMedia) {
                try {
                    const mediaFileURL = await this.instagramDirectoryManager.getFileURL(video.shortcode);
                    if (mediaFileURL) {
                        const thumbnailImg = document.querySelector(`.post-thumbnail[data-shortcode="${video.shortcode}"]`);
                        if (thumbnailImg) {
                            const mediaInfo = this.instagramDirectoryManager.mediaFiles.get(video.shortcode);
                            
                            if (mediaInfo && mediaInfo.type.startsWith('image/')) {
                                // For images, use the image directly
                                thumbnailImg.src = mediaFileURL;
                            } else if (mediaInfo && mediaInfo.type.startsWith('video/')) {
                                // For videos, generate a thumbnail
                                this.generateListVideoThumbnail(mediaFileURL, thumbnailImg);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to load thumbnail for ${video.shortcode}:`, error);
                }
            }
        }
    }

    /**
     * Generate thumbnail from video file for list view
     */
    generateListVideoThumbnail(videoUrl, imgElement) {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        video.addEventListener('loadeddata', () => {
            // Seek to 1 second or 10% of duration, whichever is smaller
            const seekTime = Math.min(1, video.duration * 0.1);
            video.currentTime = seekTime;
        });
        
        video.addEventListener('seeked', () => {
            // Create canvas for list view (smaller, square format)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = 120;
            canvas.height = 120;
            
            // Calculate how to fit video into square format
            const videoAspect = video.videoWidth / video.videoHeight;
            let drawWidth, drawHeight, drawX, drawY;
            
            if (videoAspect > 1) {
                // Landscape video - fit to height
                drawHeight = canvas.height;
                drawWidth = drawHeight * videoAspect;
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                // Portrait video - fit to width
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
            }, 'image/jpeg', 0.8);
        });
        
        video.src = videoUrl;
    }

    /**
     * Render video list table
     */
    renderVideoList(videos) {
        if (!this.elements.videoListBody) return;
        
        const html = videos.map(video => this.createVideoListRow(video)).join('');
        this.elements.videoListBody.innerHTML = html;
        
        // Note: Click handlers are set up via event delegation in setupEventListeners
    }

    /**
     * Create video list row HTML
     */
    createVideoListRow(video) {
        const date = new Date(video.published_at).toLocaleDateString();
        const likes = this.formatNumber(video.like_count || 0);
        const comments = this.formatNumber(video.comment_count || 0);
        
        // Get thumbnail - handle both Instagram archive and legacy formats
        let thumbnailSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNGOEY5RkEiLz48dGV4dCB4PSIzMCIgeT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzZDNzU3RCI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=';
        
        // Check if this is an Instagram archive post
        if (video.shortcode && video.hasMedia && this.dataManager.dataSource === 'instagram') {
            // Will be loaded asynchronously - start with placeholder
            thumbnailSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNGOEY5RkEiLz48dGV4dCB4PSIzMCIgeT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZDNzU3RCI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=';
        } else if (video.media_files && video.media_files.length > 0) {
            // Legacy format with media_files array
            const firstMedia = video.media_files[0];
            if (firstMedia.type === 'video' && firstMedia.thumbnail) {
                thumbnailSrc = `instadata/posts/${firstMedia.thumbnail}`;
            } else if (firstMedia.type === 'image') {
                thumbnailSrc = `instadata/posts/${firstMedia.filename}`;
            }
        }
        
        return `
            <tr data-video-id="${video.video_id}">
                <td class="post-thumbnail-col">
                    <img src="${thumbnailSrc}" 
                         alt="${this.escapeHTML(video.title)}" 
                         class="post-thumbnail"
                         data-shortcode="${video.shortcode || ''}"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIGZpbGw9IiNFOUVDRUYiLz48dGV4dCB4PSIzMCIgeT0iMzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuMzVlbSIgZm9udC1zaXplPSIxMCIgZmlsbD0iIzZDNzU3RCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'">
                </td>
                <td class="post-title-col">
                    <div class="post-title" title="${this.escapeHTML(video.title)}">
                        ${this.escapeHTML(video.title)}
                    </div>
                </td>
                <td class="text-center">
                    <div class="post-date">${date}</div>
                </td>
                <td class="text-center">
                    <div class="post-stats">${likes}</div>
                </td>
                <td class="text-center">
                    <div class="post-stats">${comments}</div>
                </td>
                <td class="text-center">
                    <button class="btn btn-outline-primary btn-sm export-post-btn" data-video-id="${video.video_id}" style="display: none;">
                        <i class="bi bi-download"></i> Export
                    </button>
                </td>
            </tr>
        `;
    }

    /**
     * Render list view pagination
     */
    renderListPagination(result) {
        if (!this.elements.videoListPagination) return;
        
        let html = '';
        const currentPage = result.page;
        const totalPages = result.totalPages;
        
        // Previous button
        if (result.hasPrev) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">Previous</span></li>`;
        }
        
        // Page numbers (simplified for list view)
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
            }
        }
        
        // Next button
        if (result.hasNext) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">Next</span></li>`;
        }
        
        this.elements.videoListPagination.innerHTML = html;
        
        // Add click handlers
        this.elements.videoListPagination.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                this.currentPagination.page = parseInt(e.target.dataset.page);
                this.loadVideoList();
            }
        });
    }

    /**
     * Get reliable YouTube thumbnail with fallback logic
     */
    getYouTubeThumbnail(videoId) {
        // Create img element to test thumbnail availability
        const img = document.createElement('img');
        
        // Try maxresdefault first, fallback to hqdefault if it fails
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        
        // Return a promise that resolves to a working thumbnail URL
        return new Promise((resolve) => {
            img.onload = () => {
                // Check if it's a real thumbnail (maxresdefault has min dimensions)
                if (img.naturalWidth > 120) {
                    resolve(thumbnailUrl);
                } else {
                    // Fallback to hqdefault
                    resolve(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
                }
            };
            
            img.onerror = () => {
                // Fallback to hqdefault
                resolve(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
            };
            
            img.src = thumbnailUrl;
        });
    }

    /**
     * Create video card HTML with reliable thumbnails
     */
    createVideoCard(video) {
        const date = new Date(video.published_at).toLocaleDateString();
        const views = this.formatNumber(video.view_count);
        const comments = this.formatNumber(video.comment_count);
        
        // Use data attributes to handle thumbnail loading
        const cardId = `video-card-${video.video_id}`;
        
        const cardHtml = `
            <div class="col-md-6 col-lg-4 col-xl-3">
                <div class="card video-card" data-video-id="${video.video_id}" id="${cardId}">
                    <div class="video-thumbnail">
                        <img class="card-img-top thumbnail-img" alt="${video.title}" loading="lazy" 
                             data-video-id="${video.video_id}"
                             src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjhmOWZhIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+"
                             style="min-height: 180px; background-color: #f8f9fa;">
                    </div>
                    <div class="video-card-body card-body">
                        <h6 class="video-title">${this.escapeHTML(video.title)}</h6>
                        <div class="video-stats">
                            <small class="text-muted">${views} views • ${comments} comments</small>
                        </div>
                        <div class="video-date">
                            <small class="text-muted">${date}</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Load thumbnail asynchronously after DOM insertion
        setTimeout(() => this.loadVideoThumbnail(video.video_id), 0);
        
        return cardHtml;
    }

    /**
     * Load thumbnail for a specific video with fallback logic
     */
    async loadVideoThumbnail(videoId) {
        const img = document.querySelector(`[data-video-id="${videoId}"].thumbnail-img`);
        if (!img) return;
        
        // List of thumbnail URLs to try in order of preference
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
                    img.src = url;
                    img.style.minHeight = 'auto';
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        
        // If all fail, show a placeholder
        img.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTllY2VmIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzZjNzU3ZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1ibmFpbDwvdGV4dD48L3N2Zz4=";
        img.style.minHeight = '180px';
    }

    /**
     * Test if a thumbnail URL is valid and available
     */
    testThumbnailUrl(url) {
        return new Promise((resolve) => {
            const img = new Image();
            
            img.onload = () => {
                // Check if it's a valid thumbnail (not a placeholder)
                // YouTube placeholder images are typically 120x90
                if (img.naturalWidth > 120 && img.naturalHeight > 90) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            };
            
            img.onerror = () => resolve(false);
            
            // Set a timeout to avoid hanging
            setTimeout(() => resolve(false), 3000);
            
            img.src = url;
        });
    }

    /**
     * Show video detail view
     */
    async showVideoDetail(videoId) {
        try {
            const video = this.dataManager.getVideo(videoId);
            if (!video) {
                this.showError('Video not found');
                return;
            }

            this.currentVideo = video;
            this.currentView = 'video-detail';
            
            // Scroll to top when showing video detail
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Update UI - hide both grid and list views
            this.elements.videoGridView.style.display = 'none';
            this.elements.videoListView.style.display = 'none';
            this.elements.videoDetailView.style.display = 'block';
            
            // Add single post mode class to remove app padding
            document.getElementById('app').classList.add('single-post-mode');
            
            // Hide channel navigation tools and stats bar
            document.getElementById('channel-navigation').style.display = 'none';
            document.getElementById('statsBarContainer').style.display = 'none';
            
            
            // Load video
            await this.videoPlayer.loadVideo(video, this.dataManager);
            
            // Update video info
            this.updateVideoInfo(video);
            
            // Load comments
            this.currentCommentPagination = { page: 1, limit: 50 };
            await this.loadComments();
            
            // Generate and show insights
            await this.generateCommentInsights();
            
            // Set up post analytics toggle (in case it wasn't set up during initial load)
            this.setupAnalyticsToggle();
            
        } catch (error) {
            console.error('❌ Failed to show video detail:', error);
            this.showError('Failed to load video');
        }
    }
    
    /**
     * Set up analytics toggle event listener
     */
    setupAnalyticsToggle() {
        const postAnalyticsToggle = document.getElementById('postAnalyticsToggle');
        if (postAnalyticsToggle && !postAnalyticsToggle.hasAttribute('data-listener-added')) {
            console.log('🔧 Setting up analytics toggle event listener');
            postAnalyticsToggle.addEventListener('click', (e) => {
                console.log('🔥 Analytics toggle clicked!');
                e.preventDefault();
                e.stopPropagation();
                this.toggleAnalyticsPanel();
            });
            postAnalyticsToggle.setAttribute('data-listener-added', 'true');
        } else if (!postAnalyticsToggle) {
            console.warn('⚠️ Analytics toggle not found');
        } else {
            console.log('ℹ️ Analytics toggle listener already exists');
        }
    }
    
    /**
     * Toggle analytics panel visibility
     */
    async toggleAnalyticsPanel() {
        console.log('🔥 toggleAnalyticsPanel called');
        
        // Prevent multiple rapid calls
        if (this.isTogglingAnalytics) {
            console.log('🚫 Analytics toggle already in progress');
            return;
        }
        this.isTogglingAnalytics = true;
        
        if (!this.currentVideo) {
            console.log('❌ No current video');
            this.isTogglingAnalytics = false;
            return;
        }
        
        const toggle = document.getElementById('postAnalyticsToggle');
        const panel = document.getElementById('analyticsPanel');
        
        if (!toggle) {
            console.error('❌ Analytics toggle not found');
            this.isTogglingAnalytics = false;
            return;
        }
        if (!panel) {
            console.error('❌ Analytics panel not found');
            this.isTogglingAnalytics = false;
            return;
        }
        
        const icon = toggle.querySelector('.toggle-icon');
        
        const isExpanded = toggle.getAttribute('data-expanded') === 'true';
        console.log('📊 Current expanded state:', isExpanded);
        
        if (isExpanded) {
            // Hide panel
            console.log('🔽 Hiding analytics panel');
            panel.style.display = 'none';
            toggle.setAttribute('data-expanded', 'false');
            if (icon) icon.classList.remove('rotated');
        } else {
            // Show panel and load analytics
            console.log('🔼 Showing analytics panel');
            panel.style.display = 'block';
            toggle.setAttribute('data-expanded', 'true');
            if (icon) icon.classList.add('rotated');
            
            // Load analytics data
            try {
                await this.loadAnalyticsData();
                console.log('✅ Analytics data loaded successfully');
            } catch (error) {
                console.error('❌ Failed to load analytics data:', error);
            }
        }
        
        // Reset the toggle flag
        this.isTogglingAnalytics = false;
    }
    
    /**
     * Set up analytics tab switching
     */
    setupAnalyticsTabs() {
        document.addEventListener('click', (e) => {
            if (e.target.closest('.analytics-tab')) {
                const tab = e.target.closest('.analytics-tab');
                const tabName = tab.getAttribute('data-tab');
                this.switchAnalyticsTab(tabName);
            }
        });
    }
    
    /**
     * Switch between analytics tabs
     */
    switchAnalyticsTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Show/hide tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
    }
    
    /**
     * Load all analytics data
     */
    async loadAnalyticsData() {
        try {
            console.log('📊 Loading analytics data for:', this.currentVideo.video_id);
            
            const comments = await this.dataManager.getAllComments(this.currentVideo.video_id, {});
            const flatComments = this.flattenComments(comments);
            
            if (flatComments.length === 0) {
                console.warn('No comments found for analytics');
                return;
            }
            
            // Load frequent words
            const wordFreq = this.analyzeWordFrequency(flatComments);
            this.renderAnalyticsWordCloud(wordFreq);
            
            // Load themes analysis (renamed to sentiment)
            const themesData = this.analyzeThemes(flatComments);
            this.renderThemesAnalysis(themesData);
            
        } catch (error) {
            console.error('❌ Error loading analytics data:', error);
        }
    }
    
    /**
     * Render word cloud in analytics panel
     */
    renderAnalyticsWordCloud(wordFreq) {
        const container = document.getElementById('analyticsWordCloud');
        if (!container) return;
        
        if (wordFreq.length === 0) {
            container.innerHTML = '<div class="text-muted">No word data available</div>';
            return;
        }
        
        // Calculate sizes based on frequency
        const maxCount = Math.max(...wordFreq.map(w => w.count));
        const minCount = Math.min(...wordFreq.map(w => w.count));
        
        const html = wordFreq.slice(0, 15).map(({ word, count }) => {
            const relativeSize = minCount === maxCount ? 2 : 
                Math.round(1 + (count - minCount) / (maxCount - minCount) * 3);
                
            return `<span class="analytics-word-item size-${relativeSize}" title="${count} mentions">
                ${word} <span style="opacity: 0.7;">${count}</span>
            </span>`;
        }).join('');
        
        container.innerHTML = html;
    }
    
    
    
    /**
     * Analyze themes - URINE THERAPY SPECIFIC
     */
    analyzeThemes(comments) {
        const themes = {
            'Safety Concerns': { count: 0, keywords: ['safe', 'dangerous', 'risk', 'infection', 'bacteria', 'sterile', 'clean', 'harmful'] },
            'How-To Questions': { count: 0, keywords: ['how', 'when', 'how much', 'how often', 'what time', 'morning', 'fresh', 'drink', 'first'] },
            'Medical Skepticism': { count: 0, keywords: ['doctor', 'medical', 'science', 'proof', 'study', 'research', 'evidence', 'fda', 'approved'] },
            'Personal Success Stories': { count: 0, keywords: ['tried', 'worked', 'helped', 'cured', 'healed', 'better', 'improved', 'results', 'my'] },
            'Cultural/Religious References': { count: 0, keywords: ['bible', 'ancient', 'tradition', 'culture', 'ancestors', 'natural', 'primitive'] },
            'Comparison to Other Therapies': { count: 0, keywords: ['like', 'similar', 'compare', 'versus', 'instead', 'alternative', 'other'] },
            'Extreme Reactions': { count: 0, keywords: ['crazy', 'insane', 'wtf', 'omg', 'unbelievable', 'ridiculous', 'absurd', 'weird'] },
            'Health Conditions Mentioned': { count: 0, keywords: ['cancer', 'diabetes', 'kidney', 'liver', 'skin', 'acne', 'eczema', 'arthritis', 'disease'] }
        };
        
        comments.forEach(comment => {
            const text = (comment.content || comment.text || '').toLowerCase().trim();
            
            // Track which themes this comment matches (only count once per theme)
            const matchedThemes = new Set();
            
            // Check keyword matches for each theme
            Object.keys(themes).forEach(theme => {
                if (themes[theme].keywords && !matchedThemes.has(theme)) {
                    themes[theme].keywords.forEach(keyword => {
                        if (text.includes(keyword) && !matchedThemes.has(theme)) {
                            themes[theme].count++;
                            matchedThemes.add(theme);
                        }
                    });
                }
            });
        });
        
        // Convert to array and sort by count
        return Object.entries(themes)
            .map(([name, data]) => ({ name, count: data.count }))
            .sort((a, b) => b.count - a.count)
            .filter(theme => theme.count > 0);
    }
    
    /**
     * Render themes analysis
     */
    renderThemesAnalysis(themesData) {
        const container = document.getElementById('themesAnalysis');
        if (!container) return;
        
        if (themesData.length === 0) {
            container.innerHTML = '<div class="text-muted">No themes identified</div>';
            return;
        }
        
        const html = themesData.slice(0, 6).map(theme => {
            const themeInfo = {
                'Safety Concerns': { emoji: '⚠️', description: 'Questions about risks and safety' },
                'How-To Questions': { emoji: '❓', description: 'Asking for instructions and guidance' },
                'Medical Skepticism': { emoji: '🤔', description: 'Doubting medical claims and evidence' },
                'Personal Success Stories': { emoji: '✨', description: 'Sharing positive healing experiences' },
                'Cultural/Religious References': { emoji: '🙏', description: 'Traditional and spiritual perspectives' },
                'Comparison to Other Therapies': { emoji: '⚖️', description: 'Comparing with alternative treatments' },
                'Extreme Reactions': { emoji: '😱', description: 'Strong emotional responses' },
                'Health Conditions Mentioned': { emoji: '🏥', description: 'Specific ailments and diseases discussed' }
            };
            
            const info = themeInfo[theme.name] || { emoji: '💬', description: 'Related discussion topics' };
            
            return `
                <div class="theme-item">
                    <span class="theme-emoji">${info.emoji}</span>
                    <span class="theme-count">${theme.count}</span>
                    <div class="theme-title">${theme.name}</div>
                    <div class="theme-description">${info.description}</div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }

    /**
     * Hide video detail view and return to grid
     */
    hideVideoDetail() {
        this.showVideoGrid();
    }

    /**
     * Show video grid view
     */
    showVideoGrid() {
        this.currentView = 'videos';
        this.currentVideo = null;
        
        this.elements.videoDetailView.style.display = 'none';
        
        // Restore the correct view mode (grid or list)
        if (this.currentViewMode === 'grid') {
            this.elements.videoGridView.style.display = 'block';
            this.elements.videoListView.style.display = 'none';
        } else {
            this.elements.videoGridView.style.display = 'none';
            this.elements.videoListView.style.display = 'block';
        }
        
        // Remove single post mode class to restore app padding
        document.getElementById('app').classList.remove('single-post-mode');
        
        // SPIE: Keep channel navigation and stats bar hidden for single post view
        document.getElementById('channel-navigation').style.display = 'none';
        document.getElementById('statsBarContainer').style.display = 'none';
        
        
        // Clean up video player
        if (this.videoPlayer) {
            this.videoPlayer.destroy();
        }
    }

    /**
     * Update video info display
     */
    updateVideoInfo(video) {
        // Update date (Instagram style - relative time)
        if (this.elements.videoDate) {
            const date = new Date(video.published_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let timeText;
            if (diffDays < 1) {
                timeText = 'Today';
            } else if (diffDays < 7) {
                timeText = `${diffDays}d`;
            } else if (diffDays < 30) {
                timeText = `${Math.floor(diffDays / 7)}w`;
            } else {
                const formattedDate = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
                timeText = formattedDate;
            }
            
            this.elements.videoDate.textContent = timeText;
        }
        
        // Update likes count (Instagram shows likes, not views)
        if (this.elements.videoViews) {
            this.elements.videoViews.textContent = this.formatNumber(video.like_count || video.view_count);
        }
        
        // Update description/caption in the sidebar
        if (this.elements.videoDescription) {
            const description = video.description || '';
            this.elements.videoDescription.innerHTML = this.escapeHTML(description).replace(/\n/g, '<br>');
        }
        
        // Update caption as first comment (Instagram style)
        const captionDescElement = document.querySelector('#captionComment #videoDescription');
        if (captionDescElement) {
            const caption = video.caption || video.description || '';
            captionDescElement.innerHTML = this.escapeHTML(caption).replace(/\n/g, '<br>');
        }
        
        // Update profile pictures - use the local avatar image
        const avatarPath = 'jonno-otto-avatar.png';
        
        // Update caption profile picture
        const captionProfileImg = document.querySelector('#captionComment .profile-avatar img');
        if (captionProfileImg) {
            captionProfileImg.src = avatarPath;
        }
        
        // Update post header profile picture
        const headerProfileImg = document.querySelector('.post-meta-header .profile-avatar img');
        if (headerProfileImg) {
            headerProfileImg.src = avatarPath;
        }
        
        // Update caption time
        if (this.elements.captionTime) {
            const date = new Date(video.published_at);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            let timeText;
            if (diffHours < 1) {
                timeText = 'now';
            } else if (diffHours < 24) {
                timeText = `${diffHours}h`;
            } else if (diffDays < 7) {
                timeText = `${diffDays}d`;
            } else if (diffDays < 30) {
                timeText = `${Math.floor(diffDays / 7)}w`;
            } else {
                timeText = `${Math.floor(diffDays / 30)}mo`;
            }
            
            this.elements.captionTime.textContent = timeText;
        }
    }

    /**
     * Load comments for current video
     */
    async loadComments() {
        if (!this.currentVideo) return;

        try {
            // Get frequent words for relevance scoring
            console.log('📊 Starting word frequency analysis...');
            const allCommentsForWordAnalysis = await this.dataManager.getAllComments(this.currentVideo.video_id, { sortBy: 'newest' });
            console.log(`📊 Analyzing ${allCommentsForWordAnalysis.length} comments for word frequency`);
            
            const frequentWords = this.analyzeWordFrequency(allCommentsForWordAnalysis);
            console.log('🔤 FREQUENT WORDS ANALYSIS COMPLETE:');
            console.log('🔤 Top 15 frequent words:', frequentWords.slice(0, 15).map(w => `${w.word}(${w.count})`));
            
            // Also log the words we expect to see
            const expectedWords = ['urine', 'people', 'red', 'about', 'dont', 'from', 'body', 'drink'];
            expectedWords.forEach(word => {
                const found = frequentWords.find(w => w.word.toLowerCase() === word);
                if (found) {
                    console.log(`✅ Found expected word: ${word} (${found.count} times)`);
                } else {
                    console.log(`❌ Missing expected word: ${word}`);
                }
            });
            
            const filters = {
                search: this.elements.commentSearch?.value || '',
                sortBy: this.elements.commentSort?.value || 'relevance',
                frequentWords: frequentWords
            };
            
            console.log(`Loading comments for ${this.currentVideo.video_id}...`);
            console.log('📊 Current video info:', {
                id: this.currentVideo.video_id,
                username: this.currentVideo.username,
                author: this.currentVideo.author
            });
            console.log('📊 Data manager state:', {
                totalComments: this.dataManager.comments.length,
                commentsByVideoSize: this.dataManager.commentsByVideo?.size || 0,
                videoMapSize: this.dataManager.videoMap?.size || 0
            });
            
            // Load all comments at once for better UX
            const allComments = await this.dataManager.getAllComments(this.currentVideo.video_id, filters);
            
            console.log(`Loaded ${allComments.length} comments for ${this.currentVideo.video_id}`);
            
            this.renderComments(allComments);
            
            // Update comments title with total count
            const commentsTitle = document.getElementById('commentsTitle');
            if (commentsTitle) {
                const totalCount = allComments.length;
                commentsTitle.textContent = `Comments (${totalCount})`;
            }
            
            // Hide load more button since we're loading all comments
            if (this.elements.loadMoreComments) {
                this.elements.loadMoreComments.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ Failed to load comments:', error);
            this.showError('Failed to load comments');
        }
    }

    /**
     * Render comments list
     */
    renderComments(comments) {
        // Organize comments to nest Medical Medium's replies
        const organizedComments = this.organizeCommentsWithReplies(comments);
        
        if (this.commentListComponent) {
            // Use the CommentListComponent for proper Instagram-style comments
            this.commentListComponent.render(organizedComments);
        } else {
            // Fallback to manual rendering
            const html = organizedComments.map(comment => this.createCommentCard(comment)).join('');
            this.elements.commentsList.innerHTML = html;
        }
    }
    
    /**
     * Organize all comments to build proper comment trees based on @username replies
     */
    organizeCommentsWithReplies(comments) {
        // Create a deep copy to avoid modifying original comments
        const commentsCopy = comments.map(comment => ({
            ...comment,
            replies: comment.replies ? [...comment.replies] : []
        }));
        
        // Don't re-sort - preserve the sort order from data manager
        const currentSort = document.getElementById('commentSort')?.value || 'newest';
        // Comments are already sorted by the data manager, no need to re-sort here
        
        const topLevelComments = [];
        const allReplies = [];
        
        // First pass: separate potential replies from top-level comments
        commentsCopy.forEach(comment => {
            comment.replies = []; // Reset replies array
            
            if (comment.text && comment.text.trim().startsWith('@')) {
                allReplies.push(comment);
            } else {
                topLevelComments.push(comment);
            }
        });
        
        console.log(`📝 Building comment tree: ${topLevelComments.length} top-level, ${allReplies.length} potential replies`);
        
        // Second pass: match replies to their parent comments
        allReplies.forEach(reply => {
            const replyMatch = reply.text.match(/^@(\w+)/);
            if (replyMatch) {
                const replyToUsername = replyMatch[1];
                const replyTime = new Date(reply.published_at || reply.created_at || 0).getTime();
                
                // Find the most recent comment from this user before the reply
                let bestMatch = null;
                let bestMatchTime = 0;
                
                // Search through all comments (both top-level and already nested replies)
                const searchInComments = (commentsToSearch) => {
                    commentsToSearch.forEach(comment => {
                        if (comment.author === replyToUsername) {
                            const commentTime = new Date(comment.published_at || comment.created_at || 0).getTime();
                            
                            // Must be before the reply and more recent than current best match
                            if (commentTime < replyTime && commentTime > bestMatchTime) {
                                bestMatch = comment;
                                bestMatchTime = commentTime;
                            }
                        }
                        
                        // Recursively search in existing replies
                        if (comment.replies && comment.replies.length > 0) {
                            searchInComments(comment.replies);
                        }
                    });
                };
                
                searchInComments(topLevelComments);
                
                // Add the reply to the matched comment
                if (bestMatch) {
                    bestMatch.replies.push(reply);
                    console.log(`🔗 Nested reply from ${reply.author} under ${bestMatch.author}`);
                } else {
                    // If no match found, add as a top-level comment
                    topLevelComments.push(reply);
                    console.log(`⬆️ No parent found for @${replyToUsername} reply from ${reply.author}, adding as top-level`);
                }
            } else {
                // If it doesn't start with @username, treat as regular comment
                topLevelComments.push(reply);
            }
        });
        
        // Don't re-sort - preserve the sort order from data manager
        // The data manager has already applied the correct sorting (newest, oldest, relevance, etc.)
        
        console.log(`✅ Comment tree built: ${topLevelComments.length} top-level comments with nested replies`);
        
        return topLevelComments;
    }

    /**
     * Create comment card HTML
     */
    createCommentCard(comment) {
        const avatarColor = this.exportService.generateAvatarColor(comment.author);
        const firstLetter = comment.author[1]?.toUpperCase() || comment.author[0]?.toUpperCase() || 'U';
        const date = this.formatFullDate(comment.published_at);
        const heartIcon = comment.channel_owner_liked ? '❤️' : '';
        
        let html = `
            <div class="comment-card">
                <div class="comment-header">
                    <div class="d-flex align-items-center">
                        <div class="avatar me-3" style="background-color: ${avatarColor}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 500;">
                            ${firstLetter}
                        </div>
                        <div>
                            <div class="comment-author">${this.escapeHTML(comment.author)}</div>
                            <div class="comment-date">${date}</div>
                        </div>
                    </div>
                    <button class="btn btn-outline-primary btn-sm export-btn" data-comment-id="${comment.comment_id}" style="display: none !important;">
                        <i class="bi bi-download"></i>
                    </button>
                </div>
                <div class="comment-text">${this.escapeHTML(comment.text)}</div>
            </div>
        `;
        
        // Add replies if any
        if (comment.replies && comment.replies.length > 0) {
            const repliesHtml = comment.replies.map(reply => `
                <div class="reply-card comment-card">
                    <div class="comment-header">
                        <div class="d-flex align-items-center">
                            <div class="avatar me-3" style="background-color: ${this.exportService.generateAvatarColor(reply.author)}; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 500; font-size: 0.8rem;">
                                ${reply.author[1]?.toUpperCase() || reply.author[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <div class="comment-author">${this.escapeHTML(reply.author)}</div>
                                <div class="comment-date">${this.formatFullDate(reply.published_at)}</div>
                            </div>
                        </div>
                        <button class="btn btn-outline-primary btn-sm export-btn" data-comment-id="${reply.comment_id}" style="display: none !important;">
                            <i class="bi bi-download"></i>
                        </button>
                    </div>
                    <div class="comment-text">${this.escapeHTML(reply.text)}</div>
                </div>
            `).join('');
            
            html += repliesHtml;
        }
        
        return html;
    }


    /**
     * Find comment by ID in current data
     */
    findCommentById(commentId) {
        // First check commentsByVideo map (for custom posts)
        if (this.dataManager.commentsByVideo && this.currentVideo) {
            const videoComments = this.dataManager.commentsByVideo.get(this.currentVideo.video_id);
            if (videoComments) {
                const comment = videoComments.find(c => c.comment_id === commentId || c.id === commentId);
                if (comment) return comment;
            }
        }
        
        // Then search in all comments for this video
        const allComments = this.dataManager.comments.filter(c => c.video_id === this.currentVideo?.video_id);
        return allComments.find(c => c.comment_id === commentId || c.id === commentId);
    }

    /**
     * Export single comment
     */
    async exportSingleComment(comment) {
        try {
            console.log('💬 Starting single comment export for:', comment.comment_id);
            
            this.showExportProgress('single');
            
            // Update progress to show it's starting
            console.log('📊 Setting initial progress...');
            this.updateExportProgress({ current: 0, total: 1, status: 'Starting export...' }, 'single');
            
            // Small delay to see progress
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('📊 Updating progress to 50%...');
            this.updateExportProgress({ current: 0.5, total: 1, status: 'Generating image...' }, 'single');
            
            await this.exportService.exportSingleComment(comment, this.currentVideo?.title || '');
            
            // Update progress to show completion
            console.log('📊 Setting completion progress...');
            this.updateExportProgress({ current: 1, total: 1, status: 'Export complete!' }, 'single');
            
            // Close overlay after showing completion
            setTimeout(() => {
                console.log('🔚 Hiding export progress...');
                this.hideExportProgress();
            }, 1500);
            
            this.showSuccess('Comment exported successfully!');
        } catch (error) {
            console.error('❌ Export failed:', error);
            this.showError('Failed to export comment');
            this.hideExportProgress();
        }
    }

    /**
     * Export all video comments
     */
    async exportVideoComments(format = 'comment-only', videoId = null) {
        // Use provided videoId or fallback to current video
        const targetVideoId = videoId || (this.currentVideo ? this.currentVideo.video_id : null);
        if (!targetVideoId) {
            this.showError('No video selected for export');
            return;
        }
        
        try {
            this.showExportProgress('single');
            
            await this.exportService.exportVideoComments(
                targetVideoId,
                this.dataManager,
                (progress) => {
                    this.updateExportProgress(progress, 'single');
                },
                format
            );
            
            // Close overlay after successful export
            this.hideExportProgress();
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            if (error.message && error.message.includes('cancelled')) {
                // Don't show error for user-cancelled exports
                console.log('Export cancelled by user');
            } else {
                this.showError('Failed to export comments');
            }
            this.hideExportProgress();
        }
    }

    /**
     * Export comments for all videos
     */
    async exportAllVideosComments(format = 'comment-only') {
        try {
            this.showExportProgress('all');
            
            await this.exportService.exportAllVideos(
                this.dataManager,
                (progress) => {
                    this.updateExportProgress(progress, 'all');
                },
                format
            );
            
            // Close overlay after successful export
            this.hideExportProgress();
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            if (error.message && error.message.includes('cancelled')) {
                // Don't show error for user-cancelled exports
                console.log('Export cancelled by user');
            } else {
                this.showError('Failed to export all videos');
            }
            this.hideExportProgress();
        }
    }

    /**
     * Show export progress
     */
    showExportProgress(mode = 'single') {
        console.log('🚀 Starting export with mode:', mode);
        
        this.elements.exportProgress.style.display = 'block';
        
        if (mode === 'all') {
            this.elements.exportProgressTitle.textContent = 'Exporting All Videos';
            this.elements.currentVideoProgress.style.display = 'block';
            this.elements.overallProgressLabel.textContent = 'Overall:';
        } else {
            this.elements.exportProgressTitle.textContent = 'Exporting Comments';
            this.elements.currentVideoProgress.style.display = 'none';
            this.elements.overallProgressLabel.textContent = 'Progress:';
        }
    }

    /**
     * Hide export progress
     */
    hideExportProgress() {
        this.elements.exportProgress.style.display = 'none';
    }

    /**
     * Cancel the current export operation
     */
    cancelExport() {
        if (this.exportService) {
            this.exportService.cancelExport();
        }
        this.hideExportProgress();
        this.showError('Export cancelled by user', 2000);
    }

    /**
     * Update export progress
     */
    updateExportProgress(progress, mode = 'single') {
        // Debug logging
        console.log('🔄 Progress update:', { progress, mode });

        if (mode === 'all') {
            // Multi-video export progress
            if (progress.totalVideos > 0) {
                const videoPercentage = progress.currentVideo > 0 ? 
                    ((progress.currentVideo - 1) / progress.totalVideos) * 100 + 
                    (progress.currentVideoComments / progress.totalVideoComments) * (100 / progress.totalVideos) : 0;
                
                this.elements.exportProgressBar.style.width = `${Math.min(videoPercentage, 100)}%`;
                this.elements.overallProgressStats.textContent = `${progress.currentVideo}/${progress.totalVideos} videos`;
            }

            // Current video progress
            if (progress.totalVideoComments > 0) {
                const currentVideoPercentage = (progress.currentVideoComments / progress.totalVideoComments) * 100;
                this.elements.currentVideoProgressBar.style.width = `${currentVideoPercentage}%`;
                this.elements.currentVideoStats.textContent = `${progress.currentVideoComments}/${progress.totalVideoComments} comments`;
            }
        } else {
            // Single video export progress
            const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
            this.elements.exportProgressBar.style.width = `${percentage}%`;
            this.elements.overallProgressStats.textContent = `${progress.current || 0}/${progress.total || 0} comments`;
        }
        
        this.elements.exportProgressText.textContent = progress.status;
    }

    /**
     * Handle search input
     */
    async handleSearch() {
        // If we're in video detail view, return to video grid first
        if (this.currentView === 'video-detail') {
            this.showVideoGrid();
        }
        
        this.currentPagination.page = 1;
        await this.loadVideoGrid();
    }

    /**
     * Handle sort selection
     */
    async handleSort(sortBy) {
        this.currentFilters.sortBy = sortBy;
        this.currentPagination.page = 1;
        
        // Update list view sort state to match global sort
        this.updateListSortFromGlobal(sortBy);
        
        // Load appropriate view
        if (this.currentViewMode === 'list') {
            await this.loadVideoList();
        } else {
            await this.loadVideoGrid();
        }
    }

    /**
     * Handle list view sorting
     */
    handleListSort(field) {
        // Toggle direction if clicking the same field
        if (this.currentListSort.field === field) {
            this.currentListSort.direction = this.currentListSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            // New field - default to descending for most fields, ascending for date
            this.currentListSort.field = field;
            this.currentListSort.direction = field === 'date' ? 'desc' : 'desc';
        }

        // Convert list view sort to global sort format for entire dataset sorting
        const globalSortValue = this.convertListSortToGlobalSort(field, this.currentListSort.direction);
        
        // Update global filters to sort entire dataset
        this.currentFilters.sortBy = globalSortValue;
        this.currentPagination.page = 1; // Reset to first page

        // Update the main sort dropdown to reflect the change
        if (this.elements.sortSelect) {
            this.elements.sortSelect.value = globalSortValue;
        }

        // Update header visual indicators
        this.updateSortHeaders();

        // Re-load the list view with new global sorting
        this.loadVideoList();
    }

    /**
     * Convert list view sort to global sort format
     */
    convertListSortToGlobalSort(field, direction) {
        // Map list view fields to global sort values
        const fieldMap = {
            'date': 'date',
            'likes': 'views', // Instagram likes are stored in view_count field
            'comments': 'comments'
        };
        
        const mappedField = fieldMap[field] || 'date';
        return `${mappedField}-${direction}`;
    }

    /**
     * Update list sort state from global sort value
     */
    updateListSortFromGlobal(globalSortValue) {
        const [field, direction] = globalSortValue.split('-');
        
        // Map global sort fields to list view fields
        const fieldMap = {
            'date': 'date',
            'views': 'likes', // Since Instagram likes/views both use view_count, prioritize likes column
            'comments': 'comments'
        };
        
        const listField = fieldMap[field] || 'date';
        
        this.currentListSort = {
            field: listField,
            direction: direction || 'desc'
        };
        
        // Update header visual indicators
        this.updateSortHeaders();
    }

    /**
     * Update sort header visual indicators
     */
    updateSortHeaders() {
        const headers = document.querySelectorAll('.sortable-header');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.dataset.sort === this.currentListSort.field) {
                header.classList.add(`sort-${this.currentListSort.direction}`);
            }
        });
    }

    /**
     * Update stats display
     */
    updateStats() {
        const stats = this.dataManager.getStats();
        this.elements.totalComments.textContent = `${this.formatNumber(stats.totalComments)} comments`;
    }

    /**
     * Update result count
     */
    updateResultCount(count) {
        this.elements.resultCount.textContent = `${this.formatNumber(count)} posts`;
    }

    /**
     * Render pagination
     */
    renderPagination(result) {
        let html = '';
        const currentPage = result.page;
        const totalPages = result.totalPages;
        
        // Previous button
        if (result.hasPrev) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">Previous</span></li>`;
        }
        
        // Page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);
        
        if (startPage > 1) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="1">1</a></li>`;
            if (startPage > 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            if (i === currentPage) {
                html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
            } else {
                html += `<li class="page-item"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
            }
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a></li>`;
        }
        
        // Next button
        if (result.hasNext) {
            html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;
        } else {
            html += `<li class="page-item disabled"><span class="page-link">Next</span></li>`;
        }
        
        this.elements.videoPagination.innerHTML = html;
        
        // Add click handlers
        this.elements.videoPagination.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                this.currentPagination.page = parseInt(e.target.dataset.page);
                this.loadVideoGrid();
            }
        });
    }

    /**
     * Load more comments
     */
    async loadMoreComments() {
        this.currentCommentPagination.page++;
        await this.loadComments();
    }

    /**
     * Update load more button
     */
    updateLoadMoreButton(result) {
        if (result.hasNext) {
            this.elements.loadMoreComments.style.display = 'block';
        } else {
            this.elements.loadMoreComments.style.display = 'none';
        }
    }

    /**
     * Utility: Format numbers (1000 -> 1K)
     */
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1).replace('.0', '') + 'K';
        }
        return num.toString();
    }

    /**
     * Utility: Escape HTML
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Utility: Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('💥', message);
        // You could implement a toast notification system here
        alert(`Error: ${message}`);
    }

    /**
     * Show export format menu for bulk export buttons
     */
    showExportAllMenu(button, exportType, videoId = null) {
        // Hide any existing menu
        this.hideExportAllMenu();
        
        // Store video ID for list view exports
        this.currentExportVideoId = videoId;

        // Create menu
        const menu = document.createElement('div');
        menu.className = 'export-menu';
        menu.innerHTML = `
            <div class="export-menu-option" data-format="comment-only" data-export-type="${exportType}">
                <span>Export comment only</span>
            </div>
            <div class="export-menu-option" data-format="iphone-dark" data-export-type="${exportType}">
                <span>Export iPhone dark</span>
            </div>
            <div class="export-menu-option" data-format="iphone-light" data-export-type="${exportType}">
                <span>Export iPhone light</span>
            </div>
        `;

        // Position menu relative to button
        const buttonRect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (buttonRect.bottom + 5) + 'px';
        menu.style.left = (buttonRect.left - 50) + 'px';
        menu.style.zIndex = '1000';

        // Add menu to body
        document.body.appendChild(menu);

        // Add click handlers for menu options
        menu.addEventListener('click', (e) => {
            const option = e.target.closest('.export-menu-option');
            if (option) {
                const format = option.dataset.format;
                const exportType = option.dataset.exportType;
                this.handleExportAllFormat(exportType, format);
                this.hideExportAllMenu();
            }
        });

        // Close menu when clicking outside
        document.addEventListener('click', this.handleExportMenuClickOutside);
    }

    /**
     * Hide export all menu
     */
    hideExportAllMenu() {
        const existingMenu = document.querySelector('.export-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        document.removeEventListener('click', this.handleExportMenuClickOutside);
    }

    /**
     * Handle clicking outside export menu
     */
    handleExportMenuClickOutside = (e) => {
        if (!e.target.closest('.export-menu') && !e.target.closest('button[id*="export"]')) {
            this.hideExportAllMenu();
        }
    }

    /**
     * Handle export format selection for bulk exports
     */
    handleExportAllFormat(exportType, format) {
        console.log(`Bulk export type: ${exportType}, format: ${format}, videoId: ${this.currentExportVideoId}`);
        
        // Store the selected format for use in the export process
        this.bulkExportFormat = format;
        
        if (exportType === 'single-video') {
            // Use stored video ID for list view exports, or current video for detail view
            const videoId = this.currentExportVideoId || (this.currentVideo ? this.currentVideo.video_id : null);
            if (videoId) {
                this.exportVideoComments(format, videoId);
            } else {
                this.showError('No video selected for export');
            }
        } else if (exportType === 'all-videos') {
            this.exportAllVideosComments(format);
        }
    }

    /**
     * Show success message
     */
    showSuccess(message, duration = 3000) {
        // Remove any existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Show success toast notification
     */
    showSuccessToast(message, duration = 3000) {
        // Remove any existing toasts
        const existingToasts = document.querySelectorAll('.toast');
        existingToasts.forEach(toast => toast.remove());
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast success';
        toast.innerHTML = `
            <i class="bi bi-check-circle-fill"></i>
            <span>${message}</span>
        `;
        
        // Add to page
        document.body.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Generate comment insights for current video
     */
    async generateCommentInsights() {
        if (!this.currentVideo) return;

        try {
            // Try to use pre-computed insights first for faster loading
            const preComputed = this.dataManager.getWordFrequencies(this.currentVideo.video_id);
            
            if (preComputed.word_cloud.length > 0) {
                // Use pre-computed data for instant loading
                this.renderWordCloud(preComputed.word_cloud);
                this.renderMiniWordCloud(preComputed.word_cloud.slice(0, 7)); // Show top 7 words in mini cloud
                this.elements.commentInsights.style.display = 'block';
                return;
            }

            // Fallback to real-time analysis if pre-computed data not available
            const allComments = await this.dataManager.getAllComments(this.currentVideo.video_id, {});
            const flatComments = this.flattenComments(allComments);

            if (flatComments.length === 0) {
                this.elements.commentInsights.style.display = 'none';
                return;
            }

            // Generate word frequency analysis
            const wordFreq = this.analyzeWordFrequency(flatComments);
            // Update UI
            this.renderWordCloud(wordFreq);
            this.renderMiniWordCloud(wordFreq.slice(0, 7)); // Show top 7 words in mini cloud
            
            // Load themes analysis (so it updates between posts)
            const themesData = this.analyzeThemes(flatComments);
            this.renderThemesAnalysis(themesData);
            
            this.elements.commentInsights.style.display = 'block';

        } catch (error) {
            console.error('❌ Failed to generate insights:', error);
            this.elements.commentInsights.style.display = 'none';
        }
    }

    /**
     * Analyze word frequency in comments
     */
    analyzeWordFrequency(comments) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'cannot', 'cant',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
            'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
            'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each',
            'few', 'more', 'most', 'some', 'such', 'no', 'nor', 'only', 'own',
            'same', 'so', 'than', 'too', 'very', 's', 't', 're', 've', 'll', 'd', 'just', 'now',
            'also', 'back', 'still', 'well', 'get', 'go', 'know', 'see', 'think', 'want',
            'really', 'way', 'new', 'first', 'last',
            'long', 'little', 'high', 'different', 'small',
            'large', 'next', 'early', 'young', 'important', 'few', 'public', 'same', 'able'
        ]);

        const wordCounts = {};

        comments.forEach(comment => {
            const text = comment.text || comment.content || '';
            const words = text.toLowerCase()
                .replace(/[^\w\s]/g, '') // Remove punctuation
                .split(/\s+/)
                .filter(word => word.length > 2 && !stopWords.has(word));

            words.forEach(word => {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            });
        });

        // Return top 20 words
        return Object.entries(wordCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 20)
            .map(([word, count]) => ({ word, count }));
    }


    /**
     * Check if word is a common stop word
     */
    isStopWord(word) {
        const stopWords = ['that', 'this', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were', 'what', 'where', 'your'];
        return stopWords.includes(word);
    }

    /**
     * Render word cloud
     */
    renderWordCloud(wordFreq) {
        if (wordFreq.length === 0) {
            this.elements.wordCloud.innerHTML = '<p class="text-muted text-center">No word data available</p>';
            return;
        }

        const maxCount = wordFreq[0].count;
        const html = wordFreq.map(({ word, count }) => {
            const size = Math.min(5, Math.max(1, Math.ceil((count / maxCount) * 5)));
            return `<span class="word-item size-${size}" title="${count} occurrences">
                ${word} <span class="word-count">${count}</span>
            </span>`;
        }).join('');

        this.elements.wordCloud.innerHTML = html;
    }


    /**
     * Render mini word cloud above analytics button
     */
    renderMiniWordCloud(wordFreq) {
        const miniWordCloudElement = document.getElementById('miniWordCloud');
        if (!miniWordCloudElement) return;
        
        if (wordFreq.length === 0) {
            miniWordCloudElement.innerHTML = '<div class="text-muted text-center small">No data</div>';
            return;
        }

        // Start with initial render to measure
        this.renderMiniWordCloudContent(miniWordCloudElement, wordFreq, 7);
        
        // Check if content overflows and adjust if needed
        this.adjustMiniWordCloudSize(miniWordCloudElement, wordFreq);
        
        // Add click handlers to word items
        miniWordCloudElement.querySelectorAll('.mini-word-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const word = e.target.closest('.mini-word-item').dataset.word;
                if (word) {
                    // Set the search term in the comment search box
                    const searchInput = document.getElementById('commentSearch');
                    if (searchInput) {
                        searchInput.value = word;
                        // Trigger the search
                        const event = new Event('input', { bubbles: true });
                        searchInput.dispatchEvent(event);
                    }
                }
            });
        });
    }

    /**
     * Render mini word cloud content with specified number of words
     */
    renderMiniWordCloudContent(container, wordFreq, maxWords) {
        const words = wordFreq.slice(0, maxWords);
        
        const html = words.map(({ word, count }) => {
            // Truncate long words to prevent overflow
            const displayWord = word.length > 12 ? word.substring(0, 12) + '...' : word;
            const title = word.length > 12 ? `"${word}" - ${count} mentions` : `${count} mentions`;
            
            return `<span class="mini-word-item" title="${title}" data-word="${word}" style="cursor: pointer;">
                ${this.escapeHTML(displayWord)} <span class="count">${count}</span>
            </span>`;
        }).join('');

        container.innerHTML = html;
    }

    /**
     * Adjust mini word cloud size to fit container
     */
    adjustMiniWordCloudSize(container, wordFreq) {
        const maxAttempts = 3;
        let attempts = 0;
        let currentWordCount = 7;
        
        while (attempts < maxAttempts && currentWordCount > 3) {
            // Check if content overflows
            if (container.scrollWidth > container.clientWidth) {
                // Reduce number of words
                currentWordCount--;
                this.renderMiniWordCloudContent(container, wordFreq, currentWordCount);
                attempts++;
            } else {
                // Content fits, we're done
                break;
            }
        }
        
        // If still overflowing after reducing words, make font smaller
        if (container.scrollWidth > container.clientWidth) {
            container.style.fontSize = '0.75rem';
            
            // One more check - if still overflowing, make even smaller
            if (container.scrollWidth > container.clientWidth) {
                container.style.fontSize = '0.7rem';
            }
        }
    }

    /**
     * Switch between insight tabs
     */
    switchInsightTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Show/hide tab content
        document.querySelectorAll('.insight-tab').forEach(tab => {
            tab.style.display = 'none';
        });

        if (tabName === 'wordcloud') {
            document.getElementById('wordCloudTab').style.display = 'block';
        }
    }

    /**
     * Flatten comments with replies
     */
    flattenComments(commentsWithReplies) {
        const flattened = [];
        commentsWithReplies.forEach(comment => {
            flattened.push(comment);
            if (comment.replies && comment.replies.length > 0) {
                flattened.push(...comment.replies);
            }
        });
        return flattened;
    }

    /**
     * Check and notify about ZIP capabilities
     */
    checkZipCapabilities() {
        if (window.ZipWriter) {
            this.showSuccess('Enhanced export enabled! You can now export up to 200 comments per ZIP file.', 5000);
        } else {
            console.log('ℹ️ Using standard export mode with 49 comments per ZIP file for compatibility.');
        }
    }
    
    /**
     * Extract question from comment
     */
    extractQuestion(content) {
        const sentences = content.split(/[.!?]+/);
        const question = sentences.find(s => s.includes('?')) || sentences[0];
        return question.trim() + (question.includes('?') ? '' : '?');
    }
    
    /**
     * Extract main topic from caption
     */
    extractTopic(caption) {
        // Look for Medical Medium specific topics
        const topics = ['Heavy Metal Detox', 'Celery Juice', 'Liver Rescue', 'Brain Saver', 'Aloe Vera', 'Wild Blueberries'];
        for (const topic of topics) {
            if (caption.toLowerCase().includes(topic.toLowerCase())) {
                return topic;
            }
        }
        // Return first few words as fallback
        return caption.split(' ').slice(0, 3).join(' ');
    }
    
    /**
     * Truncate text helper
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }
    
    /**
     * Format date to YYYY/MM/DD HH:MM format
     */
    formatFullDate(dateStr) {
        const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date:', dateStr);
            return '2024/01/01 12:00'; // Default fallback
        }
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }
    
    /**
     * Calculate relevance score for a comment based on frequent words
     */
    calculateRelevanceScore(comment, frequentWords) {
        if (!frequentWords || frequentWords.length === 0) {
            return 0;
        }
        
        const text = (comment.text || comment.content || '').toLowerCase();
        const words = text.replace(/[^\w\s]/g, '').split(/\s+/);
        
        let score = 0;
        const frequentWordSet = new Set(frequentWords.slice(0, 20).map(w => w.word.toLowerCase()));
        
        words.forEach(word => {
            if (frequentWordSet.has(word)) {
                // Weight by position in frequent words list (higher for more frequent words)
                const wordObj = frequentWords.find(w => w.word.toLowerCase() === word);
                if (wordObj) {
                    score += wordObj.count;
                }
            }
        });
        
        return score;
    }

    /**
     * SPIE: Setup hardcoded post data
     */
    setupHardcodedData() {
        console.log('🎯 Setting up hardcoded post data for SPIE');
        
        // Hardcoded post metadata
        this.hardcodedPost = {
            video_id: 'DEFmqyBuiCA',
            shortcode: 'DEFmqyBuiCA',
            title: 'What is URINE Therapy?! 😱',
            description: 'What is URINE Therapy?! 😱',
            published_at: '2024-12-27T10:55:15Z',
            view_count: 31222,
            like_count: 31222,
            comment_count: 0, // Will be set from loaded comments
            author: 'jonno.otto',
            username: 'jonno.otto',
            hasMedia: true,
            media_url: 'DEFmqyBuiCA_2024_12_27__10_55_15.mp4'
        };
        
        console.log('✅ Hardcoded post data setup complete');
    }

    /**
     * SPIE: Load the single post view
     */
    async loadSinglePost() {
        try {
            console.log('📹 Loading single post view for SPIE');
            
            // Set up the data manager with our hardcoded post
            this.dataManager.videos = [this.hardcodedPost];
            this.dataManager.videoMap = new Map();
            this.dataManager.videoMap.set(this.hardcodedPost.video_id, this.hardcodedPost);
            
            // Initialize video player
            this.videoPlayer = new VideoPlayer(
                document.getElementById('videoPlayer'),
                document.getElementById('videoFallback'),
                null // No mode manager needed for hardcoded data
            );
            
            // Initialize export service
            this.exportService = new ExportService();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load the hardcoded comments
            await this.loadHardcodedComments();
            
            // Show the video detail view directly
            this.currentVideo = this.hardcodedPost;
            this.currentView = 'video-detail';
            
            // Update UI to show video detail view
            this.elements.videoGridView.style.display = 'none';
            this.elements.videoListView.style.display = 'none';
            this.elements.videoDetailView.style.display = 'block';
            
            // Hide navigation elements
            document.getElementById('channel-navigation').style.display = 'none';
            document.getElementById('statsBarContainer').style.display = 'none';
            
            // Load video media
            await this.loadHardcodedVideo();
            
            // Update video info
            this.updateVideoInfo(this.hardcodedPost);
            
            // Load comments (no pagination limit for single post view)
            this.currentCommentPagination = { page: 1, limit: 999999 };
            await this.loadComments();
            
            // Generate and show insights
            await this.generateCommentInsights();
            
            // Set up post analytics toggle
            this.setupAnalyticsToggle();
            
            console.log('✅ Single post view loaded successfully');
            
            // Store original comments for filtering
            this.originalComments = [...this.dataManager.comments];
            
            // Set up analytics click handlers
            this.setupAnalyticsClickHandlers();
            
        } catch (error) {
            console.error('❌ Failed to load single post:', error);
            throw error;
        }
    }

    /**
     * SPIE: Load hardcoded comments from CSV file
     */
    async loadHardcodedComments() {
        try {
            console.log('💬 Loading hardcoded comments from CSV');
            
            // Load comments using the data manager's JSON loader
            const commentsPath = 'DEFmqyBuiCA_comments.json';
            
            await this.dataManager.loadCommentsFromJSON(commentsPath);
            
            // Update comment count in post data
            this.hardcodedPost.comment_count = this.dataManager.comments.length;
            
            console.log(`✅ Loaded ${this.dataManager.comments.length} comments for single post`);
            
        } catch (error) {
            console.error('❌ Failed to load hardcoded comments:', error);
            this.dataManager.comments = [];
        }
    }

    /**
     * SPIE: Load hardcoded video file
     */
    async loadHardcodedVideo() {
        try {
            console.log('🎬 Loading hardcoded video file');
            
            const videoPath = 'DEFmqyBuiCA_2024_12_27__10_55_15.mp4';
            
            // Set up video element
            const videoElement = document.getElementById('videoPlayer');
            if (videoElement) {
                videoElement.src = videoPath;
                videoElement.load();
            }
            
            console.log('✅ Video loaded from:', videoPath);
            
        } catch (error) {
            console.error('❌ Failed to load hardcoded video:', error);
        }
    }

    /**
     * Set up analytics click handlers for filtering
     */
    setupAnalyticsClickHandlers() {
        // Set up event delegation for analytics panel
        document.addEventListener('click', (e) => {
            // Handle sentiment item clicks
            if (e.target.closest('.sentiment-item')) {
                const sentimentItem = e.target.closest('.sentiment-item');
                const sentimentType = this.extractSentimentType(sentimentItem);
                if (sentimentType) {
                    this.filterBySentiment(sentimentType, sentimentItem);
                }
            }
            
            // Handle word cloud clicks (both analytics and mini word clouds)
            if (e.target.closest('.analytics-word-item')) {
                const wordItem = e.target.closest('.analytics-word-item');
                const word = this.extractWordFromElement(wordItem);
                if (word) {
                    this.filterByWord(word, wordItem);
                }
            }
            
            // Handle mini word cloud clicks
            if (e.target.closest('.mini-word-item')) {
                const wordItem = e.target.closest('.mini-word-item');
                const word = wordItem.getAttribute('data-word') || this.extractWordFromElement(wordItem);
                if (word) {
                    this.filterByWord(word, wordItem);
                }
            }
            
            // Handle theme clicks
            if (e.target.closest('.theme-item')) {
                const themeItem = e.target.closest('.theme-item');
                const theme = this.extractThemeFromElement(themeItem);
                if (theme) {
                    this.filterByTheme(theme, themeItem);
                }
            }
        });
    }

    /**
     * Filter comments by sentiment
     */
    filterBySentiment(sentimentType, element) {
        console.log('🔍 Filtering by sentiment:', sentimentType);
        
        // Clear previous active states
        document.querySelectorAll('.sentiment-item.active, .analytics-word-item.active, .theme-item.active').forEach(el => {
            el.classList.remove('active');
        });
        
        // Set active state if element provided
        if (element) {
            element.classList.add('active');
        } else {
            // Find and activate the sentiment item
            const sentimentItem = document.querySelector(`.sentiment-item[onclick*="${sentimentType}"]`);
            if (sentimentItem) sentimentItem.classList.add('active');
        }
        
        // Filter comments based on sentiment patterns
        const sentimentPatterns = this.getSentimentPatterns(sentimentType);
        const filteredComments = this.originalComments.filter(comment => {
            const text = comment.content || comment.text || '';
            return sentimentPatterns.some(pattern => pattern.test(text));
        });
        
        this.applyCommentFilter(filteredComments, this.formatSentimentLabel(sentimentType));
    }

    /**
     * Filter comments by word
     */
    filterByWord(word, element) {
        console.log('🔍 Filtering by word:', word);
        
        // Clear previous active states
        document.querySelectorAll('.sentiment-item.active, .analytics-word-item.active, .theme-item.active').forEach(el => {
            el.classList.remove('active');
        });
        
        // Set active state
        element.classList.add('active');
        
        // Filter comments containing the word
        const filteredComments = this.originalComments.filter(comment => {
            const text = (comment.content || comment.text || '').toLowerCase();
            return text.includes(word.toLowerCase());
        });
        
        this.applyCommentFilter(filteredComments, `Word: "${word}"`);
    }

    /**
     * Apply comment filter and update UI
     */
    applyCommentFilter(filteredComments, filterLabel) {
        this.analyticsFilter = { comments: filteredComments, label: filterLabel };
        
        // Update comment list
        this.renderComments(filteredComments);
        
        // Update comments count
        const commentsTitle = document.getElementById('commentsTitle');
        if (commentsTitle) {
            commentsTitle.textContent = `Comments (${filteredComments.length} of ${this.originalComments.length})`;
        }
        
        // Show filter status
        this.showFilterStatus(filterLabel, filteredComments.length);
    }

    /**
     * Clear analytics filter
     */
    clearAnalyticsFilter() {
        console.log('🔄 Clearing analytics filter');
        
        // Clear active states
        document.querySelectorAll('.sentiment-item.active, .analytics-word-item.active, .theme-item.active').forEach(el => {
            el.classList.remove('active');
        });
        
        // Reset filter
        this.analyticsFilter = null;
        
        // Restore original comments
        this.renderComments(this.originalComments);
        
        // Update comments count
        const commentsTitle = document.getElementById('commentsTitle');
        if (commentsTitle) {
            commentsTitle.textContent = `Comments (${this.originalComments.length})`;
        }
        
        // Hide filter status
        this.hideFilterStatus();
    }

    /**
     * Show filter status indicator
     */
    showFilterStatus(filterLabel, count) {
        const filterStatus = document.getElementById('filterStatus');
        const filterText = document.getElementById('filterText');
        
        if (filterStatus && filterText) {
            filterText.textContent = `${count} Comments filtered below (${filterLabel})`;
            filterStatus.style.display = 'block';
        }
    }

    /**
     * Hide filter status indicator
     */
    hideFilterStatus() {
        const filterStatus = document.getElementById('filterStatus');
        if (filterStatus) {
            filterStatus.style.display = 'none';
        }
    }

    /**
     * Extract sentiment type from element
     */
    extractSentimentType(element) {
        const label = element.querySelector('.sentiment-label')?.textContent;
        if (!label) return null;
        
        const labelMap = {
            'Information Seeking': 'information_seeking',
            'Personal Experience': 'personal_experience',
            'Supportive': 'supportive_believing',
            'Skeptical': 'skeptical_critical',
            'Medical Concerns': 'medical_questions',
            'Emotional Reactions': 'emotional_reactions',
            'Other': 'other'
        };
        
        return labelMap[label] || null;
    }

    /**
     * Extract word from analytics word element
     */
    extractWordFromElement(element) {
        const text = element.textContent;
        return text.replace(/\s+\d+$/, '').trim(); // Remove count numbers at the end
    }

    /**
     * Filter comments by theme
     */
    filterByTheme(theme, element) {
        console.log('🔍 Filtering by theme:', theme);
        
        // Clear previous active states
        document.querySelectorAll('.sentiment-item.active, .analytics-word-item.active, .theme-item.active').forEach(el => {
            el.classList.remove('active');
        });
        
        // Set active state
        if (element) {
            element.classList.add('active');
        }
        
        // Filter comments based on theme keywords
        const themeKeywords = this.getThemeKeywords(theme);
        const filteredComments = this.originalComments.filter(comment => {
            const text = (comment.content || comment.text || '').toLowerCase();
            return themeKeywords.some(keyword => text.includes(keyword.toLowerCase()));
        });
        
        this.applyCommentFilter(filteredComments, `Theme: ${theme}`);
    }

    /**
     * Extract theme from theme element
     */
    extractThemeFromElement(element) {
        const titleElement = element.querySelector('.theme-title');
        return titleElement ? titleElement.textContent.trim() : null;
    }

    /**
     * Get theme keywords for filtering
     */
    getThemeKeywords(theme) {
        const themeKeywords = {
            'Safety Concerns': ['safe', 'dangerous', 'risk', 'infection', 'bacteria', 'sterile', 'clean', 'harmful'],
            'How-To Questions': ['how', 'when', 'how much', 'how often', 'what time', 'morning', 'fresh', 'drink', 'first'],
            'Medical Skepticism': ['doctor', 'medical', 'science', 'proof', 'study', 'research', 'evidence', 'fda', 'approved'],
            'Personal Success Stories': ['tried', 'worked', 'helped', 'cured', 'healed', 'better', 'improved', 'results', 'my'],
            'Cultural/Religious References': ['bible', 'ancient', 'tradition', 'culture', 'ancestors', 'natural', 'primitive'],
            'Comparison to Other Therapies': ['like', 'similar', 'compare', 'versus', 'instead', 'alternative', 'other'],
            'Extreme Reactions': ['crazy', 'insane', 'wtf', 'omg', 'unbelievable', 'ridiculous', 'absurd', 'weird'],
            'Health Conditions Mentioned': ['cancer', 'diabetes', 'kidney', 'liver', 'skin', 'acne', 'eczema', 'arthritis', 'disease']
        };
        
        return themeKeywords[theme] || [];
    }

    /**
     * Get sentiment keywords for filtering
     */
    getSentimentPatterns(sentimentType) {
        const sentimentPatterns = {
            grateful_supportive: [
                /\b(thank|thanks|grateful|bless|amen|halleluja|love|amazing|great|beautiful)\b/i,
                /\b(well said|right|correct|exactly|absolutely|agree|true)\b/i,
                /\b(keep|continue|spread|awareness|light)\b/i,
                /🙏|❤️|💜|💙|🙌/
            ],
            genuine_questions: [
                /\b(how|what|when|where|which|why)\b.*\?/i,
                /\b(recommend|suggest|advice|help|guide)\b/i,
                /\b(cleanse|parasite|cure|heal|treatment|protocol)\b.*\?/i,
                /\b(safe|side effects|doctor|medical)\b.*\?/i
            ],
            personal_testimony: [
                /\b(i|my|me)\b.*\b(tried|did|experience|worked|helped|cured|healed|better|improved|saved)\b/i,
                /\b(urine therapy)\b.*\b(saved|helped|cured|healed|life)\b/i,
                /\b(menopause|cancer|psoriasis|autism)\b.*\b(helped|cured|healed|better)\b/i
            ],
            curiosity_shock: [
                /\b(wow|omg|unbelievable|insane|crazy)\b/i,
                /😱|😮|🤔|😲/,
                /\b(knowledge|learn|interesting|fascinating)\b/i
            ],
            skeptical_concern: [
                /\b(toxic|dangerous|suspicious|fake|scam|bullshit|bs|ridiculous|stupid|nonsense)\b/i,
                /\b(disgusting|gross|eww|yuck)\b/i,
                /\b(mad|confused|why)\b/i
            ],
            simple_engagement: [
                /^(yes|no|true|ok|good|nice|cool)$/i,
                /^[🙏🙌❤️💜💙😍🔥]+$/,
                /^\w{1,3}$/
            ],
            uncategorized: [/.*/ ] // Catch-all pattern
        };
        
        return sentimentPatterns[sentimentType] || [];
    }

    /**
     * Format sentiment label for display
     */
    formatSentimentLabel(sentimentType) {
        const labelMap = {
            'grateful_supportive': 'Grateful & Supportive',
            'genuine_questions': 'Genuine Questions',
            'personal_testimony': 'Personal Testimony',
            'curiosity_shock': 'Curiosity & Shock',
            'skeptical_concern': 'Skeptical & Concerned',
            'simple_engagement': 'Simple Engagement',
            'uncategorized': 'Other'
        };
        
        return labelMap[sentimentType] || sentimentType;
    }

    /**
     * Show export all menu for format selection
     */
    showExportAllMenu(button, exportType = 'single-video') {
        // Hide any existing menu
        this.hideExportAllMenu();
        
        const menu = document.createElement('div');
        menu.className = 'export-menu export-all-menu';
        menu.innerHTML = `
            <div class="export-menu-option" data-format="comment-only" data-export-type="${exportType}">
                <span>📝 Export comment only</span>
            </div>
            <div class="export-menu-option" data-format="iphone-dark" data-export-type="${exportType}">
                <span>📱 Export iPhone dark</span>
            </div>
            <div class="export-menu-option" data-format="iphone-light" data-export-type="${exportType}">
                <span>📱 Export iPhone light</span>
            </div>
        `;
        
        // Position menu relative to button
        const buttonRect = button.getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.top = (buttonRect.bottom + 5) + 'px';
        menu.style.left = (buttonRect.left - 80) + 'px'; // Offset to the left
        menu.style.zIndex = '1000';
        
        // Add menu to body
        document.body.appendChild(menu);
        
        // Add click handlers for menu options
        menu.addEventListener('click', (e) => {
            const option = e.target.closest('.export-menu-option');
            if (option) {
                const format = option.dataset.format;
                const exportType = option.dataset.exportType;
                this.handleExportAllFormat(exportType, format);
                this.hideExportAllMenu();
            }
        });
        
        // Store current menu for cleanup
        this.currentExportAllMenu = menu;
        
        // Close menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', this.closeExportAllMenuHandler = (e) => {
                if (!e.target.closest('.export-all-menu') && !e.target.closest('#exportSinglePostComments')) {
                    this.hideExportAllMenu();
                }
            });
        }, 100);
    }

    /**
     * Hide export all menu
     */
    hideExportAllMenu() {
        const existingMenu = document.querySelector('.export-all-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        if (this.closeExportAllMenuHandler) {
            document.removeEventListener('click', this.closeExportAllMenuHandler);
            this.closeExportAllMenuHandler = null;
        }
    }

    /**
     * Handle export all format selection
     */
    async handleExportAllFormat(exportType, format) {
        console.log(`🚀 Starting bulk export: type=${exportType}, format=${format}`);
        
        if (exportType === 'single-video' && this.currentVideo) {
            await this.exportSingleVideoComments(format);
        } else {
            console.error('❌ No current video for export');
            this.showError('No video selected for export');
        }
    }

    /**
     * Export all comments from current video
     */
    async exportSingleVideoComments(format = 'comment-only') {
        try {
            console.log(`📦 Exporting all comments from current video in ${format} format`);
            
            this.showExportProgress('single');
            
            await this.exportService.exportVideoComments(
                this.currentVideo.video_id,
                this.dataManager,
                (progress) => this.updateExportProgress(progress, 'single'),
                format
            );
            
            this.hideExportProgress();
            
        } catch (error) {
            console.error('❌ Failed to export video comments:', error);
            this.showError('Failed to export comments');
            this.hideExportProgress();
        }
    }

    /**
     * Show export progress modal
     */
    showExportProgress(mode = 'single') {
        let progressElement = document.getElementById('exportProgress');
        
        if (!progressElement) {
            // Create progress modal if it doesn't exist
            progressElement = document.createElement('div');
            progressElement.id = 'exportProgress';
            progressElement.className = 'export-progress';
            progressElement.style.display = 'block';
            
            progressElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="mb-0" id="exportProgressTitle">Exporting Comments</h6>
                    <button type="button" class="btn-close close-progress" aria-label="Close"></button>
                </div>
                
                <!-- Overall Progress -->
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <small class="text-muted" id="overallProgressLabel">Progress:</small>
                    <small class="text-muted" id="overallProgressStats">0/0</small>
                </div>
                <div class="progress mb-2" style="height: 8px;">
                    <div id="exportProgressBar" class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                <div id="exportProgressText" class="progress-text">Starting export...</div>
            `;
            
            document.body.appendChild(progressElement);
            
            // Add close handler
            progressElement.querySelector('.close-progress').addEventListener('click', () => {
                this.exportService.cancelExport();
                this.hideExportProgress();
            });
        } else {
            progressElement.style.display = 'block';
        }
        
        // Cache elements
        this.elements.exportProgress = progressElement;
        this.elements.exportProgressBar = progressElement.querySelector('#exportProgressBar');
        this.elements.exportProgressText = progressElement.querySelector('#exportProgressText');
        this.elements.exportProgressTitle = progressElement.querySelector('#exportProgressTitle');
        this.elements.overallProgressStats = progressElement.querySelector('#overallProgressStats');
    }

    /**
     * Update export progress
     */
    updateExportProgress(progress, mode = 'single') {
        if (!this.elements.exportProgressBar) return;
        
        // Update progress bar
        const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
        this.elements.exportProgressBar.style.width = `${percentage}%`;
        
        // Update stats
        if (this.elements.overallProgressStats) {
            this.elements.overallProgressStats.textContent = `${progress.current || 0}/${progress.total || 0} comments`;
        }
        
        // Update status text
        if (this.elements.exportProgressText) {
            this.elements.exportProgressText.textContent = progress.status || 'Processing...';
        }
        
        console.log(`📊 Export progress: ${progress.current}/${progress.total} - ${progress.status}`);
    }

    /**
     * Hide export progress modal
     */
    hideExportProgress() {
        if (this.elements.exportProgress) {
            this.elements.exportProgress.style.display = 'none';
        }
    }

    /**
     * Load custom post from uploaded data
     */
    async loadCustomPost(postData) {
        try {
            console.log('📹 Loading custom post from upload:', postData);
            
            // Set up the data manager with custom post
            this.customPost = {
                video_id: postData.id,
                shortcode: postData.id,
                title: postData.description,
                description: postData.description,
                published_at: postData.date,
                view_count: postData.likes,
                like_count: postData.likes,
                comment_count: postData.comments.length,
                author: postData.username,
                username: postData.username,
                hasMedia: true,
                media_url: postData.media.url,
                media_type: postData.media.type,
                avatar_url: postData.avatar
            };
            
            this.dataManager.videos = [this.customPost];
            this.dataManager.videoMap = new Map();
            this.dataManager.videoMap.set(this.customPost.video_id, this.customPost);
            
            console.log('✅ Custom post data manager setup:', {
                videos: this.dataManager.videos.length,
                videoMapSize: this.dataManager.videoMap.size,
                customPostId: this.customPost.video_id,
                customPostUsername: this.customPost.username
            });
            
            // Convert uploaded comments to the expected format
            this.convertUploadedComments(postData.comments);
            
            // Initialize video player
            this.videoPlayer = new VideoPlayer(
                document.getElementById('videoPlayer'),
                document.getElementById('videoFallback'),
                null
            );
            
            // Initialize export service
            this.exportService = new ExportService();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Show the video detail view directly
            this.currentVideo = this.customPost;
            this.currentView = 'video-detail';
            
            // Update UI to show video detail view
            this.elements.videoGridView.style.display = 'none';
            this.elements.videoListView.style.display = 'none';
            this.elements.videoDetailView.style.display = 'block';
            
            // Hide navigation elements
            document.getElementById('channel-navigation').style.display = 'none';
            document.getElementById('statsBarContainer').style.display = 'none';
            
            // Load custom media
            await this.loadCustomMedia(postData);
            
            // Update video info with custom data
            this.updateVideoInfoCustom(this.customPost);
            
            // Load comments (no pagination limit for single post view)
            this.currentCommentPagination = { page: 1, limit: 999999 };
            console.log('🔄 About to load comments...');
            await this.loadComments();
            console.log('✅ Comments loaded successfully');
            
            // Generate and show insights
            console.log('🔄 About to generate insights...');
            await this.generateCommentInsights();
            console.log('✅ Insights generated successfully');
            
            // Set up post analytics toggle
            this.setupAnalyticsToggle();
            
            console.log('✅ Custom post view loaded successfully');
            
            // Store original comments for filtering
            this.originalComments = [...this.dataManager.comments];
            console.log('📊 Stored original comments:', this.originalComments.length);
            
            // Set up analytics click handlers
            this.setupAnalyticsClickHandlers();
            
        } catch (error) {
            console.error('❌ Failed to load custom post:', error);
            throw error;
        }
    }

    /**
     * Convert uploaded comments to expected format
     */
    convertUploadedComments(uploadedComments) {
        console.log('🔄 Converting uploaded comments:', uploadedComments.length);
        
        const convertedComments = uploadedComments.map((comment, index) => {
            const author = comment.Author || comment.username || 'Anonymous';
            const converted = {
                id: comment.Id || comment.id || `comment_${Date.now()}_${Math.random()}`,
                comment_id: comment.Id || comment.id || `comment_${Date.now()}_${Math.random()}`, // Add comment_id for export buttons
                user_id: comment.UserId || comment.user_id || 'unknown',
                username: author,
                author: author, // Add author field for compatibility
                user_avatar: comment.Avatar || comment.user_avatar || '',
                content: comment.Content || comment.content || '',
                text: comment.Content || comment.content || '', // Add text field for compatibility
                created_at: comment.CommentAt || comment.created_at || new Date().toISOString(),
                likes: parseInt(comment.ReactionsCount || comment.likes || 0),
                video_id: this.customPost.video_id,
                parent_id: comment.Depth === '0' ? null : comment.parent_id,
                replies: [],
                is_reply: comment.Depth !== '0'
            };
            
            // Log first few comments for debugging
            if (index < 3) {
                console.log(`💬 Comment ${index + 1}:`, {
                    original: comment,
                    converted: converted
                });
            }
            
            return converted;
        });
        
        // Set up data manager comments
        this.dataManager.comments = convertedComments;
        this.dataManager.commentsByVideo = new Map();
        this.dataManager.commentsByVideo.set(this.customPost.video_id, convertedComments);
        
        console.log(`✅ Converted ${convertedComments.length} comments for video ${this.customPost.video_id}`);
        console.log('📊 Comment authors sample:', convertedComments.slice(0, 5).map(c => c.username));
    }

    /**
     * Load custom media (video or image)
     */
    async loadCustomMedia(postData) {
        const videoPlayer = document.getElementById('videoPlayer');
        const instagramImage = document.getElementById('instagramImage');
        
        if (postData.media.type === 'video') {
            // Show video
            videoPlayer.src = postData.media.url;
            videoPlayer.style.display = 'block';
            instagramImage.style.display = 'none';
            
            console.log('🎥 Loading custom video media');
            // No need to call videoPlayer.initialize - just set the src
        } else {
            // Show image
            instagramImage.innerHTML = `<img src="${postData.media.url}" alt="Post media" style="width: 100%; height: auto; border-radius: 8px;">`;
            instagramImage.style.display = 'block';
            videoPlayer.style.display = 'none';
            
            console.log('🖼️ Loading custom image media');
        }
    }

    /**
     * Update video info with custom data
     */
    updateVideoInfoCustom(customPost) {
        // Update avatar and username
        const avatars = document.querySelectorAll('.profile-avatar img');
        avatars.forEach(avatar => {
            avatar.src = customPost.avatar_url;
            avatar.alt = customPost.username;
        });
        
        const usernames = document.querySelectorAll('.fw-bold');
        usernames.forEach(username => {
            if (username.textContent.includes('jonno.otto')) {
                username.textContent = customPost.username;
            }
        });
        
        // Update description
        const description = document.getElementById('videoDescription');
        if (description) {
            description.textContent = customPost.description;
        }
        
        // Update date
        const dateElement = document.getElementById('videoDate');
        if (dateElement) {
            const date = new Date(customPost.published_at);
            dateElement.textContent = date.toLocaleDateString();
        }
        
        // Update like count
        const viewsElement = document.getElementById('videoViews');
        if (viewsElement) {
            viewsElement.textContent = customPost.like_count.toLocaleString();
        }
    }

    /**
     * Load demo post (existing functionality)
     */
    async loadDemoPost() {
        console.log('🚀 Loading demo post...');
        
        // Setup hardcoded post data
        this.setupHardcodedData();
        
        // Initialize data manager with hardcoded data
        this.dataManager.dataSource = 'hardcoded';
        
        // Load the single post view
        await this.loadSinglePost();
        
        console.log('✅ Demo post loaded successfully');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.archiveExplorer = new ArchiveExplorer();
});

// Export for use in other modules
window.ArchiveExplorer = ArchiveExplorer; 