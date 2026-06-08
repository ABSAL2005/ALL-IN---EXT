class Abilities {
    constructor(scene) {
        this.scene = scene
        this.active = {}  // currently active abilities
        this.cooldowns = {}
    }

    apply(abilityName) {
        const s = this.scene
        const player = my.sprite.player

        switch(abilityName) {

            case 'doubleJump':
                s.sound.play('yay')
                this.active.doubleJump = true
                s.maxJumps = 2
                this._showText('DOUBLE JUMP!')
                break

            case 'magnet':
                s.sound.play('yay')
                this.active.magnet = true
                this._showText('MAGNET!')
                break

            case 'invulnerability':
                s.sound.play('yay')
                this.active.invulnerabilityCharges = (this.active.invulnerabilityCharges || 0) + 1
                this._showText(`INVULNERABILITY x${this.active.invulnerabilityCharges}! (X)`)
                break

            case 'dash':
                s.sound.play('yay')
                this.active.canDash = true
                this.canDash = true
                this._showText('BLINK! (>>/<<)')
                break

            case 'diceShot':
                s.sound.play('yay')
                this.active.canDiceShot = true
                this._showText('DICE SHOT! (Z)')
                this._setupDiceShot()
                break

            case 'fartJump':
                s.sound.play('aw')
                this.active.fartJump = true
                this._showText('FART JUMP!')
                break

            case 'iceSkates':
                s.sound.play('aw')
                this.active.iceSkates = true
                s.DRAG = 100  // very slippery
                this._showText('ICE SKATES!')
                break

            case 'reverseControls':
                s.sound.play('aw')
                this.active.reverseControls = true
                this._showText('REVERSED!')
                break

            case 'bankrupt':
                s.sound.play('aw')
                s.SCORE = 0
                s.scoreText.setText(`Diamonds: 0`)
                this._showText('BANKRUPT!')
                break

            case 'blank':
                s.sound.play('aw')
                this._showText('BLANKED!')
                break
        }
    }

    // Call in update() to handle magnet pull
    update() {
        const s = this.scene
        const player = my.sprite.player

        if (this.active.magnet && s.coinGroup) {
            s.coinGroup.getChildren().forEach(coin => {
                const dist = Phaser.Math.Distance.Between(player.x, player.y, coin.x, coin.y)
                if (dist < 80) {
                    const angle = Phaser.Math.Angle.Between(coin.x, coin.y, player.x, player.y)
                    coin.x += Math.cos(angle) * 3
                    coin.y += Math.sin(angle) * 3

                    // Collect when close enough
                    if (dist < 8) {
                        coin.destroy()
                        s.SCORE += 1
                        s.scoreText.setText(`Diamonds: ${s.SCORE}`)
                    }
                }
            })
        }
    }

    // Call from playerJumping() when a jump happens
    onJump() {
        if (this.active.fartJump) {
            this.scene.sound.play('fart', { volume: 0.8, rate: 1.5 })
        }
    }

    // Call from playerWalking() to check reverse
    isReversed() {
        return this.active.reverseControls === true
    }

    // Dash — call from update() on double-tap detection
    _setupDash() {
        let lastLeft = 0, lastRight = 0
        const dash = (dir) => {
            if (!this.canDash) return
            if (this.cooldowns.dash) return
            const player = my.sprite.player

            player.setMaxVelocity(900, 1000)  // lift cap for dash
            player.body.setVelocityX(dir * 900)

            this.cooldowns.dash = true
            this.scene.time.delayedCall(200, () => {
                player.setMaxVelocity(200, 1000)  // restore cap
            })
            this.scene.time.delayedCall(1000, () => {
                this.cooldowns.dash = false
            })
        }

        this.scene.input.keyboard.on('keydown-LEFT', () => {
            const now = this.scene.time.now
            if (now - lastLeft < 200) dash(-1)
            lastLeft = now
        })
        this.scene.input.keyboard.on('keydown-RIGHT', () => {
            const now = this.scene.time.now
            if (now - lastRight < 200) dash(1)
            lastRight = now
        })
    }

    _setupDiceShot() {
        this.scene.input.keyboard.on('keydown-Z', () => {
            if (!this.active.canDiceShot) return
            if (this.cooldowns.diceShot) return

            const player = my.sprite.player
            const facingRight = !player.flipX
            const dice = this.scene.physics.add.sprite(player.x, player.y, 'dice_throw')
            dice.body.setAllowGravity(false)
            dice.setVelocityX(facingRight ? 300 : -300)

            this.scene.sound.play("dice", {rate: 2})

            // Kill enemies on hit
            if (this.scene.enemies) {
                this.scene.enemies.forEach(enemy => {
                    this.scene.physics.add.overlap(dice, enemy, () => {
                        if (dice.active) dice.destroy()
                        if (enemy.active) this.scene.killEnemy(enemy, false)
                    })
                })
            }

            // Hurt boss on hit
            if (this.scene.boss) {
                this.scene.physics.add.overlap(
                    dice,
                    this.scene.boss,
                    () => {
                        if (!dice.active || !this.scene.boss.active) return

                        dice.destroy()

                        // only works if boss is stunned because of takeDamage()
                        this.scene.boss.takeDamage()
                    }
                )
            }

            // Destroy dice on hitting ground layer
            this.scene.physics.add.collider(dice, this.scene.groundLayer, () => {
                dice.destroy()
            })

            // Destroy after 2 seconds
            this.scene.time.delayedCall(2000, () => { if (dice.active) dice.destroy() })

            this.cooldowns.diceShot = true
            this.scene.time.delayedCall(500, () => { this.cooldowns.diceShot = false })
        })
    }

    activateInvulnerability() {
        if (!this.active.invulnerabilityCharges || this.active.invulnerabilityCharges <= 0) return
        if (this.active.invulnerable) return  // already active, don't stack duration

        this.active.invulnerabilityCharges -= 1
        this.active.invulnerable = true

        const player = my.sprite.player
        player.setTint(0xffdd00)
        this._showText(`INVULNERABLE! (${this.active.invulnerabilityCharges} left)`)

        // Flash the player repeatedly for 3 seconds
        let flashes = 0
        const flashEvent = this.scene.time.addEvent({
            delay: 150,
            loop: true,
            callback: () => {
                flashes++
                player.setAlpha(flashes % 2 === 0 ? 1 : 0.3)
                player.setTint(flashes % 2 === 0 ? 0xffffff : 0xffdd00)
            }
        })

        this.scene.time.delayedCall(5000, () => {
            this.active.invulnerable = false
            flashEvent.remove()
            player.setAlpha(1)
            player.clearTint()
        })
    }

    _showText(msg) {
        const s = this.scene
        const text = s.add.bitmapText(
            s.centerX, s.centerY - 20,
            'kiwiSoda', msg, 30
        ).setScrollFactor(0).setOrigin(0.5).setDepth(2000)

        s.tweens.add({
            targets: text,
            y: s.centerY - 50,
            alpha: 0,
            duration: 1800,
            onComplete: () => text.destroy()
        })
    }
}