class BossBattle extends Phaser.Scene {
    constructor() {
        super("bossBattle");

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
    }

    setPlayer() {
        // set up player avatar
        my.sprite.player = this.physics.add.sprite(
            this.map.tileToWorldX(2),
            this.map.tileToWorldY(25),
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
        // 50 tiles wide and 20 tiles tall.
        this.map = this.add.tilemap("Level3", 16, 16, 50, 30);

        this.animatedTiles.init(this.map);

        this.tileset = this.map.addTilesetImage("monochrome_tilemap_packed", "tilemap_packed");
        this.transparentTileset = this.map.addTilesetImage("monochrome_tilemap_transparent_packed", "tilemap_packed2");

        this.blackground = this.map.createLayer("Blackground", [
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

        this.Parallax = this.map.createLayer("Parallax", [
            this.tileset,
            this.transparentTileset
        ]);

        this.Parallax2 = this.map.createLayer("Parallax2", [
            this.tileset,
            this.transparentTileset
        ]);

        this.breakableTiles = []
        this.platformLayer.forEachTile(tile => {
            if (tile.properties && tile.properties.breakable) {
                this.breakableTiles.push({
                    x: tile.x,
                    y: tile.y,
                    index: tile.index
                })
            }
        })

        this.Parallax.setScrollFactor(0.3);
        this.Parallax2.setScrollFactor(0.5);

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
            fan: true 
        });

        this.platformLayer.setCollisionByProperty({
            collision: true
        });

        this.platformLayer.setCollisionByProperty({
            oneway: true
        });

        this.platformLayer.setCollisionByProperty({
            breakable: true
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
        
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.coinGroup = this.add.group(this.coins);

        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            coinParticles.setPosition(obj2.x, obj2.y);
            coinParticles.explode();
            this.SCORE += 1;
            this.scoreText.setText(`Diamonds: ${this.SCORE}`);
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
            quantity: 1,
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
            scale: {start: 1, end: 0.05},
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
    }

    bossSetup() {
        // Spawn boss — adjust x/y to where you want it to start
        this.boss = new Boss(this, 9, 1);

        // Cards hit player → death
        this.physics.add.overlap(my.sprite.player, this.boss.cards, (player, card) => {
            card.destroy();
            if (this.death == false) {
                this.deathAnim();
            }
        });

        // Cards break breakable tiles, pass through everything else
        this.physics.add.collider(
            this.boss.cards,
            this.platformLayer,
            (card, tile) => {
                card.destroy()
                const tileX = tile.x
                const tileY = tile.y
                const tileIndex = tile.index
                this.platformLayer.removeTileAt(tileX, tileY)

                // Respawn after 20 seconds
                this.time.delayedCall(20000, () => {
                    const newTile = this.platformLayer.putTileAt(tileIndex, tileX, tileY)
                    newTile.setCollision(true)
                    newTile.properties = { ...newTile.properties, breakable: true }
                })
            },
            (card, tile) => {
                return tile.properties && tile.properties.breakable
            },
            this
        )

        // boss collides with ground so it doesn't fall through
        this.physics.add.collider(this.boss, this.groundLayer);

        this.physics.add.overlap(my.sprite.player, this.boss, (player, boss) => {
            // Only damage boss if player is falling onto it (stomping)
            if (my.sprite.player.body.velocity.y > 0 && boss.isStunned) {
                boss.takeDamage();
                my.sprite.player.body.setVelocityY(-500); // bounce off
            }
        });
    }

    updateBossStateLabel(stateName) {
        console.log("Boss state:", stateName);
    }

    create() {
        cursors = this.input.keyboard.createCursorKeys();

        this.mapCreation();
        this.wheelCreation();
        this.textCreation();
        this.setPlayer();
        this.collisionHandler();
        this.fanSetup();
        this.bossSetup();
        this.updateBossStateLabel();

        this.physics.world.TILE_BIAS = 17;

        this.eKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

        this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

        this.objectHandler();
        this.soundAndVFX();
    }

    update() {
        // Check if player is in any fan wind zone
        let inWind = false
        for (const fan of this.fanTiles) {
            const dx = Math.abs(my.sprite.player.x - fan.x)
            const dy = my.sprite.player.y - fan.y  // positive = player is below fan
            if (dx < 12 && dy < 0 && dy > -150) {  // within 150px above fan
                inWind = true
                break
            }
        }

        if (inWind) {
            my.sprite.player.body.setVelocityY(-600)
        } else {
            my.sprite.player.body.setAccelerationY(0)
        }

        this.footstepCooldown -= this.game.loop.delta;

        this.playerWalking();
        this.playerJumping();
        this.playerCrouching();

        if (Phaser.Input.Keyboard.JustDown(this.eKey)) {
            this.trySpinWheel();
        }

        this.crouch = cursors.down.isDown;

        // Boss update
        if (this.boss) {
            this.boss.update(this.time, this.game.loop.delta);
        }
    }

    deathAnim() {
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

        // Transition to lose scene after explosion
        this.time.delayedCall(1200, () => {
            this.scene.start("loseScene")
        })
    }

    playerWalking() {
        if (!this.crouch) {
            if(cursors.left.isDown && this.death == false) {
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

            } else if(cursors.right.isDown && this.death == false) {
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

                // spawn jump particles on player's feet
                this.jumpVFX.setPosition(my.sprite.player.x, my.sprite.player.y);
                this.jumpVFX.explode(8);
            }
        }
    }

    finishWheelSpin() {

        this.spinning = false;

        let result = Phaser.Math.Between(1, 1);

        if (result === 1 && this.maxJumps === 1) {

            this.maxJumps = 2;

            let doubleJumpText = this.add.bitmapText(
                this.centerX, 
                this.centerY, 
                'kiwiSoda',
                "DOUBLE JUMP!",
                30
            ).setScrollFactor(0);
            this.time.delayedCall(1800, () => {
                //remove text after delay
                doubleJumpText.destroy();
            });
        } else {

            let noUpgradeText = this.add.bitmapText(
                this.centerX, 
                this.centerY, 
                'kiwiSoda',
                "NO UPGRADE",
                30
            ).setScrollFactor(0);
            this.time.delayedCall(1800, () => {
                //remove text after delay
                noUpgradeText.destroy();
            });
        }
    }
}
