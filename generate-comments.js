/**
 * Generate realistic Instagram comments for Medical Medium posts
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

// Comment templates based on Medical Medium themes
const commentTemplates = [
    // Gratitude and thanks
    'Thank you so much for this information! 🙏',
    'Anthony William, you saved my life! ❤️',
    'So grateful for your wisdom 🙏✨',
    'Thank you MM! This is life changing 💚',
    'Bless you for sharing this truth ✨',
    
    // Health improvements
    'Celery juice changed my life! 🥬',
    'I\'ve been following MM protocols for {months} months and feel amazing!',
    'My {condition} is so much better thanks to MM! 💚',
    'Heavy metal detox smoothie is working wonders! 🥤',
    'Liver rescue protocols saved me! 💚',
    
    // Questions and seeking advice
    'How long should I do the {protocol}?',
    'Can I do this if I have {condition}?',
    'When is the best time to drink celery juice? 🥬',
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

function fillTemplate(template) {
    return template
        .replace(/{condition}/g, conditions[Math.floor(Math.random() * conditions.length)])
        .replace(/{protocol}/g, protocols[Math.floor(Math.random() * protocols.length)])
        .replace(/{book}/g, books[Math.floor(Math.random() * books.length)])
        .replace(/{timeframe}/g, timeframes[Math.floor(Math.random() * timeframes.length)])
        .replace(/{months}/g, Math.floor(Math.random() * 12) + 1);
}

function generateComment(postDate, index) {
    const username = usernames[Math.floor(Math.random() * usernames.length)];
    const template = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
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
        
        console.log(`Found ${posts.length} posts to generate comments for`);
        
        // Start with fresh comments structure (replace existing)
        let existingComments = {};
        console.log('Starting fresh with new comment structure');
        
        // Generate comments for each post
        posts.forEach((post, postIndex) => {
            const postId = `post_${postIndex + 1}`;
            const commentsToGenerate = Math.floor(Math.random() * 200) + 100; // 100-300 comments per post
            
            console.log(`Generating ${commentsToGenerate} comments for post ${postIndex + 1}`);
            
            const comments = [];
            for (let i = 0; i < commentsToGenerate; i++) {
                comments.push(generateComment(post.createDate, i));
            }
            
            existingComments[postId] = comments;
        });
        
        // Save the generated comments
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-comments.json', JSON.stringify(existingComments, null, 2));
        console.log('✅ Generated comments saved to data/instagram-comments.json');
        
        // Also update the posts data with captions
        const postsWithCaptions = posts.map((post, index) => ({
            video_id: `post_${index + 1}`,
            title: post.caption.substring(0, 100) + '...',
            description: post.caption,
            caption: post.caption,
            published_at: post.createDate,
            like_count: post.likes,
            comment_count: post.comments,
            view_count: post.likes * 3, // Estimate views
            media_files: [{
                filename: `post_${index + 1}.jpg`,
                type: 'image'
            }]
        }));
        
        fs.writeFileSync('/Users/darien/Desktop/MMInstaArchive/MMArchiveExplorer/data/instagram-posts.json', JSON.stringify(postsWithCaptions, null, 2));
        console.log('✅ Updated posts data with captions');
        
    } catch (error) {
        console.error('❌ Error generating comments:', error);
    }
}

// Run the generator
generateCommentsForAllPosts();