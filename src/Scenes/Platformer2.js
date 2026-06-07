class Platformer2 extends Phaser.Scene {
    constructor() {
        super("platformer2Scene");

        this.eKey = null;
        this.jumpKey = null;
    }

    preload() {
        this.load.scenePlugin('AnimatedTiles', './lib/AnimatedTiles.js', 'animatedTiles', 'animatedTiles');
    }

    init(data) {
        // variables and settings
        this.ACCELERATION = 800;
        this.DRAG = 1100;    // DRAG < ACCELERATION = icy slide
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.incomingAbilities = data?.abilities || {}
        this.SCORE = data?.diamonds
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
        this.canDash = false;
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

    killEnemy(enemy, bounce = true) {
        this.enemies = this.enemies.filter(e => e !== enemy)
        if (bounce) {
            my.sprite.player.body.setVelocityY(-400);
        }
        enemy.body.enable = false

        this.tweens.add({
            targets: enemy,
            scaleX: 1.5,
            scaleY: 0,
            y: enemy.y + 8,
            duration: 400,
            onComplete: () => {
                enemy.destroy()
                let diamond = this.physics.add.sprite(enemy.x, enemy.y, "tilemap_sheet2", 62)
                this.physics.add.collider(diamond, this.groundLayer)
                diamond.body.setAllowGravity(true)
                diamond.body.setVelocityY(-300)
                diamond.body.setBounce(0.5)
                this.physics.add.overlap(my.sprite.player, diamond, (p, d) => {
                    d.destroy()
                    this.SCORE += 1
                    this.scoreText.setText(`Diamonds: ${this.SCORE}`)
                })
                this.time.delayedCall(5000, () => { if (diamond.active) diamond.destroy() })
            }
        })
    }

    setPlayer() {
        // set up player avatar
        my.sprite.player = this.physics.add.sprite(
            this.map.tileToWorldX(2),
            this.map.tileToWorldY(77),
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
        my.sprite.player.setMaxVelocity(200, 1000);
    }

    mapCreation() {
        // Create a new tilemap game object which uses 16x16 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("Level2", 16, 16, 45, 25);

        this.animatedTiles.init(this.map);

        this.tileset = this.map.addTilesetImage("monochrome_tilemap_packed", "tilemap_packed");
        this.transparentTileset = this.map.addTilesetImage("monochrome_tilemap_transparent_packed", "tilemap_packed2");

        this.blackground = this.map.createLayer("Blackground", [
            this.tileset,
            this.transparentTileset
        ]);

        this.parallax = this.map.createLayer("Parallax", [
            this.tileset,
            this.transparentTileset
        ]);

        this.background = this.map.createLayer("Background", [
            this.tileset,
            this.transparentTileset
        ]);

        this.groundLayer = this.map.createLayer("Ground", [
            this.tileset,
            this.transparentTileset
        ]);

        this.platformLayer = this.map.createLayer("Platforms", [
            this.tileset,
            this.transparentTileset
        ]);

        this.parallax.setScrollFactor(0.6);
        this.parallax.setTint(0x66aaff);
        this.parallax.setAlpha(0.7);        
        this.cameras.main.setZoom(2);
    }

    collisionHandler() {
        this.groundLayer.setCollisionByProperty({
            collision: true
        });

        this.groundLayer.setCollisionByProperty({ 
            spring: true 
        });

        this.groundLayer.setCollisionByProperty({ 
            death: true 
        });

        this.platformLayer.setCollisionByProperty({
            oneway: true
        });

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer, (player, tile) => {
            if (tile.properties && tile.properties.spring) {
                if (cursors.down.isDown) {
                    player.body.setVelocityY(-1000);  // stronger jump if holding down
                } else {
                    player.body.setVelocityY(-750);  // adjust launch strength
                }
            }
            if (tile.properties && tile.properties.spring2) {
                my.sprite.player.setMaxVelocity(2000, 1000);
                player.body.setVelocityX(15000);  // adjust launch strength
                player.body.setDragX(1000)
            } else {
                my.sprite.player.setMaxVelocity(200, 1000);
            }
            if (tile.properties && tile.properties.death) {
                this.deathAnim();
            }
        });

        this.physics.add.collider(
            my.sprite.player, 
            this.platformLayer,
            null,
            (player, tile) => {
                // return true = collide, false = pass through
                if (tile.properties && tile.properties.oneway) {
                    return player.body.velocity.y > 0 && !cursors.down.isDown;
                }
                return true;
            },
            this
        );
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

            this.scene.start("casinoScene", {
                diamonds : this.SCORE,
                abilities: this.abilities?.active || {},
                nextScene: 'bossBattle'
            });

        });

        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            coinParticles.setPosition(obj2.x, obj2.y);
            coinParticles.explode();
            this.SCORE += 1;
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
        let coinParticles = this.add.particles(0, 0, "kenny-particles", {
            frame: 'star_08.png',
            speed: {min: 20, max: 50},
            lifespan: 500,
            scale: { start: 0.2, end: 0 },
            blendMode: 'ADD',
            quantity: 3,
            emitting: false
        });

        ///
        /// COIN ANIMATION
        ///
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

    soundAndVFX() {
        //
        // SOUND
        //
        this.walkingSound = this.sound.add("footstep", { volume: 0.2 });
        this.gamblingSound = this.sound.add("gambling", { volume: 0.5 });

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

    fanSetup() {
        // Store fan tile positions for update loop to check
        this.fanTiles = []
        this.groundLayer.forEachTile(tile => {
            if (!tile.properties || !tile.properties.fan) return
            this.fanTiles.push({
                x: tile.getCenterX(),
                y: tile.getCenterY()
            })
        })
        this.fan2Tiles = []
        this.groundLayer.forEachTile(tile => {
            if (!tile.properties || !tile.properties.fan2) return
            this.fan2Tiles.push({
                x: tile.getCenterX(),
                y: tile.getCenterY()
            })
        })

    }

    create() {
        this.mapCreation();
        this.wheelCreation();
        this.textCreation();
        this.setPlayer();
        this.abilities = new Abilities(this)
        this.abilities._setupDash()

        // Restore abilities from previous scene
        Object.assign(this.abilities.active, this.incomingAbilities)
        if (this.abilities.active.canDash) this.abilities.canDash = true

        this.collisionHandler();
        this.fanSetup();

        this.createEnemy(488, 656, 100, 488, 90)
        this.createEnemy(1320, 456, 1064, 1320, 90)
        this.createEnemy(1736, 350, 1400, 1736, 80)
        this.createEnemy(1128, 936, 1150, 1570, 120)

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
        this.xKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        cursors = this.input.keyboard.createCursorKeys();

        this.objectHandler();
        this.soundAndVFX();

        this.debugText = this.add.bitmapText(365, 260, 'kiwiSoda', '', 16)
            .setScrollFactor(0)
            .setDepth(2000)

    }

    update() {
        this.debugText.setText(`x:${Math.floor(my.sprite.player.x)} y:${Math.floor(my.sprite.player.y)}`)

        // Check if player is in any fan wind zone
        let inWind = false
        for (const fan of this.fanTiles) {
            const dx = my.sprite.player.x - fan.x  // positive = player is to the right
            const dy = Math.abs(my.sprite.player.y - fan.y)
            if (dx > 0 && dx < 150 && dy < 12) {  // within 150px to the right, same height
                inWind = true
                break
            }
        }

        this.inWind = inWind  // store for playerWalking to use

        let inWind2 = false
        for (const fan2 of this.fan2Tiles) {
            const dx = Math.abs(my.sprite.player.x - fan2.x)
            const dy = my.sprite.player.y - fan2.y  // positive = player is below fan
            if (dx < 12 && dy < 0 && dy > -150) {  // within 150px above fan
                inWind2 = true
                break
            }
        }

        if (inWind2) {
            my.sprite.player.body.setVelocityY(-600)
        } else {
            my.sprite.player.body.setAccelerationY(0)
        }


        this.footstepCooldown -= this.game.loop.delta;

        if (my.sprite.player.y > this.map.heightInPixels - 50 && this.death == false) {
            this.death = true;
            this.deathAnim();
        }

        this.abilities.update()

        this.playerWalking();
        this.playerJumping();
        this.playerCrouching();

        // Apply fan wind on top of player movement
        if (this.inWind) {
            my.sprite.player.body.acceleration.x += 100  // push right, adjust strength
        }

        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.trySpinWheel();
        }

        if (Phaser.Input.Keyboard.JustDown(this.xKey)) {
            this.abilities.activateInvulnerability()
        }

        this.crouch = cursors.down.isDown;
        this.updateEnemies()
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
        this.tweens.add({
            targets: this.wheel,
            angle: "360*3",
            duration: 1400,
            ease: "Cubic.easeOut",
            onComplete: () => {
                this.finishWheelSpin();
            }
        });

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
            }
        }
    }

    finishWheelSpin() {
        this.spinning = false
        this.canSpinWheel = true

        // Higher weight = more likely to appear
        const weightedAbilities = [
            { name: 'blank',       weight: 130 },
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
            this.scoreText.setText(`Diamonds: ${this.SCORE}`);
        });

        this.time.delayedCall(5000, () => { if (diamond.active) diamond.destroy(); });
    }
}
