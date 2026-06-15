window.addEventListener('DOMContentLoaded', () => {
    const bgMusic = document.getElementById('bg-music');
    if (sessionStorage.getItem('currentTrack') !== 'lv4') {
        sessionStorage.setItem('currentTrack', 'lv4'); sessionStorage.setItem('musicTime', '0'); 
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
    { id: 2, title: "Vacuum Chamber", status: "active" },
    { id: 3, title: "Drop tower", status: "locked" },
    { id: 4, title: "Centrifuge", status: "locked" },
    { id: 5, title: "Zero gravity", status: "locked" }
];

let hasTalkedToScientist = false; let isDialogOpen = false; let isTransitioning = false; let isValveGameActive = false; 
let experimentState = 'READY_1'; let ballLanded = false; let featherLanded = false;
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

const WORLD_WIDTH = 2200; const WORLD_HEIGHT = 900; const FLOOR_Y = WORLD_HEIGHT - 50; 
const CHAMBER_HEIGHT = 450; const CHAMBER_TOP_Y = FLOOR_Y - CHAMBER_HEIGHT; const DROP_Y = CHAMBER_TOP_Y + 120; 

const SETTINGS = { playerScale: 5, npcScale: 6, npcX: 550, playerStartX: 100, gravity: 2000, walkSpeed: 380, jumpForce: -850, initialZoom: 1.5 };
const config = {
    type: Phaser.AUTO, parent: 'game-container', width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#050505', pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: SETTINGS.gravity } } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, npc, keys, interactKey, portalStart, portalEnd, jumpSound;
let consolePanel, valvolaSprite, poleSprite, chamberLeft, chamberRight, chamberTop, palla, piuma;
let chamberWalls, playerWallCollider, airParticles; 

function preload() {
    this.load.image('sfondo', '../imgs/NBL.png');
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('scienziato1', '../imgs/Scienziato_neutro1.png');
    this.load.image('scienziato2', '../imgs/Scienziato_neutro2.png');
    this.load.image('porta', '../imgs/porta.png');
    this.load.image('console', '../imgs/console.png'); 
    this.load.image('palla', '../imgs/palla.png'); 
    this.load.image('piuma', '../imgs/piuma.png'); 
    this.load.image('valvola', '../imgs/valvola.png'); 
    this.load.audio('jump_sound', '../sound/jump.wav'); 
}

function create() {
    updateUI();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    jumpSound = this.sound.add('jump_sound');

    let bg = this.add.image(WORLD_WIDTH / 2, 0, 'sfondo').setOrigin(0.5, 0).setDisplaySize(WORLD_WIDTH, FLOOR_Y).setDepth(-1); 
    let platforms = this.physics.add.staticGroup(); platforms.add(this.add.rectangle(WORLD_WIDTH / 2, FLOOR_Y + 10, WORLD_WIDTH, 40, 0x333333)); 

    chamberWalls = this.physics.add.staticGroup();
    chamberLeft = this.add.rectangle(1300, FLOOR_Y - CHAMBER_HEIGHT/2, 20, CHAMBER_HEIGHT, 0xaaaaaa, 1); 
    chamberRight = this.add.rectangle(1700, FLOOR_Y - CHAMBER_HEIGHT/2, 20, CHAMBER_HEIGHT, 0xaaaaaa, 1); 
    chamberTop = this.add.rectangle(1500, CHAMBER_TOP_Y, 420, 20, 0xaaaaaa, 1); 
    chamberWalls.add(chamberLeft); chamberWalls.add(chamberRight); chamberWalls.add(chamberTop); 
    this.add.rectangle(1500, FLOOR_Y - CHAMBER_HEIGHT/2, 380, CHAMBER_HEIGHT, 0x112233, 0.3).setDepth(0);

    let graphics = this.make.graphics({x: 0, y: 0, add: false}); graphics.fillStyle(0xffffff, 0.4); graphics.fillRect(0, 0, 4, 4); graphics.generateTexture('air_pixel', 4, 4);
    airParticles = this.add.particles(0, 0, 'air_pixel', {
        x: { min: 1320, max: 1680 }, y: { min: CHAMBER_TOP_Y + 20, max: FLOOR_Y - 20 }, 
        lifespan: 3000, speed: { min: 5, max: 20 }, angle: { min: 0, max: 360 }, scale: { start: 1, end: 0 }, quantity: 1, blendMode: 'ADD'
    }).setDepth(1); 

    consolePanel = this.physics.add.staticSprite(1000, FLOOR_Y - 10, 'console').setOrigin(0.5, 1).setScale(SETTINGS.playerScale).refreshBody(); 
    poleSprite = this.add.rectangle(1200, FLOOR_Y, 15, 100, 0xdddddd).setOrigin(0.5, 1).setDepth(0);
    valvolaSprite = this.physics.add.sprite(1200, FLOOR_Y - 100, 'valvola').setScale(3).setDepth(1); valvolaSprite.body.setAllowGravity(false);

    palla = this.physics.add.sprite(1420, DROP_Y, 'palla').setScale(3).setDepth(2); palla.body.setAllowGravity(false);
    piuma = this.physics.add.sprite(1580, DROP_Y, 'piuma').setScale(3).setDepth(2); piuma.body.setAllowGravity(false);
    
    this.physics.add.collider(palla, platforms, () => { if (experimentState === 'DROPPING_1' || experimentState === 'DROPPING_2') { ballLanded = true; palla.setVelocity(0,0); checkExperimentProgress(); } });
    this.physics.add.collider(piuma, platforms, () => { if (experimentState === 'DROPPING_1' || experimentState === 'DROPPING_2') { featherLanded = true; piuma.setVelocity(0,0); checkExperimentProgress(); } });

    portalStart = this.physics.add.sprite(100, FLOOR_Y - 10, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalEnd = this.physics.add.sprite(2000, FLOOR_Y - 10, 'porta').setOrigin(0.5, 1).setScale(5).setDepth(2).setTint(0x555555);
    portalStart.body.setAllowGravity(false); portalEnd.body.setAllowGravity(false);

    npc = this.physics.add.sprite(SETTINGS.npcX, FLOOR_Y - 10, 'scienziato1').setScale(SETTINGS.npcScale).setOrigin(0.5, 1).setDepth(3);
    player = this.physics.add.sprite(SETTINGS.playerStartX, FLOOR_Y - 10, 'astro1').setScale(SETTINGS.playerScale).setOrigin(0.5, 1).setDepth(4);

    this.physics.add.collider(player, platforms); this.physics.add.collider(npc, platforms);
    playerWallCollider = this.physics.add.collider(player, chamberWalls); 
    player.setCollideWorldBounds(true); npc.setImmovable(true); npc.body.setAllowGravity(false);

    this.anims.create({ key: 'astro_idle', frames: [{ key: 'astro1' }, { key: 'astro2' }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{ key: 'walk1' }, { key: 'walk2' }], frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'scien_idle', frames: [{ key: 'scienziato1' }, { key: 'scienziato2' }], frameRate: 3, repeat: -1 });
    npc.play('scien_idle');

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT).startFollow(player, true, 0.1, 0.1).setZoom(SETTINGS.initialZoom);
    keys = this.input.keyboard.addKeys('W,A,D,SPACE'); interactKey = this.input.keyboard.addKey('E');
    this.interactPrompt = this.add.text(0, 0, "", { fontSize: '20px', fill: '#ffffff', fontFamily: 'NbpInforma' }).setOrigin(0.5).setVisible(false).setDepth(10);

    setTimeout(() => { document.getElementById('fade-overlay').style.opacity = '0'; }, 1000);
}

const valveImg = document.getElementById('valve-img-interactive'); const valveUI = document.getElementById('valve-minigame'); const progressBar = document.getElementById('progress-bar-fill');
let isDraggingValve = false; let previousAngle = 0; let cumulativeRotation = 0; const TARGET_ROTATION = 1080; const RESISTANCE = 0.6;

valveImg.addEventListener('pointerdown', (e) => {
    isDraggingValve = true; let rect = valveImg.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2; let centerY = rect.top + rect.height / 2;
    previousAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI; e.preventDefault(); 
});

window.addEventListener('pointermove', (e) => {
    if(!isDraggingValve) return;
    let rect = valveImg.getBoundingClientRect(); let centerX = rect.left + rect.width / 2; let centerY = rect.top + rect.height / 2;
    let currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180 / Math.PI;
    let deltaAngle = currentAngle - previousAngle; if (deltaAngle > 180) deltaAngle -= 360; if (deltaAngle < -180) deltaAngle += 360;
    if (deltaAngle > 0) cumulativeRotation += deltaAngle * RESISTANCE;
    previousAngle = currentAngle;
});
window.addEventListener('pointerup', () => { isDraggingValve = false; });

function completeValveTask() {
    valveUI.style.display = 'none'; isValveGameActive = false; airParticles.stop(); experimentState = 'READY_2'; 
    startDialogue([ `Excellent. You've extracted the air from the chamber. It's a complete vacuum.`, `Return to the console to drop the objects again and let's see the result.` ]);
}

function triggerMainDialogue() {
    startDialogue([
        `Great work, ${playerName}. Now let's change the rules of physics.`,
        `This is the NASA Space Power Facility. Before you is the world's largest vacuum chamber.`,
        `We will drop a heavy bowling ball and a lightweight feather.`,
        `Go to the console. For the first test, leave the air in the chamber and press [E] to drop them.`
    ], () => { hasTalkedToScientist = true; });
}

function checkExperimentProgress() {
    if (ballLanded && featherLanded) {
        if (experimentState === 'DROPPING_1') {
            experimentState = 'VALVE_TASK'; ballLanded = false; featherLanded = false;
            startDialogue([ `As expected! Air resistance slowed the feather down, while the ball plummeted.`, `Now let's get serious. I've reset the objects.`, `Go to the white pressure VALVE next to the chamber and turn it to pump out all the air.` ], () => { resetObjects(); });
        } else if (experimentState === 'DROPPING_2') {
            experimentState = 'COMPLETED'; missions[3].status = "completed"; updateUI(); playerWallCollider.active = false;
            startDialogue([ `Incredible, isn't it? Without air resistance, gravity accelerates all objects at the same rate!`, `The ball and feather hit the ground at exactly the same time.`, `Galileo Galilei was right, and now you've proven it yourself.`, `The experiment is a success. The chamber walls are now passable, proceed to the exit!` ]);
        }
    }
}

function resetObjects() { palla.body.setAllowGravity(false); piuma.body.setAllowGravity(false); palla.setVelocity(0, 0); piuma.setVelocity(0, 0); palla.setPosition(1420, DROP_Y); piuma.setPosition(1580, DROP_Y); }
function startDialogue(phrases, callback = null) {
    currentDialogueArray = phrases; dialogueIndex = 0; isDialogOpen = true; onDialogueComplete = callback; 
    if (player) { player.setVelocityX(0).play('astro_idle', true); }
    document.getElementById('dialogue-content').innerText = currentDialogueArray[dialogueIndex]; document.getElementById('dialogue-box').style.display = 'flex';
    setTimeout(() => document.getElementById('dialogue-box').style.opacity = '1', 10);
}

function update(time) {
    npc.setFlipX(player.x < npc.x);
    if (isValveGameActive) {
        if (cumulativeRotation > 0) { cumulativeRotation -= 0.8; if (cumulativeRotation < 0) cumulativeRotation = 0; }
        valveImg.style.transform = `rotate(${cumulativeRotation}deg)`;
        progressBar.style.width = `${Math.min((cumulativeRotation / TARGET_ROTATION) * 100, 100)}%`;
        if (cumulativeRotation >= TARGET_ROTATION) completeValveTask();
        return; 
    }
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

    if (!hasTalkedToScientist && player.x > npc.x - 60) { player.setX(npc.x - 70).setVelocityX(0); triggerMainDialogue(); }
    if (keys.A.isDown) { player.setVelocityX(-SETTINGS.walkSpeed).setFlipX(true).play('astro_walk', true); } 
    else if (keys.D.isDown) { player.setVelocityX(SETTINGS.walkSpeed).setFlipX(false).play('astro_walk', true); } 
    else { player.setVelocityX(0).play('astro_idle', true); }

    if ((Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE)) && player.body.touching.down) { player.setVelocityY(SETTINGS.jumpForce); jumpSound.play(); }
    if (experimentState === 'DROPPING_1' && !featherLanded) piuma.x = 1580 + Math.sin(time / 150) * 60;

    this.interactPrompt.setVisible(false);
    let distNpc = Phaser.Math.Distance.Between(player.x, player.y, npc.x, npc.y);
    let distConsole = Phaser.Math.Distance.Between(player.x, player.y, consolePanel.x, consolePanel.y);
    let distValve = Phaser.Math.Distance.Between(player.x, player.y, valvolaSprite.x, valvolaSprite.y);
    let distDoor = Phaser.Math.Distance.Between(player.x, player.y, portalEnd.x, portalEnd.y);

    if (distNpc < 200) {
        this.interactPrompt.setPosition(npc.x, npc.y - 220).setText("[E] TALK").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey) && !isDialogOpen) {
            if (!hasTalkedToScientist) triggerMainDialogue();
            else if (experimentState === 'READY_1') startDialogue([`Go to the console and press [E] to test with air resistance.`]);
            else if (experimentState === 'VALVE_TASK') startDialogue([`Go to the VALVE on the white pole and turn it to pump out the air.`]);
            else if (experimentState === 'READY_2') startDialogue([`I've removed the air. Go to the console and press [E] to try again.`]);
        }
    } 
    else if (distValve < 200 && experimentState === 'VALVE_TASK') {
        this.interactPrompt.setPosition(valvolaSprite.x, valvolaSprite.y - 120).setText("[E] TURN VALVE").setVisible(true);
        if (Phaser.Input.Keyboard.JustDown(interactKey)) { isValveGameActive = true; player.setVelocity(0,0).play('astro_idle', true); cumulativeRotation = 0; valveImg.style.transform = `rotate(0deg)`; progressBar.style.width = `0%`; valveUI.style.display = 'flex'; }
    }
    else if (distConsole < 200 && hasTalkedToScientist) {
        if (experimentState === 'READY_1') {
            this.interactPrompt.setPosition(consolePanel.x, consolePanel.y - 180).setText("[E] RELEASE (AIR)").setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(interactKey)) { experimentState = 'DROPPING_1'; palla.body.setAllowGravity(true); piuma.body.setAllowGravity(true).setMaxVelocity(10000, 150); }
        } else if (experimentState === 'READY_2') {
            this.interactPrompt.setPosition(consolePanel.x, consolePanel.y - 180).setText("[E] RELEASE (VACUUM)").setVisible(true);
            if (Phaser.Input.Keyboard.JustDown(interactKey)) { experimentState = 'DROPPING_2'; palla.body.setAllowGravity(true); piuma.body.setAllowGravity(true).setMaxVelocity(10000, 10000); piuma.x = 1580; }
        }
    }
    else if (distDoor < 200) {
        if (experimentState !== 'COMPLETED') { this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("LOCKED").setVisible(true); } else {
            if (distDoor < 50 && !isTransitioning) { isTransitioning = true; player.setVelocity(0, 0).play('astro_idle', true); overlay = document.getElementById('fade-overlay'); overlay.style.opacity = '1'; setTimeout(() => { window.location.href = 'livello3.html'; }, 1000); } 
            else if (!isTransitioning) { this.interactPrompt.setPosition(portalEnd.x, portalEnd.y - 250).setText("ENTER").setVisible(true); }
        }
    }
}