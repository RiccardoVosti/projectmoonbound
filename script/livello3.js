window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
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
});

const playerName = localStorage.getItem('astronautName') || "Recruit";

const missions = [
    { id: 1, title: "N.B.L. Lab", status: "completed" },
    { id: 2, title: "Vacuum Chamber", status: "completed" },
    { id: 3, title: "Drop Tower", status: "active" },
    { id: 4, title: "Centrifuge", status: "locked" },
    { id: 5, title: "Zero Gravity", status: "locked" }
];

let currentMissionIndex = 0;
let hasTalkedToScientist = false;
let capsule, capsuleTween, capsuleDropped = false, isDropTowerCompleted = false;
let bridge, consolePanel, pitWall; 
let currentDialogueArray = [];
let dialogueIndex = 0;
let isDialogOpen = false;
let onDialogueComplete = null; 
let isTransitioning = false;


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

function completeMission(id) {
    if (missions[id] && missions[id].status === 'active') {
        missions[id].status = 'completed';
        if (missions[id + 1]) missions[id + 1].status = 'active';
        currentMissionIndex++;
        updateUI();
    }
}

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 600;
const SETTINGS = {
    playerScale: 5, npcScale: 6, npcX: 550, playerStartX: 100,
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
    this.load.image('bg_lab', '../imgs/sfondo1.png');
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('scienziato1', '../imgs/Scienziato_neutro1.png');
    this.load.image('scienziato2', '../imgs/Scienziato_neutro2.png');
    this.load.image('porta', '../imgs/porta.png');
    this.load.image('drop', '../imgs/drop.png');
    this.load.image('console', '../imgs/console.png'); 
    this.load.audio('jump_sound', '../sound/jump.wav');
}

function create() {
    updateUI();
    const floorY = WORLD_HEIGHT - 50;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    let bg = this.add.image(0, floorY, 'bg_lab').setOrigin(0, 1).setDepth(-1);
    bg.setScale(10);
    bg.setScrollFactor(1);

    jumpSound = this.sound.add('jump_sound');
    let platforms = this.physics.add.staticGroup();
    platforms.add(this.add.rectangle(550, floorY + 10, 1100, 40, 0x333333)); 
    platforms.add(this.add.rectangle(1650, floorY + 10, 700, 40, 0x333333)); 

    pitWall = this.add.rectangle(1100, floorY - 100, 20, 200, 0x000000, 0);
    this.physics.add.existing(pitWall, true);
    bridge = this.add.rectangle(1200, floorY + 10, 200, 40, 0xffffff, 0.6); 
    this.physics.add.existing(bridge, true);
    bridge.setVisible(false);
    bridge.body.checkCollision.none = true; 

    consolePanel = this.physics.add.staticSprite(1000, floorY - 10, 'console').setScale(SETTINGS.playerScale).setOrigin(0.5, 1).refreshBody(); 
    portalStart = this.physics.add.sprite(100, floorY - 10, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalEnd = this.physics.add.sprite(1900, floorY - 10, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalStart.body.setAllowGravity(false); portalEnd.body.setAllowGravity(false);
    
    npc = this.physics.add.sprite(SETTINGS.npcX, floorY - 10, 'scienziato1').setScale(SETTINGS.npcScale).setOrigin(0.5, 1).setDepth(3);
    player = this.physics.add.sprite(SETTINGS.playerStartX, floorY - 10, 'astro1').setScale(SETTINGS.playerScale).setOrigin(0.5, 1).setDepth(4);
    capsule = this.physics.add.sprite(1100, -30, 'drop').setScale(3).setOrigin(0.5, 0);
    capsule.body.setAllowGravity(false);
    
    capsuleTween = this.tweens.add({ 
        targets: capsule, x: 1200, angle: -16, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' 
    });

    this.physics.add.collider(player, platforms);
    this.physics.add.collider(player, bridge); 
    this.physics.add.collider(player, pitWall); 
    this.physics.add.collider(npc, platforms);
    this.physics.add.collider(capsule, platforms, () => {
        if (capsuleDropped && !isDropTowerCompleted) {
            capsuleDropped = false;
            this.cameras.main.shake(150, 0.01); 
            setTimeout(() => {
                capsule.x = 1100; capsule.y = -30; capsule.body.setAllowGravity(false); capsule.body.setVelocity(0, 0);
                capsuleTween.resume();
            }, 1000);
        }
    });

    player.setCollideWorldBounds(true);
    this.anims.create({ key: 'astro_idle', frames: [{ key: 'astro1' }, { key: 'astro2' }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{ key: 'walk1' }, { key: 'walk2' }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scien_idle', frames: [{ key: 'scienziato1' }, { key: 'scienziato2' }], frameRate: 3, repeat: -1 });
    npc.play('scien_idle');

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(player, true, 0.1, 0.1).setZoom(1.5);

    keys = this.input.keyboard.addKeys('W,A,D,SPACE');
    interactKey = this.input.keyboard.addKey('E');
    this.interactPrompt = this.add.text(0, 0, "", { fontSize: '20px', fill: '#ffffff', fontFamily: 'NbpInforma' }).setOrigin(0.5).setVisible(false).setDepth(10);

    setTimeout(() => { document.getElementById('fade-overlay').style.opacity = '0'; }, 1500);
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
    if (player.y > 650) { player.setPosition(100, 300); player.setVelocity(0,0); }
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

    if (capsuleDropped && capsule.y > 600 && !isDropTowerCompleted) {
        isDropTowerCompleted = true; completeMission(0); if(pitWall) pitWall.destroy(); 
        bridge.setVisible(true); bridge.body.checkCollision.none = false;
        startDialogue([`Excellent ${playerName}! You hit the target perfectly!`, `We have obtained perfect data from the capsule in free fall.`, `I've activated the bridge. Cross it and proceed through the door.`]);
    }

    if (!hasTalkedToScientist && player.x > npc.x - 60) {
        player.setX(npc.x - 70).setVelocityX(0);
        startDialogue([`Hey ${playerName.toUpperCase()}, wait a second!`, `This is the NASA Drop Tower!`, `Your task is to press [E] with the right timing to drop the capsule exactly into the pit. Good luck!`], () => { hasTalkedToScientist = true; });
    }

    if (keys.A.isDown) { player.setVelocityX(-SETTINGS.walkSpeed); player.setFlipX(true).play('astro_walk', true); } 
    else if (keys.D.isDown) { player.setVelocityX(SETTINGS.walkSpeed); player.setFlipX(false).play('astro_walk', true); } 
    else { player.setVelocityX(0); player.play('astro_idle', true); }

    if ((Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) && player.body.touching.down) {
        player.setVelocityY(SETTINGS.jumpForce); jumpSound.play(); 
    }

    this.interactPrompt.setVisible(false);
    let distConsole = Phaser.Math.Distance.Between(player.x, player.y, consolePanel.x, consolePanel.y);
    let distDoor = Phaser.Math.Distance.Between(player.x, player.y, portalEnd.x, portalEnd.y);

    if (distConsole < 150 && hasTalkedToScientist && !isDropTowerCompleted) {
        this.interactPrompt.setPosition(consolePanel.x, consolePanel.y - 180).setText("[E] RELEASE").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey) && !capsuleDropped) {
            capsuleDropped = true; capsuleTween.pause(); capsule.angle = 0; capsule.body.setAllowGravity(true); 
        }
    } 
    
    if (distDoor < 150 && isDropTowerCompleted) {
        if (distDoor < 50 && !isTransitioning) {
            isTransitioning = true;
            document.getElementById('fade-overlay').style.opacity = '1';
            setTimeout(() => { window.location.href = 'livello4.html'; }, 1000);
        } else {
            this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("ENTER").setVisible(true);
        }
    }
}