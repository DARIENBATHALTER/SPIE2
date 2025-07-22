/**
 * Upload Manager - Handles file uploads and data processing for SPIE
 */
class UploadManager {
    constructor() {
        this.uploadedFiles = {
            avatar: null,
            media: null,
            comments: null,
            username: ''
        };
        
        this.loadFromStorage();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Username input
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) {
            usernameInput.addEventListener('input', () => {
                this.uploadedFiles.username = usernameInput.value.trim();
                this.saveToStorage();
                this.updateContinueButton();
            });
        }
        
        // Click handlers for upload areas
        ['avatar', 'media', 'comments'].forEach(type => {
            const uploadArea = document.getElementById(`${type}Upload`);
            if (uploadArea) {
                uploadArea.addEventListener('click', () => {
                    document.getElementById(`${type}Input`).click();
                });
            }
        });
    }
    
    handleFileDrop(event, type) {
        event.preventDefault();
        event.stopPropagation();
        
        const uploadArea = document.getElementById(`${type}Upload`);
        uploadArea.classList.remove('drag-over');
        
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0], type);
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.add('drag-over');
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.classList.remove('drag-over');
    }
    
    handleFileSelect(event, type) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file, type);
        }
    }
    
    async processFile(file, type) {
        // Validate file type and size
        if (!this.validateFile(file, type)) {
            return;
        }
        
        try {
            this.uploadedFiles[type] = file;
            
            if (type === 'comments') {
                await this.previewComments(file);
            } else {
                await this.previewMedia(file, type);
            }
            
            // Save avatar to localStorage for persistence
            if (type === 'avatar') {
                this.saveToStorage();
            }
            
            this.updateContinueButton();
        } catch (error) {
            console.error(`Error processing ${type} file:`, error);
            alert(`Error processing ${type} file. Please try again.`);
        }
    }
    
    validateFile(file, type) {
        const validations = {
            avatar: {
                types: ['image/png', 'image/jpeg', 'image/jpg'],
                maxSize: 10 * 1024 * 1024, // 10MB
                errorMsg: 'Avatar must be PNG or JPG format, max 10MB'
            },
            media: {
                types: ['video/mp4', 'image/jpeg', 'image/jpg'],
                maxSize: 100 * 1024 * 1024, // 100MB
                errorMsg: 'Media must be MP4 or JPG format, max 100MB'
            },
            comments: {
                types: ['text/csv', 'application/vnd.ms-excel'],
                maxSize: 50 * 1024 * 1024, // 50MB
                errorMsg: 'Comments must be CSV format, max 50MB'
            }
        };
        
        const validation = validations[type];
        
        // Check file type
        if (!validation.types.includes(file.type) && !file.name.toLowerCase().endsWith('.csv')) {
            alert(validation.errorMsg);
            return false;
        }
        
        // Check file size
        if (file.size > validation.maxSize) {
            alert(validation.errorMsg);
            return false;
        }
        
        return true;
    }
    
    async previewMedia(file, type) {
        const uploadContent = document.querySelector(`#${type}Upload .upload-content`);
        const uploadPreview = document.querySelector(`#${type}Upload .upload-preview`);
        const fileName = document.getElementById(`${type}FileName`);
        
        uploadContent.style.display = 'none';
        uploadPreview.style.display = 'flex';
        
        // Just show the filename
        if (fileName) {
            fileName.textContent = file.name;
        }
        
        // Store the file data for later use
        if (type === 'avatar' || type === 'media') {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Store the data URL but don't display preview
                this.uploadedFiles[`${type}DataUrl`] = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }
    
    async previewComments(file) {
        const uploadContent = document.querySelector('#commentsUpload .upload-content');
        const uploadPreview = document.querySelector('#commentsUpload .upload-preview');
        const fileName = document.getElementById('commentsFileName');
        
        uploadContent.style.display = 'none';
        uploadPreview.style.display = 'flex';
        
        // Just show the filename
        if (fileName) {
            fileName.textContent = file.name;
        }
        
        try {
            const csvText = await this.readFileAsText(file);
            const comments = this.parseCSV(csvText);
            
            // Store parsed comments for later use
            this.uploadedFiles.parsedComments = comments;
            console.log(`✅ Parsed ${comments.length} comments from CSV`);
        } catch (error) {
            console.error('Error parsing CSV:', error);
        }
    }
    
    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
    
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        const headers = this.parseCSVLine(lines[0]);
        const comments = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = this.parseCSVLine(line);
            if (values.length >= headers.length) {
                const comment = {};
                headers.forEach((header, index) => {
                    comment[header] = values[index] || '';
                });
                comments.push(comment);
            }
        }
        
        return comments;
    }
    
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
                    i++; // Skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }
    
    removeFile(type) {
        this.uploadedFiles[type] = null;
        if (type === 'comments') {
            this.uploadedFiles.parsedComments = null;
        }
        
        const uploadContent = document.querySelector(`#${type}Upload .upload-content`);
        const uploadPreview = document.querySelector(`#${type}Upload .upload-preview`);
        const fileInput = document.getElementById(`${type}Input`);
        
        uploadContent.style.display = 'block';
        uploadPreview.style.display = 'none';
        fileInput.value = '';
        
        this.updateContinueButton();
    }
    
    updateContinueButton() {
        const continueBtn = document.getElementById('continueBtn');
        const isValid = this.uploadedFiles.avatar && 
                       this.uploadedFiles.media && 
                       this.uploadedFiles.comments && 
                       this.uploadedFiles.username.length > 0;
        
        continueBtn.disabled = !isValid;
    }
    
    async loadCustomPost() {
        if (!this.isDataValid()) {
            alert('Please fill in all required fields');
            return;
        }
        
        try {
            // Hide welcome screen
            document.getElementById('directorySelectionModal').style.display = 'none';
            document.getElementById('loadingScreen').style.display = 'flex';
            
            // Convert files to data URLs for use in the app
            const avatarUrl = await this.fileToDataURL(this.uploadedFiles.avatar);
            const mediaUrl = await this.fileToDataURL(this.uploadedFiles.media);
            
            // Create post data
            const postData = {
                id: 'custom_post_' + Date.now(),
                username: this.uploadedFiles.username,
                avatar: avatarUrl,
                media: {
                    url: mediaUrl,
                    type: this.uploadedFiles.media.type.startsWith('video/') ? 'video' : 'image'
                },
                comments: this.uploadedFiles.parsedComments,
                date: new Date().toISOString(),
                likes: Math.floor(Math.random() * 1000) + 100,
                description: `Custom post by ${this.uploadedFiles.username}`
            };
            
            // Initialize the app with custom data
            window.customPostData = postData;
            
            // Load the main app
            this.initializeAppWithCustomData(postData);
            
        } catch (error) {
            console.error('Error loading custom post:', error);
            alert('Error loading custom post. Please try again.');
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('directorySelectionModal').style.display = 'flex';
        }
    }
    
    async fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    isDataValid() {
        return this.uploadedFiles.avatar && 
               this.uploadedFiles.media && 
               this.uploadedFiles.comments && 
               this.uploadedFiles.username.length > 0;
    }
    
    initializeAppWithCustomData(postData) {
        // Update loading progress
        document.getElementById('loadingStatus').textContent = 'Setting up custom post...';
        document.getElementById('loadingProgress').style.width = '70%';
        
        setTimeout(() => {
            // Hide loading screen and show app
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            
            // Initialize the post viewer with custom data
            if (window.archiveExplorer) {
                window.archiveExplorer.loadCustomPost(postData);
            } else {
                // Store data for when the app initializes
                window.pendingCustomPost = postData;
            }
        }, 1000);
    }
    
    loadDemoPost() {
        // Hide welcome screen and load the existing demo
        document.getElementById('directorySelectionModal').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'flex';
        
        // Load demo through the archive explorer
        setTimeout(async () => {
            if (window.archiveExplorer) {
                await window.archiveExplorer.loadDemoPost();
            }
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
        }, 1000);
    }
    
    /**
     * Load persisted data from localStorage
     */
    loadFromStorage() {
        try {
            // Load username
            const savedUsername = localStorage.getItem('spie_username');
            if (savedUsername) {
                this.uploadedFiles.username = savedUsername;
                const usernameInput = document.getElementById('usernameInput');
                if (usernameInput) {
                    usernameInput.value = savedUsername;
                }
            }
            
            // Load avatar
            const savedAvatar = localStorage.getItem('spie_avatar');
            if (savedAvatar) {
                // Convert base64 back to blob for display
                fetch(savedAvatar)
                    .then(res => res.blob())
                    .then(blob => {
                        this.uploadedFiles.avatar = blob;
                        this.previewMedia(blob, 'avatar');
                    })
                    .catch(err => console.log('Could not restore avatar:', err));
            }
            
        } catch (error) {
            console.log('Could not load from storage:', error);
        }
    }
    
    /**
     * Save data to localStorage
     */
    saveToStorage() {
        try {
            // Save username
            if (this.uploadedFiles.username) {
                localStorage.setItem('spie_username', this.uploadedFiles.username);
            }
            
            // Save avatar as base64
            if (this.uploadedFiles.avatar) {
                this.fileToDataURL(this.uploadedFiles.avatar)
                    .then(dataUrl => {
                        localStorage.setItem('spie_avatar', dataUrl);
                    })
                    .catch(err => console.log('Could not save avatar:', err));
            }
            
        } catch (error) {
            console.log('Could not save to storage:', error);
        }
    }
}

// Global functions for HTML event handlers
let uploadManager;

function handleFileDrop(event, type) {
    if (uploadManager) uploadManager.handleFileDrop(event, type);
}

function handleDragOver(event) {
    if (uploadManager) uploadManager.handleDragOver(event);
}

function handleDragLeave(event) {
    if (uploadManager) uploadManager.handleDragLeave(event);
}

function handleFileSelect(event, type) {
    if (uploadManager) uploadManager.handleFileSelect(event, type);
}

function removeFile(type) {
    if (uploadManager) uploadManager.removeFile(type);
}

function loadCustomPost() {
    if (uploadManager) uploadManager.loadCustomPost();
}

function loadDemoPost() {
    if (uploadManager) uploadManager.loadDemoPost();
}

// Initialize upload manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    uploadManager = new UploadManager();
});