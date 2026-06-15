window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    if (sessionStorage.getItem('musicPlaying') === 'true') {
        bgMusic.currentTime = parseFloat(sessionStorage.getItem('musicTime') || 0);
        let playPromise = bgMusic.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                const forceAudioPlay = () => {
                    bgMusic.play();
                    document.removeEventListener('click', forceAudioPlay);
                    document.removeEventListener('keydown', forceAudioPlay);
                };
                document.addEventListener('click', forceAudioPlay);
                document.addEventListener('keydown', forceAudioPlay);
            });
        }
    }
    window.addEventListener('beforeunload', () => {
        sessionStorage.setItem('musicTime', bgMusic.currentTime);
    });
});

const playerName = localStorage.getItem('astronautName') || "Recruit";

const missions = [
    { id: 1, title: "N.B.L. Lab", status: "completed" },
    { id: 2, title: "Vacuum Chamber", status: "completed" },
    { id: 3, title: "Drop Tower", status: "completed" },
    { id: 4, title: "Centrifuge", status: "completed" },
    { id: 5, title: "Zero Gravity", status: "active" },
      { id: 6, title: "Exam", status: "locked" }
];


let hasTalkedToScientist = true;
let isDialogOpen = false;
let isTransitioning = false;
let aereo;
let currentDialogueArray = [];
let dialogueIndex = 0;
let onDialogueComplete = null;

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

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 600;
const SETTINGS = {
    playerScale: 5, npcScale: 6, npcX: 550, playerStartX: 1400,
    gravity: 2000, walkSpeed: 380, jumpForce: -850,
    minZoom: 1.2, maxZoom: 2.0, initialZoom: 1.5, zoomLerp: 0.1
};

const config = {
    type: Phaser.AUTO, parent: 'game-container',
    width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#050505', pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: SETTINGS.gravity } } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, npc, keys, interactKey, portalStart, portalEnd, jumpSound;

function preload() {
    this.load.image('bg_hangar', '../imgs/hangar.png');
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('scienziato1', '../imgs/Scienziato_neutro1.png');
    this.load.image('scienziato2', '../imgs/Scienziato_neutro2.png');
    this.load.image('porta', '../imgs/porta.png');
    this.load.image('aereo', '../imgs/aereo.png');
    this.load.audio('jump_sound', '../sound/jump.wav');
}

function create() {
    updateUI();
    const floorY = WORLD_HEIGHT - 50;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    let bg = this.add.image(0, floorY, 'bg_hangar').setOrigin(0, 1).setDepth(-1);
    bg.setScale(10); bg.setScrollFactor(1);

    jumpSound = this.sound.add('jump_sound');
    let platforms = this.physics.add.staticGroup();
    platforms.add(this.add.rectangle(WORLD_WIDTH / 2, floorY + 10, WORLD_WIDTH, 40, 0x333333));

    aereo = this.physics.add.staticSprite(1400, floorY - 10, 'aereo').setOrigin(0.5, 1).setScale(9).refreshBody();
    aereo.body.checkCollision.none = true;

    portalStart = this.physics.add.sprite(100, floorY - 10, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalEnd = this.physics.add.sprite(1900, floorY - 10, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalStart.body.setAllowGravity(false); portalEnd.body.setAllowGravity(false);

    npc = this.physics.add.sprite(SETTINGS.npcX, floorY - 10, 'scienziato1').setScale(SETTINGS.npcScale).setOrigin(0.5, 1).setDepth(3);
    player = this.physics.add.sprite(SETTINGS.playerStartX, floorY - 10, 'astro1').setScale(SETTINGS.playerScale).setOrigin(0.5, 1).setDepth(4);

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(npc, platforms);

    player.setCollideWorldBounds(true);
    npc.setImmovable(true); npc.body.setAllowGravity(false);

    this.anims.create({ key: 'astro_idle', frames: [{ key: 'astro1' }, { key: 'astro2' }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{ key: 'walk1' }, { key: 'walk2' }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scien_idle', frames: [{ key: 'scienziato1' }, { key: 'scienziato2' }], frameRate: 3, repeat: -1 });
    npc.play('scien_idle');

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).startFollow(player, true, 0.1, 0.1).setZoom(1.5);
    keys = this.input.keyboard.addKeys('W,A,D,SPACE');
    interactKey = this.input.keyboard.addKey('E');
    this.interactPrompt = this.add.text(0, 0, "", { fontSize: '20px', fill: '#ffffff', fontFamily: 'NbpInforma' }).setOrigin(0.5).setVisible(false).setDepth(10);

    setTimeout(() => {
        document.getElementById('level-title-text').style.opacity = '0';
        document.getElementById('fade-overlay').style.opacity = '0';
    }, 1500);
}

function startDialogue(phrases, callback = null) {
    currentDialogueArray = phrases; dialogueIndex = 0; isDialogOpen = true; onDialogueComplete = callback;
    if (player) { player.setVelocityX(0); player.play('astro_idle', true); }
    document.getElementById('dialogue-content').innerText = currentDialogueArray[dialogueIndex];
    document.getElementById('dialogue-box').style.display = 'flex';
    setTimeout(() => document.getElementById('dialogue-box').style.opacity = '1', 10);
}

function update() {
    npc.setFlipX(player.x < npc.x);
    if (isTransitioning) return;

    if (isDialogOpen) {
        player.setVelocityX(0).play('astro_idle', true);
        if (Phaser.Input.Keyboard.JustDown(interactKey)) {
            dialogueIndex++;
            if (dialogueIndex < currentDialogueArray.length) {
                document.getElementById('dialogue-content').innerText = currentDialogueArray[dialogueIndex];
            } else {
                isDialogOpen = false;
                document.getElementById('dialogue-box').style.opacity = '0';
                setTimeout(() => document.getElementById('dialogue-box').style.display = 'none', 200);
                if (onDialogueComplete) onDialogueComplete();
            }
        }
        return;
    }

    if (keys.A.isDown) { player.setVelocityX(-SETTINGS.walkSpeed); player.setFlipX(true).play('astro_walk', true); } 
    else if (keys.D.isDown) { player.setVelocityX(SETTINGS.walkSpeed); player.setFlipX(false).play('astro_walk', true); } 
    else { player.setVelocityX(0).play('astro_idle', true); }

    if ((Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) && player.body.touching.down) {
        player.setVelocityY(SETTINGS.jumpForce); jumpSound.play();
    }

    this.interactPrompt.setVisible(false);
    let distNpc = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
    let distDoor = Phaser.Math.Distance.Between(player.x, player.y, portalEnd.x, portalEnd.y);

    if (distNpc < 200) {
        this.interactPrompt.setPosition(npc.x, npc.y - 220).setText("[E] TALK").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey) && !isDialogOpen) {
            startDialogue([
                `Excellent ${playerName.toUpperCase()}! I monitored your vitals during the flight.`,
                `You passed the Vomit Comet test and handled the G-force perfectly!`,
                `Proceed to the door on the right for the next chamber.`
            ]);
        }
    }

    if (distDoor < 50 && !isTransitioning) {
        isTransitioning = true; player.setVelocity(0, 0).play('astro_idle', true);
        const overlay = document.getElementById('fade-overlay'); overlay.style.opacity = '1';
        setTimeout(() => { window.location.href = 'livello6.html'; }, 1000);
    } else if (distDoor < 150 && !isTransitioning) {
        this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("ENTER").setVisible(true);
    }
}