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

const WORLD_WIDTH = window.innerWidth;
const WORLD_HEIGHT = 800; 

const config = {
    type: Phaser.AUTO, parent: 'game-container',
    width: window.innerWidth, height: window.innerHeight,
    backgroundColor: '#111111', pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: 2000 } } },
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);
let player, keys, jumpSound;
let boxGroup; 
let startTime;
let totalDuration = 22000; 
let isSimulationRunning = false;
let obloList = [];
let numOblos = 0;

function preload() {
    this.load.image('astro1', '../imgs/astronauta_neutro1.png');
    this.load.image('astro2', '../imgs/astronauta_neutro2.png');
    this.load.image('walk1', '../imgs/astronauta_camminata1.png');
    this.load.image('walk2', '../imgs/astronauta_camminata2.png');
    this.load.image('oblo', '../imgs/oblo.png'); 
    this.load.image('scatola', '../imgs/scatola.png');
    this.load.audio('jump_sound', '../sound/jump.wav');
}

function create() {
    const floorY = WORLD_HEIGHT - 50; 
    const floorTop = floorY - 10; 
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    jumpSound = this.sound.add('jump_sound');

    numOblos = Math.ceil(WORLD_WIDTH / 350) + 1; 
    let obloY = WORLD_HEIGHT / 2 - 50;
    for(let i = 0; i < numOblos; i++) {
        let obloX = i * 350;
        let oblo = this.add.sprite(obloX, obloY, 'oblo').setScale(4).setAlpha(0.6); 
        oblo.baseX = obloX; oblo.baseY = obloY;
        obloList.push(oblo);
    }

    let platforms = this.physics.add.staticGroup();
    platforms.add(this.add.rectangle(WORLD_WIDTH / 2, floorY + 10, WORLD_WIDTH, 40, 0x444444)); 
    let soffitto = this.add.rectangle(WORLD_WIDTH / 2, 20, WORLD_WIDTH, 40, 0x222222);
    this.physics.add.existing(soffitto, true);
    platforms.add(soffitto);

    boxGroup = this.physics.add.group();
    player = this.physics.add.sprite(WORLD_WIDTH / 4, floorTop, 'astro1').setScale(5).setOrigin(0.5, 1);
    player.body.setSize(player.width * 0.6, player.height * 0.9);
    
    this.physics.add.collider(player, platforms);
    player.setCollideWorldBounds(true).setBounce(0.1); 
    this.physics.add.overlap(player, boxGroup, hitByBox, null, this);

    this.anims.create({ key: 'astro_idle', frames: [{ key: 'astro1' }, { key: 'astro2' }], frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'astro_walk', frames: [{ key: 'walk1' }, { key: 'walk2' }], frameRate: 10, repeat: -1 });

    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.centerOn(WORLD_WIDTH/2, WORLD_HEIGHT/2);
    keys = this.input.keyboard.addKeys('W,A,D,SPACE');

    this.time.addEvent({ delay: 900, callback: spawnBox, callbackScope: this, loop: true });

    setTimeout(() => {
        document.getElementById('fade-overlay').style.opacity = '0';
        startTime = this.time.now; isSimulationRunning = true;
    }, 1000);
}

function hitByBox(player, box) {
    if (!isSimulationRunning) return;
    isSimulationRunning = false;
    player.setTint(0xff0000); this.cameras.main.shake(300, 0.01);
    let title = document.getElementById('ui-title');
    title.innerText = "COLLISION! RESTARTING..."; title.style.color = "#ff4444"; title.style.borderColor = "#ff4444";
    document.getElementById('fade-overlay').style.opacity = '1';
    setTimeout(() => { window.location.reload(); }, 1200);
}

function spawnBox() {
    if (!isSimulationRunning) return;
    let spawnY = (Math.random() > 0.5) ? (WORLD_HEIGHT - 90) : (WORLD_HEIGHT - 250 - Phaser.Math.Between(0, 100));
    let box = boxGroup.create(WORLD_WIDTH + 100, spawnY, 'scatola');
    box.setDisplaySize(60, 60); box.body.setSize(box.width * 0.8, box.height * 0.8);
    box.setVelocityX(Phaser.Math.Between(-500, -900)); box.body.setAllowGravity(false); box.setMass(10);
}

function update(time, delta) {
    if (!isSimulationRunning) return;

    if (keys.A.isDown) { player.setVelocityX(-450); player.setFlipX(true); player.play('astro_walk', true); } 
    else if (keys.D.isDown) { player.setVelocityX(450); player.setFlipX(false); player.play('astro_walk', true); } 
    else { player.setVelocityX(0); player.play('astro_idle', true); }

    boxGroup.getChildren().forEach(box => { if (box.x < -100) box.destroy(); });

    let shakingIntensity = 1; 
    let elapsed = time - startTime;
    let p = elapsed / totalDuration; if (p > 1) p = 1;
    
    let timeRemaining = Math.max(Math.ceil((totalDuration - elapsed) / 1000), 0);
    document.getElementById('time-text').innerText = `${timeRemaining}s`;

    let P0_x = 20, P0_y = 110, P1_x = 160, P1_y = -90, P2_x = 300, P2_y = 110;
    let x = Math.pow(1-p, 2)*P0_x + 2*(1-p)*p*P1_x + Math.pow(p, 2)*P2_x;
    let y = Math.pow(1-p, 2)*P0_y + 2*(1-p)*p*P1_y + Math.pow(p, 2)*P2_y;
    let dx = 2*(1-p)*(P1_x - P0_x) + 2*p*(P2_x - P1_x), dy = 2*(1-p)*(P1_y - P0_y) + 2*p*(P2_y - P1_y);
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    let miniAereo = document.getElementById('mini-aereo');
    miniAereo.style.left = `${x}px`; miniAereo.style.top = `${y}px`; miniAereo.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;

    let phaseTextDOM = document.getElementById('phase-text');

    if (elapsed < 4000) {
        phaseTextDOM.innerText = "STEEP CLIMB (2G)"; phaseTextDOM.style.color = "#ff4444"; 
        this.physics.world.gravity.y = 4500; handleJump(-1000); shakingIntensity = 6; 
        if(Math.random() > 0.85) this.cameras.main.shake(100, 0.003); 
    } else if (elapsed < 18000) {
        phaseTextDOM.innerText = "MICROGRAVITY (0G)"; phaseTextDOM.style.color = "#00ffff"; 
        this.physics.world.gravity.y = 80; handleJump(-450); shakingIntensity = 0.5; 
    } else if (elapsed < 22000) {
        phaseTextDOM.innerText = "DESCENT (2G)"; phaseTextDOM.style.color = "#ff4444";
        this.physics.world.gravity.y = 4500; handleJump(-1000); shakingIntensity = 8; 
        if(Math.random() > 0.8) this.cameras.main.shake(100, 0.004); 
    } else {
        isSimulationRunning = false; phaseTextDOM.innerText = "COMPLETED"; phaseTextDOM.style.color = "#ffffff";
        this.physics.world.gravity.y = 2000; shakingIntensity = 0; 
        player.setVelocityX(0).play('astro_idle', true); localStorage.setItem('zeroG_completed', 'true');
        document.getElementById('fade-overlay').style.opacity = '1';
        setTimeout(() => { window.location.href = 'livello5c.html'; }, 1500);
    }

    if (shakingIntensity > 0) {
        obloList.forEach(oblo => {
            oblo.x = oblo.baseX + (Math.random() - 0.5) * shakingIntensity;
            oblo.y = oblo.baseY + (Math.random() - 0.5) * shakingIntensity;
        });
    } else {
        obloList.forEach(oblo => { oblo.x = oblo.baseX; oblo.y = oblo.baseY; });
    }
}

function handleJump(jumpForce) {
    let jumpPressed = Phaser.Input.Keyboard.JustDown(keys.W) || Phaser.Input.Keyboard.JustDown(keys.SPACE);
    if (jumpPressed && player.body.touching.down) { player.setVelocityY(jumpForce); jumpSound.play(); }
}