window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    if (sessionStorage.getItem('currentTrack') !== 'luna') {
        sessionStorage.setItem('currentTrack', 'luna'); sessionStorage.setItem('musicTime', '0'); 
    }
    bgMusic.currentTime = parseFloat(sessionStorage.getItem('musicTime') || 0);

    let playPromise = bgMusic.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            const forceAudioPlay = () => {
                bgMusic.play(); sessionStorage.setItem('musicPlaying', 'true');
                document.removeEventListener('click', forceAudioPlay); document.removeEventListener('keydown', forceAudioPlay);
            };
            document.addEventListener('click', forceAudioPlay); document.addEventListener('keydown', forceAudioPlay);
        });
    } else { sessionStorage.setItem('musicPlaying', 'true'); }
    
    window.addEventListener('beforeunload', () => { sessionStorage.setItem('musicTime', bgMusic.currentTime); });
});

window.onload = () => {
    const overlay = document.getElementById('fade-overlay');
    setTimeout(() => { overlay.style.opacity = '0'; }, 500);
    setTimeout(() => { overlay.style.opacity = '1'; }, 4500);
    setTimeout(() => { window.location.href = 'luna.html'; }, 6000);
};

// --- LOGICA STELLE DELLO SPAZIO ---
const canvas = document.getElementById('particle-canvas'); const ctx = canvas.getContext('2d'); let particlesArray = [];
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

window.addEventListener('resize', function() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; initParticles(); });

class Particle {
    constructor() { this.x = Math.random() * canvas.width; this.y = Math.random() * canvas.height; this.size = Math.random() * 2 + 1; this.speedY = Math.random() * 20 + 10; this.opacity = Math.random() * 0.8 + 0.2; }
    update() { this.y += this.speedY; if (this.y > canvas.height) { this.y = -10; this.x = Math.random() * canvas.width; this.speedY = Math.random() * 20 + 10; } }
    draw() { ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`; ctx.fillRect(this.x, this.y, this.size, this.size * 2); }
}

function initParticles() { particlesArray = []; let numberOfParticles = (canvas.width * canvas.height) / 4000; for (let i = 0; i < numberOfParticles; i++) { particlesArray.push(new Particle()); } }
function animateParticles() { ctx.clearRect(0, 0, canvas.width, canvas.height); for (let i = 0; i < particlesArray.length; i++) { particlesArray[i].update(); particlesArray[i].draw(); } requestAnimationFrame(animateParticles); }
initParticles(); animateParticles();

// --- LOGICA FIAMMA MOTORI ---
const flameCanvas = document.getElementById('flame-canvas'); const fctx = flameCanvas.getContext('2d'); let flamesArray = [];
flameCanvas.width = 120; flameCanvas.height = 150;

class FlameParticle {
    constructor() { this.x = flameCanvas.width / 2 + (Math.random() * 40 - 20); this.y = 10; this.size = Math.random() * 6 + 3; this.speedY = Math.random() * 6 + 3; this.speedX = (Math.random() - 0.5) * 2; this.life = 1.0; this.decay = Math.random() * 0.05 + 0.02; }
    update() { this.y += this.speedY; this.x += this.speedX; this.life -= this.decay; }
    draw() { const red = 255; const green = Math.floor(this.life * 220); const blue = Math.floor(this.life * 100); fctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${this.life})`; fctx.fillRect(this.x, this.y, this.size, this.size); }
}

function animateFlames() {
    fctx.clearRect(0, 0, flameCanvas.width, flameCanvas.height); for (let i = 0; i < 4; i++) { flamesArray.push(new FlameParticle()); }
    for (let i = 0; i < flamesArray.length; i++) { flamesArray[i].update(); flamesArray[i].draw(); if (flamesArray[i].life <= 0) { flamesArray.splice(i, 1); i--; } }
    requestAnimationFrame(animateFlames);
}
animateFlames();