window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    if (sessionStorage.getItem('currentTrack') !== 'lv5') {
        sessionStorage.setItem('currentTrack', 'lv5'); sessionStorage.setItem('musicTime', '0'); 
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

const playerName = localStorage.getItem('astronautName') || "Recruit";
const missions = [
    { id: 1, title: "N.B.L. Lab", status: "completed" },
    { id: 2, title: "Vacuum Chamber", status: "completed" },
    { id: 3, title: "Drop Tower", status: "completed" },
    { id: 4, title: "Centrifuge", status: "active" },
    { id: 5, title: "Zero Gravity", status: "locked" }
];

let experimentState = 'READY'; let isPlayerInCentrifuge = false; let resistance = 100; let spinTimer = 0; let spinPhase = 0; const SURVIVAL_TIME = 10000; 
let hasTalkedToScientist = false; let isDialogOpen = false; let isTransitioning = false; 
let currentDialogueArray = []; let dialogueIndex = 0; let onDialogueComplete = null; 
let uiDrawn = false; 

// 2. Poi inizia la funzione
function updateUI() {
    if (uiDrawn) return; // Ora il gioco sa cos'è uiDrawn e non darà più errore

    const stepper = document.getElementById('stepper-container');
    const progressFill = document.getElementById('step-line-fill');
    if (!stepper || !progressFill) return;
    
    stepper.innerHTML = '';
    let activeIndex = missions.findIndex(m => m.status === 'active');
    if (activeIndex === -1) activeIndex = missions.length - 1;
    let segments = missions.length - 1;
    let fillPercentage = (activeIndex / segments) * 100;
    progressFill.style.height = `${fillPercentage}%`;
    
    missions.forEach((m) => {
        const stepDiv = document.createElement('div'); 
        stepDiv.className = `step ${m.status}`;
        if (m.id === 5) stepDiv.classList.add('golden');
        
        const dot = document.createElement('div'); 
        dot.className = 'step-dot';
        
        const label = document.createElement('div'); 
        label.className = 'step-label'; 
        label.innerHTML = m.title;
        
        stepDiv.appendChild(dot); 
        stepDiv.appendChild(label); 
        stepper.appendChild(stepDiv);
    });

    uiDrawn = true;
}

const WORLD_WIDTH = 2200; const WORLD_HEIGHT = 600; const FLOOR_TOP = 540; 
const SETTINGS = { playerScale: 5, npcScale: 6, npcX: 550, playerStartX: 100, gravity: 2000, walkSpeed: 380, jumpForce: -850, minZoom: 1.2, maxZoom: 2.0, initialZoom: 1.5 };

const config = {
    type: Phaser.AUTO, parent: 'game-container', width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#050505', pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: SETTINGS.gravity } } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, npc, keys, interactKey, portalStart, portalEnd, jumpSound;
let centrifuga; 

function preload() {
    this.load.image('sfondo', '../imgs/centrifuga_sfondo.png');
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('scienziato1', '../imgs/Scienziato_neutro1.png');
    this.load.image('scienziato2', '../imgs/Scienziato_neutro2.png');
    this.load.image('porta', '../imgs/porta.png');
    this.load.image('centrifuga', '../imgs/centrifuga.png');
    this.load.audio('jump_sound', '../sound/jump.wav'); 
}

function create() {
    updateUI();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    jumpSound = this.sound.add('jump_sound');

    let bg = this.add.image(WORLD_WIDTH / 2, 0, 'sfondo').setOrigin(0.5, 0).setDisplaySize(WORLD_WIDTH, FLOOR_TOP).setDepth(-1); 
    let platforms = this.physics.add.staticGroup(); platforms.add(this.add.rectangle(WORLD_WIDTH / 2, FLOOR_TOP + 20, WORLD_WIDTH, 40, 0x333333)); 

    centrifuga = this.physics.add.sprite(1200, FLOOR_TOP, 'centrifuga').setOrigin(0.5, 1).setScale(15);
    centrifuga.body.setAllowGravity(false); centrifuga.body.setImmovable(true);

    portalStart = this.physics.add.sprite(100, FLOOR_TOP, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalEnd = this.physics.add.sprite(2000, FLOOR_TOP, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalStart.body.setAllowGravity(false); portalEnd.body.setAllowGravity(false);

    npc = this.physics.add.sprite(SETTINGS.npcX, FLOOR_TOP, 'scienziato1').setScale(SETTINGS.npcScale).setOrigin(0.5, 1).setDepth(3);
    player = this.physics.add.sprite(SETTINGS.playerStartX, FLOOR_TOP, 'astro1').setScale(SETTINGS.playerScale).setOrigin(0.5, 1).setDepth(4);

    this.physics.add.collider(player, platforms); this.physics.add.collider(npc, platforms);
    player.setCollideWorldBounds(true); npc.setImmovable(true); npc.body.setAllowGravity(false);

    this.anims.create({ key: 'astro_idle', frames: [{ key: 'astro1' }, { key: 'astro2' }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{ key: 'walk1' }, { key: 'walk2' }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scien_idle', frames: [{ key: 'scienziato1' }, { key: 'scienziato2' }], frameRate: 3, repeat: -1 });
    npc.play('scien_idle');

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).startFollow(player, true, 0.1, 0.1).setZoom(1.5);
    keys = this.input.keyboard.addKeys('W,A,D,SPACE'); interactKey = this.input.keyboard.addKey('E');
    this.interactPrompt = this.add.text(0, 0, "", { fontSize: '20px', fill: '#ffffff', fontFamily: 'NbpInforma', align: 'center' }).setOrigin(0.5).setVisible(false).setDepth(10);

    setTimeout(() => { document.getElementById('fade-overlay').style.opacity = '0'; }, 1000);
}

function triggerMainDialogue() {
    startDialogue([
        `We are at the final physical hurdle, ${playerName.toUpperCase()}! The dreaded Centrifuge!`,
        `This machine will spin you at extreme speeds to simulate the G-force of a rocket launch.`,
        `You will endure up to 9G of force on your body. Blood will tend to flow away from your brain towards your legs.`,
        `If you don't react, you'll pass out (G-LOC). The only way to resist is to contract your body muscles!`,
        `Approach the centrifuge and press [E] to board.`,
        `Once it starts, you must press [E] REPEATEDLY and FAST to stay conscious. Hold on for 10 seconds!`
    ], () => { hasTalkedToScientist = true; });
}

function startCentrifuge() { experimentState = 'SPINNING'; isPlayerInCentrifuge = true; resistance = 100; spinTimer = 0; spinPhase = 0; player.setVisible(false); player.body.setAllowGravity(false); document.getElementById('gforce-ui').style.display = 'flex'; }

function endCentrifuge(win) {
    experimentState = win ? 'COMPLETED' : 'READY'; isPlayerInCentrifuge = false;
    document.getElementById('gforce-ui').style.display = 'none'; centrifuga.scaleX = 15; this.cameras.main.shake(0);
    player.setPosition(centrifuga.x - 150, FLOOR_TOP).setVisible(true); player.body.setAllowGravity(true);

    if (win) {
        missions[4].status = "completed"; updateUI();
        startDialogue([ `Outstanding, ${playerName}! You endured 9G without blacking out!`, `Your physical training is officially complete. You are in perfect shape.`, `Now proceed to the exit on the right. Your final simulation awaits: The Journey to the Moon.` ]);
    } else {
        this.cameras.main.flash(500, 0, 0, 0); startDialogue([ `You passed out, ${playerName}! You didn't contract your muscles fast enough.`, `Take a breath, have some water, and try again. You need to press [E] much faster!` ]);
    }
}

function startDialogue(phrases, callback = null) {
    currentDialogueArray = phrases; dialogueIndex = 0; isDialogOpen = true; onDialogueComplete = callback; 
    if (player) { player.setVelocityX(0).play('astro_idle', true); }
    document.getElementById('dialogue-content').innerText = currentDialogueArray[dialogueIndex]; document.getElementById('dialogue-box').style.display = 'flex';
    setTimeout(() => document.getElementById('dialogue-box').style.opacity = '1', 10);
}

function update(time, delta) {
    npc.setFlipX(player.x < npc.x);
    if (isTransitioning) return;

    if (isDialogOpen) {
        player.setVelocityX(0).play('astro_idle', true);
        if (Phaser.Input.Keyboard.JustDown(interactKey)) {
            dialogueIndex++;
            if (dialogueIndex < currentDialogueArray.length) { document.getElementById('dialogue-content').innerText = currentDialogueArray[dialogueIndex]; } 
            else { isDialogOpen = false; document.getElementById('dialogue-box').style.opacity = '0'; setTimeout(() => document.getElementById('dialogue-box').style.display = 'none', 200); if (onDialogueComplete) { onDialogueComplete(); onDialogueComplete = null; } }
        }
        return; 
    }

    if (!hasTalkedToScientist && !isPlayerInCentrifuge && player.x > npc.x - 60) { player.setX(npc.x - 70).setVelocityX(0).play('astro_idle', true); triggerMainDialogue(); }

    if (isPlayerInCentrifuge) {
        spinTimer += delta; let progress = spinTimer / SURVIVAL_TIME; if (progress > 1) progress = 1;
        let intensity = Math.sin(progress * Math.PI); let currentSpeed = 0.002 + (0.035 * intensity); spinPhase += currentSpeed * delta; centrifuga.scaleX = 15 * Math.cos(spinPhase); 
        this.cameras.main.shake(100, 0.001 + (0.009 * intensity)); 
        let currentDrain = 20 + (75 * intensity); resistance -= currentDrain * (delta / 1000); 
        if (Phaser.Input.Keyboard.JustDown(interactKey)) resistance += 15; 
        if (resistance > 100) resistance = 100;
        document.getElementById('gforce-bar-fill').style.width = `${resistance}%`;
        if (resistance <= 0) { endCentrifuge.call(this, false); } else if (spinTimer >= SURVIVAL_TIME) { endCentrifuge.call(this, true); }
        return; 
    }

    if (keys.A.isDown) { player.setVelocityX(-380); player.setFlipX(true).play('astro_walk', true); } 
    else if (keys.D.isDown) { player.setVelocityX(380); player.setFlipX(false).play('astro_walk', true); } 
    else { player.setVelocityX(0).play('astro_idle', true); }
    if ((Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) && player.body.touching.down) { player.setVelocityY(-850); jumpSound.play(); }

    this.interactPrompt.setVisible(false);
    let distNpc = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
    let distCentrifuga = Phaser.Math.Distance.Between(player.x, player.y, centrifuga.x, centrifuga.y);
    let distDoor = Phaser.Math.Distance.Between(player.x, player.y, portalEnd.x, portalEnd.y);

    if (distNpc < 200) {
        this.interactPrompt.setPosition(npc.x, npc.y - 220).setText("[E] TALK").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey) && !isDialogOpen) {
            if (!hasTalkedToScientist && experimentState !== 'COMPLETED') { triggerMainDialogue(); } 
            else if (experimentState === 'READY') { startDialogue([`Go to the centrifuge and press [E] to board. Get ready to mash [E] to stay awake!`]); } 
            else if (experimentState === 'COMPLETED') { startDialogue([`You've passed all physical tests. Now go to the final Moon simulation!`]); }
        }
    } 
    else if (distCentrifuga < 350 && hasTalkedToScientist && experimentState === 'READY') {
        this.interactPrompt.setPosition(centrifuga.x, centrifuga.y - 400).setText("[E] ENTER").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey)) startCentrifuge.call(this);
    }
    else if (distDoor < 150) {
        if (experimentState !== 'COMPLETED') { this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("LOCKED").setVisible(true); } else {
            if (distDoor < 50 && !isTransitioning) { isTransitioning = true; player.setVelocity(0, 0).play('astro_idle', true); document.getElementById('level-title-text').style.opacity = '0'; const overlay = document.getElementById('fade-overlay'); overlay.style.opacity = '1'; setTimeout(() => { window.location.href = 'livello5.html'; }, 1000); } 
            else if (!isTransitioning) { this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("ENTER").setVisible(true); }
        }
    }
}