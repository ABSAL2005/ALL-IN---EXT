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
                //s.sound.play('yayyy')
                s.maxJumps = 2
                this._showText('DOUBLE JUMP!')
                break

            case 'magnet':
                //s.sound.play('yayyy')
                this.active.magnet = true
                this._showText('MAGNET!')
                break

            case 'invulnerability':
                //s.sound.play('yayyy')
                if (this.cooldowns.invulnerability) return
                this.active.invulnerable = true
                this.cooldowns.invulnerability = true
                this._showText('INVULNERABLE!')
                player.setTint(0xffdd00)
                s.time.delayedCall(5000, () => {
                    this.active.invulnerable = false
                    player.clearTint()
                })
                s.time.delayedCall(30000, () => {
                    this.cooldowns.invulnerability = false
                })
                break

            case 'dash':
                //s.sound.play('yayyy')
                this.canDash = true
                this._showText('DASH! (>>/<<)')
                break

            case 'diceShot':
                //s.sound.play('yayyy')
                this.active.canDiceShot = true
                this._showText('DICE SHOT! (Z)')
                this._setupDiceShot()
                break

            case 'fartJump':
                //s.sound.play('yayyy')
                this.active.fartJump = true
                this._showText('FART JUMP!')
                break

            case 'iceSkates':
                //s.sound.play('yayyy')
                this.active.iceSkates = true
                s.DRAG = 100  // very slippery
                this._showText('ICE SKATES!')
                break

            case 'reverseControls':
                //s.sound.play('awww')
                this.active.reverseControls = true
                this._showText('REVERSED!')
                break

            case 'bankrupt':
                //s.sound.play('awww')
                s.SCORE = 0
                s.scoreText.setText(`Diamonds: 0`)
                this._showText('BANKRUPT!')
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
            this.scene.sound.play('fart', { volume: 0.4 })
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