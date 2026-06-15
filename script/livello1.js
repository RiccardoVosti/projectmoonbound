window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    if (sessionStorage.getItem('currentTrack') !== 'lv3') {
        sessionStorage.setItem('currentTrack', 'lv3');
        sessionStorage.setItem('musicTime', '0'); 
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
    { id: 1, title: "N.B.L. Lab", status: "active" },
    { id: 2, title: "Vacuum Chamber", status: "locked" },
    { id: 3, title: "Drop tower", status: "locked" },
    { id: 4, title: "Centrifuge", status: "locked" },
    { id: 5, title: "Zero gravity", status: "locked" }
];

let hasTalkedToScientist = false; let isDialogOpen = false; let isPoolCompleted = false; let isTransitioning = false;
let isCameraLocked = true; let currentBounds = { h: 600 };
let currentDialogueArray = []; let dialogueIndex = 0; let onDialogueComplete = null;

let uiDrawn = false; // <-- Aggiungi questa variabile per fare da interruttore

function updateUI() {
    if (uiDrawn) return; // <-- Se l'UI è già stata disegnata, blocca gli aggiornamenti!

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

    uiDrawn = true; // <-- Segna che l'UI è stata creata per la prima volta
}

const WORLD_WIDTH = 3000; const WORLD_HEIGHT = 1200; const FLOOR_Y = 550; 
const SETTINGS = {
    playerScale: 5, npcScale: 6, npcX: 600, playerStartX: 250,
    gravity: 2000, walkSpeed: 380, jumpForce: -850, initialZoom: 1.5, zoomLerp: 0.1 
};

const config = {
    type: Phaser.AUTO, parent: 'game-container', width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#050505', pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: SETTINGS.gravity } } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, npc, keys, interactKey, portalStart, portalEnd, jumpSound;

function preload() {
    this.load.image('bg_pool', '../imgs/piscina.png');
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('scienziato1', '../imgs/Scienziato_neutro1.png');
    this.load.image('scienziato2', '../imgs/Scienziato_neutro2.png');
    this.load.image('porta', '../imgs/porta.png');
    this.load.audio('jump_sound', '../sound/jump.wav');
    this.load.image('tubo', '../imgs/tubo.png'); 
   
}

function create() {
    updateUI();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    jumpSound = this.sound.add('jump_sound');

    let background = this.add.image(0, FLOOR_Y, 'bg_pool').setOrigin(0, 1).setDepth(-1);
    background.setScale(10); background.setScrollFactor(1);

    let platforms = this.physics.add.staticGroup();
    platforms.add(this.add.rectangle(400, FLOOR_Y + 20, 800, 40, 0x333333).setDepth(1));
    platforms.add(this.add.rectangle(2600, FLOOR_Y + 20, 800, 40, 0x333333).setDepth(1));

    let poolZone = this.add.rectangle(1500, 850, 1400, 600, 0xaaaaaa, 0.4).setDepth(5);
    
    let bubbleGraphics = this.make.graphics({x: 0, y: 0, add: false});
    bubbleGraphics.fillStyle(0xffffff, 0.6); bubbleGraphics.fillCircle(3, 3, 3);
    bubbleGraphics.generateTexture('bubble', 6, 6);

    this.add.particles(0, 0, 'bubble', {
        x: { min: 820, max: 2180 }, y: 1150, lifespan: { min: 3000, max: 6000 },
        speedY: { min: -50, max: -120 }, speedX: { min: -15, max: 15 },
        scale: { start: 0.5, end: 1.5 }, quantity: 2, alpha: { start: 0.8, end: 0 }, blendMode: 'ADD'
    }).setDepth(4); 
    
    let leftWall = this.add.rectangle(780, 850, 40, 600, 0x000000, 0);
    let rightWall = this.add.rectangle(2220, 850, 40, 600, 0x000000, 0);
    let bottomWall = this.add.rectangle(1500, 1150, 1400, 40, 0x000000, 0); 
    platforms.add(this.physics.add.existing(leftWall, true));
    platforms.add(this.physics.add.existing(rightWall, true));
    platforms.add(this.physics.add.existing(bottomWall, true));

   let ostacoli = this.physics.add.staticGroup();

    // Creiamo i tubi con tileSprite: la larghezza diventa 96 (32x3) e l'altezza copre tutto lo spazio
    let ostacolo1 = this.add.tileSprite(1100, 650, 96, 600, 'tubo').setDepth(2);
    ostacolo1.tileScaleX = 3;
    ostacolo1.tileScaleY = 3;

    let ostacolo2 = this.add.tileSprite(1500, 1050, 96, 500, 'tubo').setDepth(2);
    ostacolo2.tileScaleX = 3;
    ostacolo2.tileScaleY = 3;

    let ostacolo3 = this.add.tileSprite(1900, 650, 96, 600, 'tubo').setDepth(2);
    ostacolo3.tileScaleX = 3;
    ostacolo3.tileScaleY = 3;

    // Aggiungiamo la fisica statica in modo che il giocatore ci sbatta contro
    ostacoli.add(this.physics.add.existing(ostacolo1, true));
    ostacoli.add(this.physics.add.existing(ostacolo2, true));
    ostacoli.add(this.physics.add.existing(ostacolo3, true));

    portalStart = this.physics.add.sprite(150, FLOOR_Y, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalEnd = this.physics.add.sprite(2850, FLOOR_Y, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalStart.body.setAllowGravity(false); portalEnd.body.setAllowGravity(false);

    npc = this.physics.add.sprite(SETTINGS.npcX, FLOOR_Y, 'scienziato1').setScale(SETTINGS.npcScale).setOrigin(0.5, 1).setDepth(3);
    player = this.physics.add.sprite(SETTINGS.playerStartX, FLOOR_Y, 'astro1').setScale(SETTINGS.playerScale).setOrigin(0.5, 1).setDepth(4);

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(player, ostacoli);
    this.physics.add.collider(npc, platforms);

    player.setCollideWorldBounds(true); npc.setImmovable(true); npc.body.setAllowGravity(false);

    this.anims.create({ key: 'astro_idle', frames: [{ key: 'astro1' }, { key: 'astro2' }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{ key: 'walk1' }, { key: 'walk2' }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scien_idle', frames: [{ key: 'scienziato1' }, { key: 'scienziato2' }], frameRate: 3, repeat: -1 });
    npc.play('scien_idle');

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, 600).startFollow(player, true, 0.1, 0.1).setZoom(SETTINGS.initialZoom);
    keys = this.input.keyboard.addKeys('W,A,D,SPACE'); interactKey = this.input.keyboard.addKey('E');
    this.interactPrompt = this.add.text(0, 0, "", { fontSize: '20px', fill: '#ffffff', fontFamily: 'NbpInforma' }).setOrigin(0.5).setVisible(false).setDepth(10);

    setTimeout(() => { document.getElementById('fade-overlay').style.opacity = '0'; }, 1000);
}

function triggerMainDialogue() {
    startDialogue([
        `Stop right there, ${playerName.toUpperCase()}! Be careful not to fall into the tank yet.`,
        `Welcome to the N.B.L., the Neutral Buoyancy Lab.`,
        `This massive pool is 12 meters deep and filled with ultra-purified water.`,
        `Here we simulate Extravehicular Activities (EVA) or spacewalks. The water mimics the feeling of weightlessness.`,
        `But beware: your suit is incredibly heavy! If you stop moving, you'll sink to the bottom.`,
        `Dive in, navigate around the white modules, and repeatedly press [SPACE] or [W] to swim upward.`,
        `Swim to the other side to complete the test.`
    ], () => { hasTalkedToScientist = true; });
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
                isDialogOpen = false; document.getElementById('dialogue-box').style.opacity = '0';
                setTimeout(() => document.getElementById('dialogue-box').style.display = 'none', 200);
                if (onDialogueComplete) { onDialogueComplete(); onDialogueComplete = null; }
            }
        }
        return;
    }

    if (!hasTalkedToScientist && player.x > npc.x - 60) {
        player.setX(npc.x - 70).setVelocityX(0); triggerMainDialogue();
    }

    let inWater = player.x > 780 && player.x < 2220 && player.y > (FLOOR_Y + 10);

    if (inWater && isCameraLocked) {
        isCameraLocked = false; this.tweens.killTweensOf(currentBounds);
        this.tweens.add({
            targets: currentBounds, h: WORLD_HEIGHT, duration: 1200, ease: 'Sine.easeInOut',
            onUpdate: () => { this.cameras.main.setBounds(0, 0, WORLD_WIDTH, currentBounds.h); }
        });
    } else if (!inWater && !isCameraLocked) {
        isCameraLocked = true; this.tweens.killTweensOf(currentBounds);
        this.tweens.add({
            targets: currentBounds, h: 600, duration: 1200, ease: 'Sine.easeInOut',
            onUpdate: () => { this.cameras.main.setBounds(0, 0, WORLD_WIDTH, currentBounds.h); }
        });
    }

    if (inWater) {
        player.body.setAllowGravity(false); player.body.setDragX(800); player.body.velocity.y += 8;
        if (player.body.velocity.y > 250) player.body.velocity.y = 250; 
        let swimSpeed = 250;
        if (keys.A.isDown) { player.setVelocityX(-swimSpeed); player.setFlipX(true).play('astro_walk', true); } 
        else if (keys.D.isDown) { player.setVelocityX(swimSpeed); player.setFlipX(false).play('astro_walk', true); } 
        else { player.play('astro_idle', true); }
        if (Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) {
            player.setVelocityY(-400); jumpSound.play({ volume: 0.5, rate: 0.8 }); 
        }
    } else {
        player.body.setAllowGravity(true); player.body.setDragX(0);
        if (keys.A.isDown) { player.setVelocityX(-SETTINGS.walkSpeed); player.setFlipX(true).play('astro_walk', true); } 
        else if (keys.D.isDown) { player.setVelocityX(SETTINGS.walkSpeed); player.setFlipX(false).play('astro_walk', true); } 
        else { player.setVelocityX(0); player.play('astro_idle', true); }
        if ((Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) && player.body.touching.down) {
            player.setVelocityY(SETTINGS.jumpForce); jumpSound.play({ volume: 1, rate: 1 });
        }
    }

    if (player.x > 2250 && !isPoolCompleted) {
        isPoolCompleted = true; missions[2].status = "completed"; updateUI();
        startDialogue([ `Great job, ${playerName}!`, `You crossed the entire N.B.L. tank while navigating the modules.`, `The test is passed. Proceed to the door on the right.` ]);
    }

    this.interactPrompt.setVisible(false);
    let distNpc = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
    let distDoor = Phaser.Math.Distance.Between(player.x, player.y, portalEnd.x, portalEnd.y);

    if (distNpc < 200) {
        this.interactPrompt.setPosition(npc.x, npc.y - 220).setText("[E] TALK").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey) && !isDialogOpen) {
            if (!hasTalkedToScientist) { triggerMainDialogue(); } else { startDialogue([ `Dive in and swim to the right. Use [SPACE] with the right rhythm to navigate the modules!` ]); }
        }
    } else if (distDoor < 150) {
        if (!isPoolCompleted) { this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("LOCKED").setVisible(true); } else {
            if (distDoor < 50 && !isTransitioning) {
                isTransitioning = true; player.setVelocity(0, 0).play('astro_idle', true);
                document.getElementById('level-title-text').style.opacity = '0'; 
                const overlay = document.getElementById('fade-overlay'); overlay.style.opacity = '1'; 
                setTimeout(() => { window.location.href = 'livello2.html'; }, 1000);
            } else if (!isTransitioning) { this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("ENTER").setVisible(true); }
        }
    }
}