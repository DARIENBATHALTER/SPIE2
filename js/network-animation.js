class NetworkAnimation {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: 0, y: 0 };
        this.animationId = null;
        
        this.config = {
            particleCount: 120,
            maxDistance: 180,
            mouseRadius: 200,
            particleSpeed: 0.3,
            lineOpacity: 0.2,
            particleOpacity: 0.8,
            particleSize: 1.5,
            attractionStrength: 1.5
        };
        
        this.init();
        this.setupEventListeners();
        this.animate();
    }
    
    init() {
        this.resizeCanvas();
        this.createParticles();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    createParticles() {
        this.particles = [];
        const colors = [
            { r: 255, g: 255, b: 255 }, // White
            { r: 100, g: 150, b: 255 }, // Light blue
            { r: 150, g: 100, b: 255 }, // Light purple
            { r: 255, g: 150, b: 100 }, // Light orange
            { r: 100, g: 255, b: 150 }  // Light green
        ];
        
        for (let i = 0; i < this.config.particleCount; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * this.config.particleSpeed,
                vy: (Math.random() - 0.5) * this.config.particleSpeed,
                originalVx: (Math.random() - 0.5) * this.config.particleSpeed,
                originalVy: (Math.random() - 0.5) * this.config.particleSpeed,
                color: color,
                pulseOffset: Math.random() * Math.PI * 2
            });
        }
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createParticles();
        });
    }
    
    updateParticles() {
        this.particles.forEach(particle => {
            // Calculate distance to mouse
            const dx = this.mouse.x - particle.x;
            const dy = this.mouse.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Mouse interaction - attract particles to cursor
            if (distance < this.config.mouseRadius && distance > 0) {
                const force = (this.config.mouseRadius - distance) / this.config.mouseRadius * this.config.attractionStrength;
                const angle = Math.atan2(dy, dx);
                // Attract towards mouse (positive force)
                particle.vx = particle.originalVx + Math.cos(angle) * force * 0.8;
                particle.vy = particle.originalVy + Math.sin(angle) * force * 0.8;
            } else {
                // Return to original velocity
                particle.vx += (particle.originalVx - particle.vx) * 0.08;
                particle.vy += (particle.originalVy - particle.vy) * 0.08;
            }
            
            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Bounce off edges
            if (particle.x < 0 || particle.x > this.canvas.width) {
                particle.vx *= -1;
                particle.originalVx *= -1;
            }
            if (particle.y < 0 || particle.y > this.canvas.height) {
                particle.vy *= -1;
                particle.originalVy *= -1;
            }
            
            // Keep particles in bounds
            particle.x = Math.max(0, Math.min(this.canvas.width, particle.x));
            particle.y = Math.max(0, Math.min(this.canvas.height, particle.y));
        });
    }
    
    drawConnections() {
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.config.maxDistance) {
                    const opacity = (1 - distance / this.config.maxDistance) * this.config.lineOpacity;
                    
                    // Blend colors of connected particles
                    const p1 = this.particles[i];
                    const p2 = this.particles[j];
                    const r = Math.floor((p1.color.r + p2.color.r) / 2);
                    const g = Math.floor((p1.color.g + p2.color.g) / 2);
                    const b = Math.floor((p1.color.b + p2.color.b) / 2);
                    
                    this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                    this.ctx.lineWidth = 0.8;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }
    }
    
    drawParticles() {
        const time = Date.now() * 0.002;
        this.particles.forEach(particle => {
            // Subtle pulsing effect
            const pulse = Math.sin(time + particle.pulseOffset) * 0.2 + 0.8;
            const opacity = this.config.particleOpacity * pulse;
            const size = this.config.particleSize * (0.8 + pulse * 0.4);
            
            // Use particle's color with pulsing opacity
            this.ctx.fillStyle = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, ${opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add subtle glow effect
            this.ctx.shadowColor = `rgba(${particle.color.r}, ${particle.color.g}, ${particle.color.b}, 0.5)`;
            this.ctx.shadowBlur = 8;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        });
    }
    
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.updateParticles();
        this.drawConnections();
        this.drawParticles();
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Initialize network animations when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for modals to be ready
    setTimeout(() => {
        window.passwordNetwork = new NetworkAnimation('passwordNetworkCanvas');
        window.welcomeNetwork = new NetworkAnimation('welcomeNetworkCanvas');
    }, 100);
});