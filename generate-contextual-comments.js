/**
 * Generate contextual Instagram comments for Medical Medium posts based on caption content
 */

import fs from 'fs';
import path from 'path';

// Sample usernames and avatar patterns
const usernames = [
    'healthwarrior_23', 'celery_juice_lover', 'healing_naturally', 'mm_follower2024', 'wellness_seeker',
    'chronic_healing', 'detox_queen', 'mm_community', 'health_advocate', 'natural_remedy',
    'liver_rescue_fan', 'brain_saver', 'healing_foods', 'mm_protocol', 'wellness_warrior',
    'chronic_fighter', 'holistic_health', 'natural_healing', 'mm_believer', 'health_journey',
    'healing_vibes', 'celery_power', 'detox_life', 'mm_support', 'wellness_coach',
    'healing_path', 'natural_cure', 'mm_inspiration', 'health_freedom', 'chronic_recovery',
    'liver_love', 'brain_healing', 'food_medicine', 'mm_wisdom', 'wellness_guide',
    'healing_hope', 'natural_health', 'mm_truth', 'health_seeker', 'chronic_warrior',
    'detox_daily', 'healing_light', 'mm_family', 'wellness_life', 'natural_living',
    'healing_journey', 'celery_healing', 'mm_grateful', 'health_warrior', 'chronic_hope'
];

// Health conditions
const conditions = [
    'chronic fatigue', 'fibromyalgia', 'thyroid issues', 'adrenal fatigue', 'digestive problems',
    'brain fog', 'anxiety', 'depression', 'autoimmune', 'Lyme disease',
    'SIBO', 'candida', 'heavy metal toxicity', 'EBV', 'mystery illness',
    'chronic pain', 'inflammation', 'gut issues', 'hormonal imbalance', 'migraines'
];

// MM protocols
const protocols = [
    'celery juice', 'heavy metal detox', 'liver rescue', 'morning cleanse', 'brain shot',
    'lemon water', 'wild blueberries', 'spirulina', 'barley grass juice powder', 'zinc',
    'B12', 'vitamin C', 'nascent iodine', 'selenium', 'magnesium'
];

// MM books
const books = [
    'Medical Medium', 'Life-Changing Foods', 'Liver Rescue', 'Thyroid Healing', 'Celery Juice',
    'Cleanse to Heal', 'Brain Saver', 'Brain Saver Protocols'
];

// Time references
const timeframes = [
    '2 weeks', '1 month', '3 months', '6 months', '1 year', '2 years',
    'a few days', 'a week', 'several months'
];

function generateAvatar(username) {
    // Use local avatar files from the Avatars directory
    const avatarFiles = [
        'Multiavatar-Agent Smith.png',
        'Multiavatar-Angel Eyes.png',
        'Multiavatar-Bloomdalf.png',
        'Multiavatar-Blue Meal Shake.png',
        'Multiavatar-Bogota.png',
        'Multiavatar-Choi.png',
        'Multiavatar-Cle.png',
        'Multiavatar-Clementine.png',
        'Multiavatar-Daniel Marlowe.png',
        'Multiavatar-Desmond.png',
        'Multiavatar-Extremadura.png',
        'Multiavatar-Iron Twin.png',
        'Multiavatar-Joker.png',
        'Multiavatar-Lucius Tattaglia.png',
        'Multiavatar-Marsellus Coolidge.png',
        'Multiavatar-Milo Minderbender.png',
        'Multiavatar-Orbit Escape.png',
        'Multiavatar-Ouarzazate.png',
        'Multiavatar-Pandalion.png',
        'Multiavatar-Papillon.png',
        'Multiavatar-Skeleto.png',
        'Multiavatar-Snooze 11.png',
        'Multiavatar-Spanglinga.png',
        'Multiavatar-МЦ ДРУИД.png'
    ];
    
    // Create a consistent hash from username to always assign the same avatar
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        const char = username.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    const avatarIndex = Math.abs(hash) % avatarFiles.length;
    return `Avatars/${avatarFiles[avatarIndex]}`;
}

// Analyze caption to determine context and generate appropriate comment templates
function analyzeCaption(caption) {
    const lowerCaption = caption.toLowerCase();
    const contextualTemplates = [];
    
    // Check for call-to-action patterns - much more extensive detection
    const callToActionPatterns = [
        /comment[\s"']+([A-Z][A-Z\s]*?)[\s"']+(?:and|to|for|we|will|link|dm|send|get)/i,
        /comment[\s"']+([A-Z][A-Z\s]*?)[\s"']/i,
        /comment[\s"']+([A-Z]+)[\s"']/i,
        /comment\s+"([^"]+)"/i,
        /comment\s+([A-Z]+)\s/i
    ];
    
    let foundKeyword = null;
    for (const pattern of callToActionPatterns) {
        const match = caption.match(pattern);
        if (match && match[1]) {
            foundKeyword = match[1].trim();
            // Clean up the keyword
            foundKeyword = foundKeyword.replace(/\s+(and|to|for|we|will|link|dm|you|get|send|now|the|a|an).*$/i, '');
            const wordCount = foundKeyword.split(/\s+/).length;
            if (wordCount <= 3 && foundKeyword.length > 0) {
                break;
            }
            foundKeyword = null;
        }
    }
    
    if (foundKeyword) {
        // Add MANY call-to-action response templates
        const keyword = foundKeyword;
        contextualTemplates.push(
            // Direct keyword responses (most common)
            keyword.toUpperCase(),
            keyword.toUpperCase(),
            keyword.toUpperCase(),
            keyword.toUpperCase(),
            keyword.toUpperCase(),
            
            // Variations with please
            `${keyword} please!`,
            `${keyword} please!`,
            `${keyword} please 🙏`,
            `${keyword} please 💚`,
            
            // Enthusiastic versions
            `${keyword}! 🙌`,
            `${keyword}!! 💚`,
            `${keyword} 😍`,
            `${keyword} ❤️`,
            
            // Polite requests
            `Can you send me the ${keyword.toLowerCase()}?`,
            `${keyword} please! I need this in my life`,
            `${keyword} - thank you so much! 💚`,
            `${keyword}! This looks amazing`,
            `Would love the ${keyword.toLowerCase()}!`,
            `${keyword} please! Can't wait to try this`,
            
            // Grateful versions
            `${keyword} thank you! 🙏`,
            `${keyword} - you're amazing! ✨`,
            `${keyword} please! So grateful 💚`,
            
            // Urgent/excited versions
            `${keyword}!! I need this now!`,
            `${keyword} ASAP please! 🙏`,
            `${keyword}! My family needs this`,
            
            // Simple with emojis
            `${keyword} 🙏💚`,
            `${keyword} ✨`,
            `${keyword} 🌟`,
            `${keyword} 💫`
        );
        
        // Mark this as having a call-to-action for weighted selection
        contextualTemplates._hasCallToAction = true;
    }
    
    // Recipe-specific responses
    if (lowerCaption.includes('recipe') || lowerCaption.includes('ingredients')) {
        contextualTemplates.push(
            'This recipe looks amazing! 😍',
            'Can\'t wait to try this!',
            'Making this tomorrow morning! 🥤',
            'My kids are going to love this!',
            'Perfect timing, I just bought all these ingredients!',
            'This is going on my meal prep list',
            'Finally a recipe my family will actually eat! 😂',
            'Saving this for later! 📌',
            'This looks so healing and delicious',
            'Thank you for making healthy eating so easy! 🙏'
        );
    }
    
    // Supplement/protocol mentions
    if (lowerCaption.includes('supplement') || lowerCaption.includes('protocol') || lowerCaption.includes('dosage')) {
        contextualTemplates.push(
            'What dosage do you recommend?',
            'Is this safe during pregnancy?',
            'Can I take this with my other supplements?',
            'Where do you get the best quality version?',
            'How long before I see results?',
            'This supplement changed my life! 💚',
            'I\'ve been taking this for {months} months and feel amazing',
            'My doctor was amazed by my improvement on this protocol'
        );
    }
    
    // Healing stories/testimonials
    if (lowerCaption.includes('heal') || lowerCaption.includes('recover') || lowerCaption.includes('better')) {
        contextualTemplates.push(
            'This gives me so much hope! 💚',
            'I needed to hear this today 🙏',
            'Your story is so inspiring!',
            'This is exactly what I\'m going through',
            'Thank you for sharing your journey',
            'How long did it take to see improvement?',
            'I\'m on week {weeks} of MM protocols and already feeling better!',
            'My {condition} is finally improving thanks to MM! 💚'
        );
    }
    
    // Spiritual/emotional content
    if (lowerCaption.includes('heal') && (lowerCaption.includes('soul') || lowerCaption.includes('spirit') || lowerCaption.includes('angel'))) {
        contextualTemplates.push(
            'This brought me to tears 😢💚',
            'Exactly what my soul needed to hear',
            'So much healing truth in this message',
            'Thank you for this spiritual guidance 🙏',
            'The angels led me to this post today',
            'This resonates so deeply with my journey',
            'Sending love and healing light to everyone reading this ✨'
        );
    }
    
    // Food-specific content
    if (lowerCaption.includes('celery juice')) {
        contextualTemplates.push(
            'Celery juice saved my life! 🥬',
            'Day {days} of celery juice and loving it!',
            'Best thing I ever did for my health',
            'When is the best time to drink it?',
            'Can I add anything else to it?',
            'How long before you saw results?',
            'This is my daily medicine now 💚'
        );
    }
    
    if (lowerCaption.includes('wild blueberries')) {
        contextualTemplates.push(
            'Where do you find wild blueberries?',
            'Are frozen ones just as good?',
            'I eat these every day in my smoothie! 💜',
            'My brain fog cleared up after adding these',
            'Best superfood ever! 🫐'
        );
    }
    
    // Default contextual responses based on tone
    if (lowerCaption.includes('struggle') || lowerCaption.includes('difficult') || lowerCaption.includes('hard')) {
        contextualTemplates.push(
            'I feel this so deeply 💔',
            'You\'re not alone in this journey',
            'Thank you for being so vulnerable and honest',
            'This is exactly what I needed to hear today',
            'Sending you so much love and healing energy 💚'
        );
    }
    
    return contextualTemplates;
}

// Extract the keyword from "Comment KEYWORD" instructions
function extractCommentKeyword(caption) {
    const patterns = [
        /comment[\s"']+([A-Z][A-Z\s]*?)[\s"']+(?:and|to|for|we|link)/i,
        /comment[\s"']+([A-Z][A-Z\s]*?)[\s"']+/i,
        /comment[\s"']+([A-Z]+)[\s"']/i,
        /comment\s+"([^"]+)"/i,
        /comment\s+([A-Z]+)\s/i
    ];
    
    for (const pattern of patterns) {
        const match = caption.match(pattern);
        if (match && match[1]) {
            let keyword = match[1].trim();
            
            // Clean up the keyword - remove common trailing words
            keyword = keyword.replace(/\s+(and|to|for|we|will|link|dm|you|get|send|now|the|a|an).*$/i, '');
            
            // Only return if it's a reasonable keyword length (1-3 words)
            const wordCount = keyword.split(/\s+/).length;
            if (wordCount <= 3 && keyword.length > 0) {
                return keyword.trim();
            }
        }
    }
    
    return null;
}

// Base comment templates
const baseCommentTemplates = [
    // Gratitude and thanks
    'Thank you so much for this information! 🙏',
    'Anthony William, you saved my life! ❤️',
    'So grateful for your wisdom 🙏✨',
    'Thank you MM! This is life changing 💚',
    'Bless you for sharing this truth ✨',
    
    // Health improvements
    'I\'ve been following MM protocols for {months} months and feel amazing!',
    'My {condition} is so much better thanks to MM! 💚',
    'Heavy metal detox smoothie is working wonders! 🥤',
    'Liver rescue protocols saved me! 💚',
    
    // Questions and seeking advice
    'How long should I do the {protocol}?',
    'Can I do this if I have {condition}?',
    'Should I continue during pregnancy?',
    'What about {supplement} dosage?',
    
    // Emotional responses
    'This makes me so sad 😢💔',
    'Heartbreaking but necessary truth 💔',
    'So many people need to hear this! 📢',
    'This opened my eyes completely 👁️',
    'Mind blown! 🤯',
    
    // Sharing experiences
    'I\'ve been dealing with {condition} for years...',
    'My doctor said it was impossible but MM was right!',
    'Started {protocol} {timeframe} ago and already seeing results!',
    'My whole family is following MM protocols now 👨‍👩‍👧‍👦',
    'Shared this with my support group 💚',
    
    // Support and encouragement
    'Stay strong everyone! 💪',
    'We\'re all healing together 💚✨',
    'Don\'t give up! MM protocols work! 🙌',
    'Sending healing vibes to all 🌟',
    'You\'re not alone in this journey 🤗',
    
    // Book and product mentions
    'Reading {book} right now! 📖',
    'Just ordered the supplements! 💊',
    'Can\'t wait for the new book! 📚',
    'Medical Medium saved me, literally! 💚',
    'Everyone needs to read {book}! 📖',
    
    // Simple reactions
    '🙏💚', '❤️🙏', '💚✨', '🥬💚', '🙌💚',
    'YES! 🙌', 'Truth! 💯', 'Exactly! 👏', 'So true! ✨', 'Amazing! 🌟'
];

function fillTemplate(template) {
    return template
        .replace(/{condition}/g, conditions[Math.floor(Math.random() * conditions.length)])
        .replace(/{protocol}/g, protocols[Math.floor(Math.random() * protocols.length)])
        .replace(/{book}/g, books[Math.floor(Math.random() * books.length)])
        .replace(/{timeframe}/g, timeframes[Math.floor(Math.random() * timeframes.length)])
        .replace(/{months}/g, Math.floor(Math.random() * 12) + 1)
        .replace(/{weeks}/g, Math.floor(Math.random() * 12) + 1)
        .replace(/{days}/g, Math.floor(Math.random() * 365) + 1)
        .replace(/{supplement}/g, protocols[Math.floor(Math.random() * protocols.length)]);
}

function generateContextualComment(postDate, index, caption) {
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    
    // Get contextual templates based on caption
    const contextualTemplates = analyzeCaption(caption);
    
    let template;
    
    // If this post has a call-to-action, moderately weight those responses
    if (contextualTemplates._hasCallToAction && Math.random() < 0.45) {
        // 45% chance to use call-to-action responses
        const callToActionTemplates = contextualTemplates.filter(t => typeof t === 'string');
        template = callToActionTemplates[Math.floor(Math.random() * callToActionTemplates.length)];
    } else {
        // Use mix of contextual and base templates
        const allTemplates = [...contextualTemplates, ...contextualTemplates, ...baseCommentTemplates];
        template = allTemplates[Math.floor(Math.random() * allTemplates.length)];
    }
    
    const content = fillTemplate(template);
    
    // Generate realistic timestamp after post date
    const postTime = new Date(postDate);
    const minutesAfterPost = Math.floor(Math.random() * 10080); // Up to 7 days after
    const commentTime = new Date(postTime.getTime() + minutesAfterPost * 60000);
    
    return {
        id: `generated_${Date.now()}_${index}`,
        userId: Math.floor(Math.random() * 1000000000).toString(),
        avatar: generateAvatar(username),
        author: username,
        content: content,
        reactionsCount: Math.floor(Math.random() * 50) + 1,
        depth: 0,
        subCommentsCount: 0,
        commentAt: commentTime.toLocaleString('en-US', {
            month: '2-digit',
            day: '2-digit', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
    };
}

async function generateCommentsForAllPosts() {
    try {
        // Read the posts CSV
        const postsData = fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/instadata/medicalmedium top 25 insta Posts.csv', 'utf8');
        const lines = postsData.split('\n');
        
        // Parse CSV with better multi-line handling
        const csvText = postsData.trim();
        const posts = [];
        
        // Split by lines and process
        const rows = csvText.split('\n');
        const headers = rows[0].split(',');
        
        let currentRow = '';
        let inQuotedField = false;
        
        for (let i = 1; i < rows.length; i++) {
            currentRow += rows[i];
            
            // Check if we're inside quoted field by counting quotes
            const quoteCount = (currentRow.match(/"/g) || []).length;
            inQuotedField = quoteCount % 2 === 1;
            
            if (!inQuotedField && currentRow.trim()) {
                // Parse the complete row
                const fields = [];
                let currentField = '';
                let insideQuotes = false;
                
                for (let j = 0; j < currentRow.length; j++) {
                    const char = currentRow[j];
                    
                    if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                        fields.push(currentField.trim().replace(/^"|"$/g, ''));
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
                // Add the last field
                fields.push(currentField.trim().replace(/^"|"$/g, ''));
                
                if (fields.length >= 6) {
                    const post = {
                        profile: fields[0],
                        post: fields[1], 
                        createDate: fields[2],
                        likes: parseInt(fields[3]) || 0,
                        comments: parseInt(fields[4]) || 0,
                        caption: fields[5]
                    };
                    posts.push(post);
                    console.log(`Parsed post ${posts.length}: ${post.createDate} - ${post.caption.substring(0, 50)}...`);
                }
                
                currentRow = '';
            } else if (inQuotedField) {
                currentRow += '\n';
            }
        }
        
        console.log(`Found ${posts.length} posts to generate contextual comments for`);
        
        // Start with fresh comments structure (replace existing)
        let existingComments = {};
        console.log('Starting fresh with new contextual comment structure');
        
        // Generate comments for each post
        posts.forEach((post, postIndex) => {
            const postId = `post_${postIndex + 1}`;
            const commentsToGenerate = Math.floor(Math.random() * 200) + 100; // 100-300 comments per post
            
            console.log(`Generating ${commentsToGenerate} contextual comments for post ${postIndex + 1}`);
            console.log(`Caption analysis: ${post.caption.substring(0, 100)}...`);
            
            const comments = [];
            for (let i = 0; i < commentsToGenerate; i++) {
                comments.push(generateContextualComment(post.createDate, i, post.caption));
            }
            
            existingComments[postId] = comments;
        });
        
        // Save the generated comments
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-comments.json', JSON.stringify(existingComments, null, 2));
        console.log('✅ Generated contextual comments saved to data/instagram-comments.json');
        
        // Read existing posts and media mapping to preserve correct media file references
        let existingPosts = [];
        let mediaMapping = {};
        
        try {
            const existingPostsData = fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', 'utf8');
            existingPosts = JSON.parse(existingPostsData);
            
            const mediaMappingData = fs.readFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-media-mapping.json', 'utf8');
            mediaMapping = JSON.parse(mediaMappingData);
        } catch (error) {
            console.log('Could not read existing posts or media mapping, creating new structure');
        }
        
        // Update posts with captions while preserving existing media file references
        const postsWithCaptions = posts.map((post, index) => {
            const postId = `post_${index + 1}`;
            const existingPost = existingPosts.find(p => p.video_id === postId);
            
            // Use existing media files if available, otherwise try to find in mapping
            let mediaFiles = [{ filename: `post_${index + 1}.jpg`, type: 'image' }]; // fallback
            
            if (existingPost && existingPost.media_files) {
                mediaFiles = existingPost.media_files;
            } else if (mediaMapping[postId]) {
                mediaFiles = mediaMapping[postId].map(media => ({
                    filename: media.filename,
                    type: media.type
                }));
            }
            
            return {
                video_id: postId,
                title: post.caption.substring(0, 100) + '...',
                description: post.caption,
                caption: post.caption,
                published_at: post.createDate,
                like_count: post.likes,
                comment_count: post.comments,
                view_count: post.likes * 3, // Estimate views
                media_files: mediaFiles
            };
        });
        
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(postsWithCaptions, null, 2));
        console.log('✅ Updated posts data with captions while preserving media file references');
        
    } catch (error) {
        console.error('❌ Error generating contextual comments:', error);
    }
}

// Run the generator
generateCommentsForAllPosts();