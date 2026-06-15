// --- VIDEO DATABASE FOR EACH LEVEL ---
const archiveDatabase = {
    
    
    'lv1': {
        id: "ioxNYPrn228", 
        desc: "LEVEL 1 - N.B.L. LAB: The Neutral Buoyancy Laboratory (NBL) in Houston holds 6.2 million gallons of water."
    },
    'lv2': {
        id: "KDp1tiUsZw8", 
        desc: "LEVEL 2 - VACUUM CHAMBER: In 1971, Apollo 15 Commander David Scott dropped a hammer and feather on the Moon."
    },
    'lv3': {
        id: "CSZFAlRaZKA", 
        desc: "LEVEL 3 - DROP TOWER: The Zero Gravity Research Facility at NASA's Glenn Research Center drops experiments down a 140-meter shaft."
    },
    
    'lv4': {
        id: "xJyBIUNlY2M", 
        desc: "LEVEL 4 - CENTRIFUGE: The 20-G Centrifuge tests how astronauts handle extreme gravitational forces to prevent G-LOC."
    },
    'lv5': {
        id: "jy5UDtRmbEA", 
        desc: "LEVEL 5 - ZERO GRAVITY: NASA's Weightless Wonder, affectionately known as the 'Vomit Comet', performs parabolic maneuvers."
    }
};

function loadVideo(key, btnElement) {
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    const data = archiveDatabase[key];
    document.getElementById('video-description').innerText = data.desc;
    document.getElementById('yt-player').src = "https://www.youtube.com/embed/" + data.id + "?autoplay=1";
}

// --- AUDIO HANDLING & TOGGLE BUTTON ---
window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    const musicToggleBtn = document.getElementById('music-toggle');
    
    if (sessionStorage.getItem('currentTrack') !== 'luna') {
        sessionStorage.setItem('currentTrack', 'luna');
        sessionStorage.setItem('musicTime', '0'); 
    }
    bgMusic.currentTime = parseFloat(sessionStorage.getItem('musicTime') || 0);

    let isMusicMuted = sessionStorage.getItem('musicMuted') === 'true';

    // 1. RIMESSE LE TUE IMMAGINI ORIGINALI
    function updateMusicIcon() {
        if (musicToggleBtn) {
            if (isMusicMuted || bgMusic.paused) {
                musicToggleBtn.innerHTML = '<img src="../imgs/musicoff.png" alt="Off" style="width:24px; image-rendering:pixelated;">'; 
            } else {
                musicToggleBtn.innerHTML = '<img src="../imgs/music.png" alt="On" style="width:24px; image-rendering:pixelated;">';
            }
        }
    }

    // 2. GESTIONE CLICK SICURA
    if (musicToggleBtn) {
        musicToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evita conflitti con altri click
            
            if (bgMusic.paused) {
                // Forza l'avvio della musica
                bgMusic.play().then(() => {
                    isMusicMuted = false;
                    sessionStorage.setItem('musicPlaying', 'true');
                    sessionStorage.setItem('musicMuted', 'false');
                    updateMusicIcon();
                }).catch(err => console.log("Errore riproduzione:", err));
            } else {
                // Metti in pausa
                bgMusic.pause();
                isMusicMuted = true;
                sessionStorage.setItem('musicPlaying', 'false');
                sessionStorage.setItem('musicMuted', 'true');
                updateMusicIcon();
            }
        });
    }

    // 3. TENTATIVO DI AUTOPLAY ALL'AVVIO
    if (!isMusicMuted) {
        let playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                console.log("Browser blocca l'audio. Clicca ovunque o sul tasto musica per sbloccarlo.");
                const forceAudioPlay = () => {
                    if(!isMusicMuted) {
                        bgMusic.play();
                        sessionStorage.setItem('musicPlaying', 'true');
                        updateMusicIcon();
                    }
                    document.removeEventListener('click', forceAudioPlay);
                    document.removeEventListener('keydown', forceAudioPlay);
                };
                document.addEventListener('click', forceAudioPlay);
                document.addEventListener('keydown', forceAudioPlay);
            });
        }
    }
    
    updateMusicIcon();
    
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('musicTime', bgMusic.currentTime);
    });
});


// --- NAME INSERTION & TIMER DISPLAY ---
const playerName = localStorage.getItem('astronautName') || "Recruit";
document.getElementById('player-name-display').innerText = playerName.toUpperCase();

function updateTimerDisplay() {
    let startTime = localStorage.getItem('gameStartTime');
    let btn = document.getElementById('return-btn');
    
    if (startTime) {
        let elapsedSeconds = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        let minutes = Math.floor(elapsedSeconds / 60);
        let seconds = elapsedSeconds % 60;
        
        // Aggiunge lo zero davanti se i secondi sono < 10
        let formattedSeconds = seconds < 10 ? '0' + seconds : seconds;
        
        btn.innerText = `COMPLETED IN: ${minutes}:${formattedSeconds} - MAIN MENU`;
    } else {
        btn.innerText = "COMPLETED! - MAIN MENU";
    }
}

// --- SEQUENCE TIMING ---
let cinematicTriggered = false;

window.onload = () => {
    updateTimerDisplay(); // Calcola il tempo appena si apre la pagina

    setTimeout(() => {
        document.getElementById('fade-overlay').style.opacity = '0';
    }, 500);

    // Wait 25 seconds for the credits to roll up
    setTimeout(() => {
        if(!cinematicTriggered) triggerCinematic();
    }, 25000); 
};

function triggerCinematic() {
    cinematicTriggered = true;
    document.getElementById('crawl-container').style.display = 'none';
    document.getElementById('skip-btn').style.display = 'none';

    const cinematic = document.getElementById('cinematic-scene');
    cinematic.style.opacity = '1';

    const ship = document.getElementById('the-ship');
    ship.classList.add('fly-animation');

    setTimeout(() => {
        document.getElementById('video-panel').style.display = 'flex';
    }, 6500);
}

function returnToMenu() {
    document.getElementById('fade-overlay').style.opacity = '1';
    sessionStorage.removeItem('currentTrack');
    localStorage.removeItem('gameStartTime'); // Resetta il timer per la prossima partita
    
    setTimeout(() => {
        // Sostituisci questo con il nome del tuo file HTML iniziale reale
        window.location.href = '../index.html'; 
    }, 2000);
}


// --- BACKGROUND STARS SCRIPT ---
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
        this.size = Math.random() * 2 + 1; 
        this.speedY = Math.random() * 0.5 + 0.1; 
        this.opacity = Math.random() * 0.8 + 0.2;
    }
    update() {
        this.y += this.speedY; 
        if (this.y > canvas.height) {
            this.y = -10;
            this.x = Math.random() * canvas.width;
        }
    }
    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.fillRect(this.x, this.y, this.size, this.size); 
    }
}

function initParticles() {
    particlesArray = [];
    let numberOfParticles = (canvas.width * canvas.height) / 4000; 
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