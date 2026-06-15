window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    if (sessionStorage.getItem('currentTrack') !== 'test') {
        sessionStorage.setItem('currentTrack', 'test'); sessionStorage.setItem('musicTime', '0'); 
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

const missions = [
    { id: 1, title: "N.B.L. Lab", status: "active" },
    { id: 2, title: "Vacuum Chamber", status: "active" },
    { id: 3, title: "Drop Tower", status: "active" },
    { id: 4, title: "Centrifuge", status: "active" },
    { id: 5, title: "Zero Gravity", status: "active" },
    { id: 6, title: "Final exam", status: "active" }
];

const quizData = [
    { q: "How high is the NASA Drop Tower?", a: "100 meters", options: ["50 meters", "100 meters", "150 meters"] },
    { q: "What is the nickname of the Zero-G aircraft?", a: "Vomit comet", options: ["Vomit comet", "Sky-dive", "Moon-bus"] },
    { q: "How deep is the N.B.L. pool?", a: "12 meters", options: ["10 meters", "12 meters", "20 meters"] },
    { q: "Which mission dropped hammer/feather on the Moon?", a: "Apollo 15", options: ["Apollo 11", "Apollo 13", "Apollo 15"] },
    { q: "G-LOC stands for G-force induced loss of...?", a: "Consciousness", options: ["Vision", "Consciousness", "Oxygen"] }
];

const config = {
    type: Phaser.AUTO, parent: 'game-container', width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#000', pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: 2000 } } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, npc, portalEnd, platforms, jumpSound;
let isDialogOpen = false, dialogueIndex = 0, currentQuiz = 0, quizActive = false, examPassed = false;
let dialogueText = [ "Excellent work getting here, Recruit.", "Theoretical knowledge is as vital as physical training.", "Are you ready to initiate the terminal assessment?" ];

function preload() {
    this.load.image('sfondo', '../imgs/test_sfondo.png');
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('salto1', '../imgs/astronauta_salto1.png');
    this.load.image('scien1', '../imgs/Scienziato_neutro1.png');
    this.load.image('scien2', '../imgs/Scienziato_neutro2.png');
    this.load.image('porta', '../imgs/porta.png');
    this.load.audio('jump_sound', '../sound/jump.wav');
}

function create() {
    const WORLD_WIDTH = 2000; const WORLD_HEIGHT = 600; const FLOOR_Y = 550;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (this.cache.audio.exists('jump_sound')) jumpSound = this.sound.add('jump_sound');

    let bg = this.add.image(WORLD_WIDTH / 2, FLOOR_Y, 'sfondo').setOrigin(0.5, 1);
    let scale = Math.max(WORLD_WIDTH / bg.width, FLOOR_Y / bg.height); bg.setScale(scale).setDepth(-1);

    platforms = this.physics.add.staticGroup(); platforms.add(this.add.rectangle(1000, FLOOR_Y + 20, 2000, 40, 0x333333).setDepth(1));

    this.anims.create({ key: 'astro_idle', frames: [{key:'astro1'}, {key:'astro2'}], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{key:'walk1'}, {key:'walk2'}], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scien_idle', frames: [{key:'scien1'}, {key:'scien2'}], frameRate: 3, repeat: -1 });

    this.add.sprite(150, FLOOR_Y, 'porta').setScale(5).setOrigin(0.5, 1).setDepth(2).setTint(0x555555);
    portalEnd = this.physics.add.sprite(1850, FLOOR_Y, 'porta').setScale(5).setOrigin(0.5, 1).setDepth(2).setTint(0x555555); 
    portalEnd.body.setAllowGravity(false).setImmovable(true);

    npc = this.physics.add.sprite(700, FLOOR_Y, 'scien1').setScale(6).setOrigin(0.5, 1).setDepth(3);
    npc.body.setAllowGravity(false); npc.body.setImmovable(true); npc.play('scien_idle');

    player = this.physics.add.sprite(250, FLOOR_Y, 'astro1').setScale(5).setOrigin(0.5, 1).setDepth(4);
    player.setCollideWorldBounds(true); this.physics.add.collider(player, platforms);

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).startFollow(player).setZoom(1.5);
    this.keys = this.input.keyboard.addKeys('W,A,D,E,SPACE');

    const stepper = document.getElementById('stepper-container');
    missions.forEach((m) => { stepper.innerHTML += `<div class="step ${m.status}"><div class="step-dot"></div><div class="step-label">${m.title}</div></div>`; });

    setTimeout(() => document.getElementById('fade-overlay').style.opacity = '0', 1000);
}

function update() {
    npc.setFlipX(player.x < npc.x);
    if (quizActive) { player.setVelocityX(0).play('astro_idle', true); return; }

    if (isDialogOpen) {
        player.setVelocityX(0).play('astro_idle', true);
        if (Phaser.Input.Keyboard.JustDown(this.keys.E) && dialogueIndex < dialogueText.length - 1) {
            dialogueIndex++; document.getElementById('dialogue-content').innerText = dialogueText[dialogueIndex];
            if (dialogueIndex === dialogueText.length - 1) document.getElementById('choice-box').style.display = 'flex';
        }
        return;
    }

    const onGround = player.body.touching.down;
    if (this.keys.A.isDown) { player.setVelocityX(-350); player.setFlipX(true); if (onGround) player.play('astro_walk', true); } 
    else if (this.keys.D.isDown) { player.setVelocityX(350); player.setFlipX(false); if (onGround) player.play('astro_walk', true); } 
    else { player.setVelocityX(0); if (onGround) player.play('astro_idle', true); }

    if ((this.keys.W.isDown || this.keys.SPACE.isDown) && onGround) { player.setVelocityY(-850); player.setTexture('salto1'); if (jumpSound) jumpSound.play(); }

    if (Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y) < 120 && dialogueIndex === 0 && !isDialogOpen) {
        isDialogOpen = true; player.setVelocityX(0); document.getElementById('dialogue-box').style.display = 'flex'; document.getElementById('dialogue-content').innerText = dialogueText[0];
    }
    if (examPassed && player.x > 1800) { document.getElementById('fade-overlay').style.opacity = '1'; setTimeout(() => { window.location.href = 'livello7.html'; }, 1000); }
}

window.handleChoice = function(start) { document.getElementById('choice-box').style.display = 'none'; document.getElementById('dialogue-box').style.display = 'none'; isDialogOpen = false; if (start) { startExam(); } else { dialogueIndex = 0; player.x = npc.x - 130; } };
window.startExam = function() { quizActive = true; document.getElementById('quiz-console').style.display = 'flex'; currentQuiz = 0; loadQuestion(); };
window.closeExam = function() { document.getElementById('quiz-console').style.display = 'none'; quizActive = false; dialogueIndex = 0; player.x = npc.x - 130; };

function loadQuestion() {
    const data = quizData[currentQuiz]; document.getElementById('quiz-feedback').innerText = ""; document.getElementById('quiz-question').innerText = `QUESTION ${currentQuiz + 1}: ${data.q}`;
    const optionsDiv = document.getElementById('quiz-options'); optionsDiv.innerHTML = '';
    data.options.forEach(opt => { const btn = document.createElement('button'); btn.className = 'quiz-option'; btn.innerText = opt; btn.onclick = () => checkAnswer(opt, btn); optionsDiv.appendChild(btn); });
}

function checkAnswer(ans, btn) {
    const correct = quizData[currentQuiz].a; const feedback = document.getElementById('quiz-feedback'); document.querySelectorAll('.quiz-option').forEach(b => b.style.pointerEvents = 'none');
    if (ans === correct) {
        btn.style.background = "#fff"; btn.style.color = "#000"; feedback.innerText = "CORRECT";
        setTimeout(() => { currentQuiz++; if (currentQuiz < quizData.length) loadQuestion(); else finishExam(); }, 1500);
    } else {
        btn.style.border = "2px dashed #fff"; feedback.innerText = "WRONG - REBOOTING TEST"; setTimeout(() => { currentQuiz = 0; loadQuestion(); }, 2000);
    }
}

function finishExam() { examPassed = true; document.getElementById('quiz-console').innerHTML = "<h1>EXAM PASSED</h1><p>NASA CLEARANCE GRANTED. THE MOON AWAITS.</p>"; setTimeout(() => { document.getElementById('quiz-console').style.display = 'none'; quizActive = false; portalEnd.setTint(0xffffff); }, 3000); }