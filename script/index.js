// --- LOGICA EFFETTO PARTICELLE ---
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let particlesArray = [];

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initParticles();
});

class Particle {
    constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1; 
        this.speedY = Math.random() * 1 + 0.1; 
        this.opacity = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.y -= this.speedY; 
        if (this.y < 0 - this.size) {
            this.y = canvas.height + this.size;
            this.x = Math.random() * canvas.width;
            this.opacity = Math.random() * 0.5 + 0.2;
        }
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size); 
    }
}

function initParticles() {
    particlesArray = [];
    let numberOfParticles = (canvas.width * canvas.height) / 5000; 
    for (let i = 0; i < numberOfParticles; i++) {
        particlesArray.push(new Particle());
    }
}

function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
    }
    requestAnimationFrame(animateParticles);
}

initParticles();
animateParticles();

// --- GESTIONE AUDIO GLOBALE E PULSANTE ---
const bgMusic = document.getElementById('bg-music');
const musicToggleBtn = document.getElementById('music-toggle');

// Controlliamo se l'utente aveva mutato la musica in sessioni precedenti
let isMusicMuted = sessionStorage.getItem('musicMuted') === 'true';

// Aggiorna l'icona del pulsante (Percorsi immagini aggiornati)
function updateMusicIcon() {
    if (isMusicMuted || bgMusic.paused) {
        musicToggleBtn.innerHTML = '<img src="imgs/musicoff.png" alt="Musica">';
    } else {
        musicToggleBtn.innerHTML = '<img src="imgs/music.png" alt="Musica">';
    }
}

// Funzione per far partire la musica al primissimo click sulla pagina
const startAudioOnInteraction = () => {
    if (!isMusicMuted && bgMusic.paused) {
        bgMusic.play().then(() => {
            sessionStorage.setItem('musicPlaying', 'true');
            updateMusicIcon();
        }).catch(e => console.log("In attesa del browser...", e));
    }
    // Rimuoviamo il listener dopo il primo click
    document.removeEventListener('click', startAudioOnInteraction);
    document.removeEventListener('keydown', startAudioOnInteraction);
};

// Gestione del click sul pulsante Musica
musicToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // Evita che il click sul bottone attivi "startAudioOnInteraction"
    
    if (bgMusic.paused) {
        bgMusic.play();
        isMusicMuted = false;
        sessionStorage.setItem('musicPlaying', 'true');
        sessionStorage.setItem('musicMuted', 'false');
    } else {
        bgMusic.pause();
        isMusicMuted = true;
        sessionStorage.setItem('musicPlaying', 'false');
        sessionStorage.setItem('musicMuted', 'true');
    }
    updateMusicIcon();
});

// Al caricamento della pagina
window.addEventListener('DOMContentLoaded', () => {
    updateMusicIcon();

    // Se la musica stava suonando prima del refresh/back
    if (sessionStorage.getItem('musicPlaying') === 'true' && !isMusicMuted) {
        bgMusic.currentTime = parseFloat(sessionStorage.getItem('musicTime') || 0);
        bgMusic.play().then(() => {
            updateMusicIcon();
        }).catch(e => {
            // Se bloccato, attendiamo interazione
            document.addEventListener('click', startAudioOnInteraction);
            document.addEventListener('keydown', startAudioOnInteraction);
        });
    } else {
        // Prima volta sulla pagina: aspetta che l'utente clicchi qualcosa (es. il campo nome)
        document.addEventListener('click', startAudioOnInteraction);
        document.addEventListener('keydown', startAudioOnInteraction);
    }
    
    // Salviamo il punto esatto in cui siamo arrivati prima di cambiare pagina
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('musicTime', bgMusic.currentTime);
    });
});

// --- LOGICA DI GIOCO E TRANSIZIONE ---
const startBtn = document.getElementById('start-btn');
const nameInput = document.getElementById('name-input');
const fadeOverlay = document.getElementById('fade-overlay');

function startGame() {
    let playerName = nameInput.value.trim();
    if (playerName === "") {
        playerName = "Recluta";
    }

    localStorage.setItem('astronautName', playerName);

    // Assicuriamoci che i flag siano corretti prima di cambiare pagina
    if (!bgMusic.paused) {
        sessionStorage.setItem('musicPlaying', 'true');
    }

    fadeOverlay.style.opacity = 1;

    setTimeout(() => {
        sessionStorage.setItem('musicTime', bgMusic.currentTime);
        // Percorso aggiornato per puntare alla cartella assets
        window.location.href = 'assets/livello1.html'; 
    }, 1000);
}

startBtn.addEventListener('click', startGame);

nameInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        startGame();
    }
});