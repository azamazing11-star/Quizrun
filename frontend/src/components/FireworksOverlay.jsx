import React, { useEffect, useRef } from 'react';

/**
 * High-performance Canvas-based Fireworks & Confetti Celebration Overlay
 */
export default function FireworksOverlay({ active = true, duration = 6000, onComplete }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!active) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId;
        let isRunning = true;
        const startTime = Date.now();

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const colors = [
            '#f59e0b', '#ef4444', '#10b981', '#3b82f6', 
            '#ec4899', '#8b5cf6', '#fbbf24', '#06b6d4', '#ffffff'
        ];

        let rockets = [];
        let particles = [];

        class Rocket {
            constructor() {
                this.x = Math.random() * (canvas.width * 0.8) + (canvas.width * 0.1);
                this.y = canvas.height;
                this.targetY = Math.random() * (canvas.height * 0.4) + (canvas.height * 0.15);
                this.vy = -(Math.random() * 4 + 11);
                this.color = colors[Math.floor(Math.random() * colors.length)];
                this.size = 3;
                this.exploded = false;
            }
            update() {
                this.y += this.vy;
                this.vy += 0.12; // gravity slowing down rocket
                if (this.vy >= -1.5 || this.y <= this.targetY) {
                    this.explode();
                }
            }
            explode() {
                this.exploded = true;
                const count = Math.floor(Math.random() * 30) + 50;
                const baseHue = this.color;
                for (let i = 0; i < count; i++) {
                    particles.push(new Particle(this.x, this.y, baseHue));
                }
            }
            draw() {
                ctx.save();
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 6 + 1.5;
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.color = Math.random() > 0.3 ? color : colors[Math.floor(Math.random() * colors.length)];
                this.alpha = 1;
                this.decay = Math.random() * 0.015 + 0.012;
                this.size = Math.random() * 3 + 2;
                this.gravity = 0.08;
                this.drag = 0.96;
            }
            update() {
                this.vx *= this.drag;
                this.vy *= this.drag;
                this.vy += this.gravity;
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= this.decay;
            }
            draw() {
                if (this.alpha <= 0) return;
                ctx.save();
                ctx.globalAlpha = Math.max(0, this.alpha);
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        let nextLaunch = 0;

        const loop = () => {
            if (!isRunning) return;
            const elapsed = Date.now() - startTime;
            if (duration && elapsed > duration && rockets.length === 0 && particles.length === 0) {
                isRunning = false;
                if (onComplete) onComplete();
                return;
            }

            // Soft clear for motion trails
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Periodically launch new rockets while within duration
            if (Date.now() > nextLaunch && (!duration || elapsed < duration - 1500)) {
                rockets.push(new Rocket());
                if (Math.random() > 0.4) {
                    rockets.push(new Rocket());
                }
                nextLaunch = Date.now() + Math.random() * 400 + 300;
            }

            // Update rockets
            for (let i = rockets.length - 1; i >= 0; i--) {
                const r = rockets[i];
                r.update();
                r.draw();
                if (r.exploded) {
                    rockets.splice(i, 1);
                }
            }

            // Update particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update();
                p.draw();
                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        // Launch initial burst
        rockets.push(new Rocket());
        rockets.push(new Rocket());
        loop();

        return () => {
            isRunning = false;
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [active, duration, onComplete]);

    if (!active) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 9999
            }}
        />
    );
}
