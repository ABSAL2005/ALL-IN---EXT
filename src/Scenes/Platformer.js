class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");

        this.eKey = null;
        this.jumpKey = null;
    }

    preload() {
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
    }

    init() {
        // variables and settings
        this.ACCELERATION = 800;
        this.DRAG = 1100;    // DRAG < ACCELERATION = icy slide
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCORE = 0;
        this.footstepCooldown = 0;
        this.maxJumps = 1;
        this.jumpsLeft = 1;
        this.canSpinWheel = true;
        this.spinning = false;
        this.platformMinX = 1200;
        this.platformMaxX = 1400;    
        this.crouch = false;
        this.enemySpeed = 60;
        this.centerX = this.cameras.main.width / 2;
        this.centerY = this.cameras.main.height / 2;
        this.spinning = false;
        this.death = false;
        this.incomingAbilities = {}
        this.enemies = []
    }

    createEnemy(x, y, minX, maxX, speed) {
        let enemy = this.physics.add.sprite(x, y, "tilemap_sheet", 380)
        enemy.body.setCollideWorldBounds(true)
        enemy.body.setAllowGravity(false)
        enemy.setMaxVelocity(120, 1000)
        enemy.body.setVelocityX(speed)
        enemy.minX = minX
        enemy.maxX = maxX
        enemy.speed = speed
        enemy.direction = 1

        this.physics.add.collider(enemy, this.groundLayer)
        this.physics.add.collider(enemy, this.platformLayer)

        this.physics.add.overlap(my.sprite.player, enemy, (player, e) => {
            if (player.body.velocity.y > 0 && player.body.bottom <= e.y + 10) {
                this.killEnemy(e)
            } else {
                if (!this.abilities?.active?.invulnerable) {
                    this.deathAnim()
                }
            }
        })

        this.enemies.push(enemy)
    }

    killEnemy(enemy, bounce = true) {
        this.enemies = this.enemies.filter(e => e !== enemy)
        if (bounce) {
            my.sprite.player.body.setVelocityY(-400);
        }
        enemy.body.enable = false
        this.sound.play("dead", {rate: 2})

        this.tweens.add({
            targets: enemy,
            scaleX: 1.5,
            scaleY: 0,
            y: enemy.y + 8,
            duration: 400,
            onComplete: () => {
                enemy.destroy()
                let diamond = this.physics.add.sprite(enemy.x, enemy.y, "tilemap_sheet2", 62)
                this.physics.add.collider(diamond, this.backgroundLayer)
                diamond.body.setAllowGravity(true)
                diamond.body.setVelocityY(-300)
                diamond.body.setBounce(0.5)
                this.physics.add.overlap(my.sprite.player, diamond, (p, d) => {
                    d.destroy()
                    this.SCORE += 1
                    this.sound.play("coin");
                    this.coinParticles.setPosition(d.x, d.y);
                    this.coinParticles.explode();
                    this.scoreText.setText(`Diamonds: ${this.SCORE}`)
                })
                this.time.delayedCall(5000, () => { if (diamond.active) diamond.destroy() })
            }
        })
    }

    updateEnemies() {
        this.enemies.forEach(enemy => {
            if (enemy.x >= enemy.maxX) {
                enemy.direction = -1
                enemy.setFlip(true, false)
            } else if (enemy.x <= enemy.minX) {
                enemy.direction = 1
                enemy.resetFlip()
            }
            enemy.body.setVelocityX(enemy.speed * enemy.direction)
        })
    }

    mapCreation() {
        // Create a new tilemap game object which uses 16x16 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("Level1", 16, 16, 45, 25);

        this.animatedTiles.init(this.map);

        this.tileset = this.map.addTilesetImage("monochrome_tilemap_packed", "tilemap_packed");
        this.transparentTileset = this.map.addTilesetImage("monochrome_tilemap_transparent_packed", "tilemap_packed2");

        this.blackground = this.map.createLayer("Black", [
            this.tileset,
            this.transparentTileset
        ]);

        this.paralax1 = this.map.createLayer("Paralax", [
            this.tileset,
            this.transparentTileset
        ]);

        this.paralax2 = this.map.createLayer("Paralax 2", [
            this.tileset,
            this.transparentTileset
        ]);

        this.backgroundLayer = this.map.createLayer("Background", [
            this.tileset,
            this.transparentTileset
        ]);

        this.platformLayer = this.map.createLayer("Platforms", [
            this.tileset,
            this.transparentTileset
        ]);

        this.paralax1.setScrollFactor(0.5);
        this.paralax1.setTint(0x66aaff);
        this.paralax1.setAlpha(0.7);        
        this.paralax2.setScrollFactor(0.7);
        this.paralax2.setTint(0x66aaff);
        this.paralax2.setAlpha(0.7);        
        this.cameras.main.setZoom(2);
    }

    wheelCreation() {
        this.wheel = this.add.container(380, 280);

        const tileSize = 16;

        this.wheelTiles = [
            this.add.image(-tileSize/2, -tileSize/2, "tilemap_sheet", 287),
            this.add.image(tileSize/2, -tileSize/2, "tilemap_sheet", 288),
            this.add.image(-tileSize/2, tileSize/2, "tilemap_sheet", 307),
            this.add.image(tileSize/2, tileSize/2, "tilemap_sheet", 308),
        ];

        this.wheel.add(this.wheelTiles);

        this.wheel.add(this.wheelTiles);
        this.wheel.setScrollFactor(0);
    }

    textCreation() {
        //
        // SCORE TEXT
        //
        this.scoreText = this.add.bitmapText(
            365,
            230,
            'kiwiSoda',
            `Diamonds: ${this.SCORE}`,
            16
        );
        this.scoreText.setScrollFactor(0);
        this.scoreText.setDepth(1000);

        //
        // WHEEL SPIN TEXT
        //
        this.spinPrompt = this.add.bitmapText(
            365, 
            245, 
            'kiwiSoda',
            "Press E to spin (1 diamond)", 
            16
        );
        this.spinPrompt.setScrollFactor(0);
    }

    objectHandler() {
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet2",
            frame: 62
        });

        this.door = this.map.createFromObjects("Objects", {
            name: "door",
            key: "tilemap_sheet",
            frame: 56
        });

        this.blocks = this.map.createFromObjects("Objects", {
            name: "block",
            key: "tilemap_sheet",
            frame: 48
        });

        this.physics.world.enable(this.door, Phaser.Physics.Arcade.STATIC_BODY);
        this.doorGroup = this.add.group(this.door);
        
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);

        this.physics.world.enable(this.blocks, Phaser.Physics.Arcade.STATIC_BODY);
        this.blockGroup = this.add.group(this.blocks);

        this.physics.add.overlap(my.sprite.player, this.doorGroup, () => {
            this.bgMusic.stop();
            this.scene.start("casinoScene", {
                diamonds : this.SCORE,
                abilities: this.abilities?.active || {},
                nextScene: 'platformer2Scene'
            });

        });

        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.coinParticles.setPosition(obj2.x, obj2.y);
            this.coinParticles.explode();
            this.SCORE += 1;
            this.sound.play("coin");
            this.scoreText.setText(`Diamonds: ${this.SCORE}`);
        });        

        this.physics.add.collider(my.sprite.player, this.blockGroup, (player, block) => {
            if (player.body.blocked.up) {
                this.breakBlock(block);
                block.destroy();
            }
        });

        /// 
        /// VFX
        ///
        this.coinParticles = this.add.particles(0, 0, "kenny-particles", {
            frame: 'star_08.png',
            speed: {min: 20, max: 50},
            lifespan: 500,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            quantity: 3,
            emitting: false
        });

    }

    soundAndVFX() {
        //
        // SOUND
        //
        this.walkingSound = this.sound.add("footstep", { volume: 0.2 });
        this.gamblingSound = this.sound.add("gambling", { volume: 0.5 });
        this.bgMusic = this.sound.add("lvl1", {volume: 0.3, loop: true});
        this.bgMusic.play();

        //
        // VFX
        //
        // movement vfx
        this.walkingVfx = this.add.particles(0, 0, "kenny-particles", {
            frame: ['smoke_03.png', 'spark_03.png'],
            random: true,
            scale: {start: 0.03, end: 0.1},
            lifespan: 350,
            gravityY: -200,
            alpha: {start: 1, end: 0.1}, 
        });

        this.walkingVfx.startFollow(my.sprite.player, 0, 0, false);
        this.walkingVfx.setParticleSpeed(this.PARTICLE_VELOCITY, 0);
        this.walkingVfx.stop();

        this.jumpVFX = this.add.particles(0, -20, "kenny-particles", {
            frame: ["flare_01.png"],
            scale: {start: 0.6, end: 0.05},
            lifespan: 200,
            alpha: {start: 0.1, end: 0}, 
        });

        this.jumpVFX.stop();
        this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    }

    create() {
        this.mapCreation();

        this.wheelCreation();

        this.textCreation();

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        // Make it collidable
        this.backgroundLayer.setCollisionByProperty({
            collision: true
        });

        // Make one way platforms collidable only on the top side
        this.platformLayer.setCollisionByProperty({
            platform: true
        });

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(
            this.map.tileToWorldX(2),
            this.map.tileToWorldY(19),
            "player_right"
        );
        my.sprite.player.setCollideWorldBounds(true);
        this.cameras.main.setBounds(
            0,
            0,
            this.map.widthInPixels,
            this.map.heightInPixels
        );

        this.cameras.main.startFollow(my.sprite.player, true, 0.1, 0.1);
        this.cameras.main.setDeadzone(80, 60);
        this.cameras.main.roundPixels = true;

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.backgroundLayer);

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        this.abilities = new Abilities(this)
        this.abilities._setupDash()

        this.objectHandler();

        // have the player collide with the platform layer, but only on the top side
        this.physics.add.collider(
            my.sprite.player,
            this.platformLayer,
            null,
            (player, tile) => {
                return player.body.velocity.y > 0 && !cursors.down.isDown;
            }
        );

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        my.sprite.player.setMaxVelocity(200, 1000);

        this.soundAndVFX();

        this.coinFrames = [62, 82];
        this.coinFrameIndex = 0;

        this.time.addEvent({
            delay: 200,
            loop: true,
            callback: () => {

                this.coinFrameIndex = 1 - this.coinFrameIndex; // toggles 0 and 1

                this.coins.forEach(coin => {
                    coin.setFrame(this.coinFrames[this.coinFrameIndex]);
                });

            }
        });

        this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)

        this.createEnemy(1400, 220, 1100, 1800, 80);
    }

    update() {
        this.footstepCooldown -= this.game.loop.delta;

        if (my.sprite.player.y > this.map.heightInPixels - 50 && this.death == false) {
            this.deathAnim();
        }

        this.playerWalking();
        this.playerJumping();
        this.playerCrouching();

        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.trySpinWheel();
        }

        this.abilities.update()

        if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
            this.abilities.activateInvulnerability()
        }

        this.crouch = cursors.down.isDown;

        this.updateEnemies();
    }

    deathAnim() {
        if (this.abilities?.active?.invulnerable) return  // blocked!
        if (this.death) return
        this.death = true

        // Stop player movement
        my.sprite.player.body.setVelocity(0, 0)
        my.sprite.player.body.setAccelerationX(0)
        my.sprite.player.setVisible(false)

        // Camera shake
        this.cameras.main.shake(500, 0.02)
        this.sound.play("death")

        // Big explosion burst
        let explosion = this.add.particles(my.sprite.player.x, my.sprite.player.y, "kenny-particles", {
            frame: ['smoke_03.png', 'spark_03.png', 'star_08.png'],
            speed: { min: 50, max: 200 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            alpha: { start: 1, end: 0 },
            lifespan: { min: 400, max: 800 },
            quantity: 30,
            emitting: false
        })
        explosion.explode(60)

        // Second delayed burst for layered effect
        this.time.delayedCall(200, () => {
            let explosion2 = this.add.particles(my.sprite.player.x, my.sprite.player.y, "kenny-particles", {
                frame: ['muzzle_01.png', 'muzzle_02.png', 'muzzle_03.png'],
                speed: { min: 30, max: 150 },
                angle: { min: 0, max: 360 },
                scale: { start: 0.3, end: 0 },
                lifespan: 500,
                quantity: 20,
                emitting: false
            })
            explosion2.explode(40)
        })

        my.sprite.player.body.destroy();

        // Transition to lose scene after explosion
        this.time.delayedCall(1200, () => {
            this.bgMusic.stop();
            this.scene.start("loseScene")
        })
    }

    playerWalking() {
        const goLeft = this.abilities.isReversed() ? cursors.right.isDown : cursors.left.isDown
        const goRight = this.abilities.isReversed() ? cursors.left.isDown : cursors.right.isDown

        if (!this.crouch) {
            if(goLeft && this.death == false) {
                // TODO: have the player acce
                // this.physics.world.drawDebug = true;
                my.sprite.player.body.setAccelerationX(-this.ACCELERATION);
                my.sprite.player.setFlip(true, false);
                my.sprite.player.anims.play('walk', true);

                if (my.sprite.player.body.blocked.down) {

                    this.walkingVfx.start();

                    if (this.footstepCooldown <= 0) {
                        this.walkingSound.play();
                        this.footstepCooldown = 100; // adjust for speed (ms)
                    }
                }

            } else if(goRight && this.death == false) {
                // TODO: have the player accelerate to the right
                my.sprite.player.body.setAccelerationX(this.ACCELERATION);
                my.sprite.player.resetFlip(true, false);
                my.sprite.player.anims.play('walk', true);

                // Only play smoke effect if touching the ground

                if (my.sprite.player.body.blocked.down) {

                    this.walkingVfx.start();
                    if (this.footstepCooldown <= 0) {
                        this.walkingSound.play();
                        this.footstepCooldown = 100; // adjust for speed (ms)
                    }
                }

            } else {
                // TODO: set acceleration to 0 and have DRAG take over
                my.sprite.player.body.setAccelerationX(0);
                my.sprite.player.body.setDragX(this.DRAG);
                my.sprite.player.anims.play('idle');
                this.walkingVfx.stop();
                this.walkingSound.stop();
            }
        }
    }

    trySpinWheel() {

        if (!this.canSpinWheel) return;
        if (this.spinning) return;
        if (this.SCORE <= 0) return;

        this.spinning = true;

        this.SCORE -= 1;
        this.scoreText.setText(`Diamonds: ${this.SCORE}`);

        // VISUAL FEEDBACK
        this.cameras.main.shake(150, 0.01);

        // wheel spin animation
        // Store original wheel position first (in create() when you make the wheel)
        this.wheelOriginalX = this.wheel.x
        this.wheelOriginalY = this.wheel.y

        // Then in trySpinWheel():
        this.tweens.add({
            targets: this.wheel,
            x: this.cameras.main.width / 2,
            y: this.cameras.main.height / 2,
            scaleX: 3,
            scaleY: 3,
            angle: "+=360*8",
            duration: 1500,
            ease: "Cubic.easeOut",
            onComplete: () => {
                // Shrink back to original position
                this.tweens.add({
                    targets: this.wheel,
                    x: this.wheelOriginalX,
                    y: this.wheelOriginalY,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 600,
                    ease: 'Back.easeIn',
                    onComplete: () => {
                        this.finishWheelSpin()
                    }
                })
            }
        })

        this.canSpinWheel = false;

        this.gamblingSound.play();
    }

    playerCrouching() {
        if (cursors.down.isDown) {
            my.sprite.player.anims.play('crouch');
            my.sprite.player.body.setAccelerationX(0);
            my.sprite.player.body.setDragX(this.DRAG);
            my.sprite.player.body.setSize(
                my.sprite.player.width,
                my.sprite.player.height / 2,
                true
            );
            my.sprite.player.body.setOffset(0, my.sprite.player.height / 2);

            this.walkingVfx.stop();
        } else {
            my.sprite.player.body.setSize(
                my.sprite.player.width,
                my.sprite.player.height,
            true
            );
            my.sprite.player.body.setOffset(0, 0);
        }
    }

    playerJumping() {
        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        // reset when grounded
        const isGrounded = my.sprite.player.body.blocked.down;
        const justPressedJump = Phaser.Input.Keyboard.JustDown(this.jumpKey);

        // reset jumps when on ground
        if (isGrounded) {
            this.jumpsLeft = this.maxJumps;
        }
        if (!isGrounded) {
            my.sprite.player.anims.play('jump');
            this.walkingVfx.stop();
        }

        // jump handling
        if (justPressedJump && this.death == false) {

            if (this.jumpsLeft > 0) {

                my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
                this.jumpsLeft--;
                this.abilities.onJump()  // fart jump

                // spawn jump particles on player's feet
                this.jumpVFX.setPosition(my.sprite.player.x, my.sprite.player.y);
                this.jumpVFX.explode(8);
                this.sound.play("jump", {volume: 0.2});
            }
        }
    }

    finishWheelSpin() {
        this.spinning = false
        this.canSpinWheel = true

        // Higher weight = more likely to appear
        const weightedAbilities = [
            { name: 'blank',            weight: 100},
            { name: 'doubleJump',       weight: 15 },
            { name: 'magnet',           weight: 15 },
            { name: 'fartJump',         weight: 15 },
            { name: 'dash',             weight: 12 },
            { name: 'iceSkates',        weight: 10 },
            { name: 'reverseControls',  weight: 10 },
            { name: 'invulnerability',  weight: 10 },
            { name: 'diceShot',         weight: 8  },
            { name: 'bankrupt',         weight: 5  },
        ]

        // Calculate total weight
        const totalWeight = weightedAbilities.reduce((sum, a) => sum + a.weight, 0)

        // Pick random number and walk down the list
        let roll = Phaser.Math.Between(1, totalWeight)
        let picked = weightedAbilities[0].name

        for (const ability of weightedAbilities) {
            roll -= ability.weight
            if (roll <= 0) {
                picked = ability.name
                break
            }
        }

        this.abilities.apply(picked)
    }

    breakBlock(block) {
        const numPieces = 6;
        this.sound.play("block");
        this.cameras.main.shake(50, 0.01)

        for (let i = 0; i < numPieces; i++) {
            let piece = this.add.sprite(block.x, block.y, "tilemap_sheet", 48);
            piece.setScale(0.5);

            let angle = (i / numPieces) * Math.PI * 2;
            let speed = Phaser.Math.Between(60, 140);
            let vx = Math.cos(angle) * speed;
            let vy = Math.sin(angle) * speed;

            this.tweens.add({
                targets: piece,
                x: piece.x + vx,
                y: piece.y + vy,
                alpha: 0,
                scale: Phaser.Math.FloatBetween(0.1, 0.3),
                angle: Phaser.Math.Between(-180, 180),
                duration: Phaser.Math.Between(300, 500),
                ease: 'Power2',
                onComplete: () => piece.destroy()
            });
        }

        // Spawn diamond pickup
        let diamond = this.physics.add.sprite(block.x, block.y, "tilemap_sheet2", 62);
        this.physics.add.collider(diamond, this.backgroundLayer);
        this.physics.add.collider(diamond, this.platformLayer);
        diamond.body.setAllowGravity(true);
        diamond.body.setVelocityY(-500);
        diamond.body.setBounce(0.7);

        this.physics.add.overlap(my.sprite.player, diamond, (p, d) => {
            d.destroy();
            this.SCORE += 1;
            this.sound.play("coin");
            this.coinParticles.setPosition(d.x, d.y);
            this.coinParticles.explode();
            this.scoreText.setText(`Diamonds: ${this.SCORE}`);
        });

        this.time.delayedCall(5000, () => { if (diamond.active) diamond.destroy(); });
    }
}

