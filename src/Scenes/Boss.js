class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'boss_idle')
        scene.add.existing(this)
        scene.physics.add.existing(this)
        this.setScale(1.2)
        this.setImmovable(true)
        this.body.setAllowGravity(false)

        this.maxHP = 5
        this.hp = this.maxHP

        this.cards = scene.physics.add.group()

        this._moveMode = null
        this._pathT = 0
        this._attackTimer = null
        this._stunTimer = null
        this._stunCooldown = 0  // tracks time since last stun
        this.isStunned = false
        this._invulnerable = false

        // Stun platform positions (adjust to match your map's top platforms)
        this.stunPositions = [
            { x: 150, y: 100 },   // left top platform
            { x: 650, y: 100 },   // right top platform
        ]

        this.stateMachine = new StateMachine(this._buildStates())
        this._applyState()

        // Stun cycle — every 45 seconds
        this._scheduleStun()
    }

    _buildStates() {
        return [
            {
                name: 'dealer',          // State 1: fan shots + teleport
                initial: true,
                moveFn: this._moveTeleport.bind(this),
                attackFn: this._fireFanCards.bind(this),
                attackInterval: 2200,
                events: {
                    toRigged: 'rigged',
                    toAllIn: 'all_in',
                    toStun: 'stunned',
                    toDeath: 'death'
                }
            },
            {
                name: 'rigged',          // State 2: rapid single cards in arc sweep
                moveFn: this._moveSweep.bind(this),
                attackFn: this._fireArcSweep.bind(this),
                attackInterval: 400,
                events: {
                    toAllIn: 'all_in',
                    toStun: 'stunned',
                    toDeath: 'death'
                }
            },
            {
                name: 'all_in',          // State 3: card rain from above
                moveFn: this._moveHover.bind(this),
                attackFn: this._fireCardRain.bind(this),
                attackInterval: 150,
                events: {
                    toStun: 'stunned',
                    toDeath: 'death'
                }
            },
            {
                name: 'stunned',
                moveFn: null,
                attackFn: null,
                attackInterval: 0,
                events: {
                    stunEnd: 'dealer',   // returns to current phase after stun
                    toDeath: 'death'
                }
            },
            {
                name: 'death',
                moveFn: null,
                attackFn: null,
                attackInterval: 0,
            }
        ]
    }

    _applyState() {
        this.scene.tweens.killTweensOf(this)
        if (this._attackTimer) {
            this._attackTimer.remove(false)
            this._attackTimer = null
        }
        this._moveMode = null

        const state = this.stateMachine.getState()

        if (state.name === 'death') {
            this._doDeath()
            return
        }

        if (state.name === 'stunned') {
            this._doStun()
            return
        }

        if (state.moveFn) state.moveFn()
        if (state.attackFn) {
            // Delay the first shot so the scene finishes setting up first
            this._attackTimer = this.scene.time.addEvent({
                delay: state.attackInterval,
                callback: state.attackFn,
                loop: true
            })
        }

        // Play flying anim when active
        this.setTexture('boss_flying')
        this.scene.updateBossStateLabel?.(state.name)
    }

    // ─── Movement ────────────────────────────────────────────────

    _moveTeleport() {
        this._moveMode = 'teleport'
        this._teleportEvent = this.scene.time.addEvent({
            delay: 1800,
            loop: true,
            callback: () => {
                if (this._moveMode !== 'teleport') return

                // Use your map's pixel width/height instead of hardcoded 720
                const maxX = this.scene.map.widthInPixels - 20
                const targetX = Phaser.Math.Between(20, maxX)
                const targetY = Phaser.Math.Between(30, 100)  // keep near top

                this.scene.tweens.add({
                    targets: this,
                    duration: 150,
                    onComplete: () => {
                        this.setPosition(targetX, targetY)
                        this.scene.tweens.add({
                            targets: this,
                            duration: 150
                        })
                    }
                })
            }
        })
    }

    _moveSweep() {
        // Slow horizontal sweep across the arena
        this.scene.tweens.add({
            targets: this,
            x: { from: 80, to: 720 },
            y: { from: 1, to: 4 },
            duration: 2000,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        })
    }

    _moveHover() {
        // Hovers in place, slight bob
        this.scene.tweens.add({
            targets: this,
            y: this.y + 15,
            duration: 800,
            ease: 'Sine.InOut',
            yoyo: true,
            repeat: -1
        })
    }

    // ─── Attacks ─────────────────────────────────────────────────

    // State 1: Fan of 3 — middle tracks player, sides track after 1 second
    _fireFanCards() {
        const player = my.sprite.player
        if (!player || !player.active) return

        const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y)
        const spread = Phaser.Math.DegToRad(25)
        const speed = 220
        const offsets = [-spread, 0, spread]

        for (let i = 0; i < offsets.length; i++) {
            const angle = baseAngle + offsets[i]
            const card = this.cards.create(this.x, this.y + 20, 'card_throw')
            
            if (!card) continue  // safety check if group fails to create

            card.setScale(0.9)
            card.body.setAllowGravity(false)  // cards shouldn't fall either
            card.setVelocity(
                Math.cos(angle) * speed,
                Math.sin(angle) * speed
            )
            card.setAngle(Phaser.Math.RadToDeg(angle) + 90)

            // Side cards home in after 1 second
            if (i !== 1) {
                const capturedCard = card
                this.scene.time.delayedCall(1000, () => {
                    if (!capturedCard.active || !player.active) return
                    const newAngle = Phaser.Math.Angle.Between(
                        capturedCard.x, capturedCard.y, player.x, player.y
                    )
                    capturedCard.setVelocity(
                        Math.cos(newAngle) * speed * 1.3,
                        Math.sin(newAngle) * speed * 1.3
                    )
                    capturedCard.setAngle(Phaser.Math.RadToDeg(newAngle) + 90)
                })
            }
        }

        this._autoExpireCards(3000)
    }

    // State 2: Arc sweep — fires cards in a rotating arc pattern
    _arcIndex = 0
    _fireArcSweep() {
        const speed = 300
        const angle = Phaser.Math.DegToRad(this._arcIndex * 20)  // steps through arc
        this._arcIndex = (this._arcIndex + 1) % 18

        const card = this.cards.create(this.x, this.y + 20, 'card_throw')
        card.setScale(0.85)
        card.setVelocity(
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        )
        card.setAngle(Phaser.Math.RadToDeg(angle) + 90)

        this._autoExpireCards(2500)
    }

    // State 3: Card rain — cards drop from random X positions above screen
    _fireCardRain() {
        const maxX = this.scene.map.widthInPixels - 20
        const x = Phaser.Math.Between(20, maxX)
        const card = this.cards.create(x, -20, 'card_throw')
        card.setScale(0.9)
        card.setVelocityY(Phaser.Math.Between(200, 350))
        card.setAngle(Phaser.Math.Between(0, 360))
        this._autoExpireCards(4000)
    }

    _autoExpireCards(ttl) {
        this.scene.time.delayedCall(ttl, () => {
            this.cards.getChildren().forEach(c => {
                if (c.active && c.y > this.scene.map?.heightInPixels + 50) {
                    c.destroy()
                }
            })
        })
    }

    // ─── Stun ─────────────────────────────────────────────────────

    _scheduleStun() {
        this.scene.time.addEvent({
            delay: 20000,
            loop: true,
            callback: () => {
                const state = this.stateMachine.getState()
                if (state.name === 'death' || state.name === 'stunned') return
                this._preStunState = state.name  // remember where to return
                this.stateMachine.consumeEvent('toStun')
                this._applyState()
            }
        })
    }

    _doStun() {
        this.isStunned = true
        this.cards.clear(true, true)

        // Pick a random stun platform
        const pos = Phaser.Utils.Array.GetRandom(this.stunPositions)

        // Fly to platform visually
        this.scene.tweens.add({
            targets: this,
            x: pos.x,
            y: pos.y,
            duration: 600,
            ease: 'Quad.Out',
            onComplete: () => {
                this.setTexture('boss_idle')

                // End stun after 3.5 seconds
                this._stunTimer = this.scene.time.delayedCall(3500, () => {
                    this._endStun()
                })
            }
        })
    }

    _endStun() {
        this.isStunned = false
        if (this._stunLabel) {
            this._stunLabel.destroy()
            this._stunLabel = null
        }
        this.stateMachine.consumeEvent('stunEnd')

        // Re-check HP thresholds so it resumes correct phase
        this._checkHPThresholds()
        this._applyState()
    }

    // ─── Damage ───────────────────────────────────────────────────

    takeDamage(amount) {
        const state = this.stateMachine.getState()
        if (state.name === 'death') return
        if (this._invulnerable) return
        if (state.name !== 'stunned') return  // can ONLY be hit during stun

        this._flashHurt()
        this._invulnerable = true
        this.scene.time.delayedCall(800, () => { this._invulnerable = false })

        // Cancel stun timer and end stun immediately
        if (this._stunTimer) { this._stunTimer.remove(false); this._stunTimer = null }

        this.hp -= 1

        if (this.hp <= 0) {
            this.stateMachine.consumeEvent('toDeath')
            this._applyState()
            return
        }

        // Each hit advances one phase
        this._endStun()
    }

    _checkHPThresholds() {
        if (this.hp == 3) this.stateMachine.consumeEvent('toRigged')
        if (this.hp < 3) this.stateMachine.consumeEvent('toAllIn')
    }

    _flashHurt() {
        if (this._flashing) return
        this._flashing = true

        let blinks = 0
        const blinkCount = 4

        const blink = () => {
            if (!this.active) { this._flashing = false; return }
            this.setAlpha(blinks % 2 === 0 ? 0.3 : 1)
            blinks++
            if (blinks < blinkCount * 2) {
                this.scene.time.delayedCall(80, blink)
            } else {
                this.setAlpha(1)
                this._flashing = false
            }
        }

        blink()
    }

    // ─── Death ────────────────────────────────────────────────────

    _doDeath() {
        const scene = this.scene  // save before destroy

        this.setActive(false)
        this.body.stop()
        this.cards.clear(true, true)
        if (this._teleportEvent) this._teleportEvent.remove(false)

        const emitter = this.scene.add.particles(this.x, this.y, 'kenny-particles', {
            frame: ['star_08.png', 'smoke_03.png'],
            speed: { min: 80, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            lifespan: 900,
            quantity: 40,
            emitting: false
        })
        emitter.explode(40)
        this.setVisible(false)
        this.destroy()

        scene.time.delayedCall(1500, () => {
            emitter.destroy()
            scene.scene.start('loseScene')
        })
    }

    // ─── Update ───────────────────────────────────────────────────

    update(time, delta) {
        if (!this.active) return
        // figure8 / loop path modes could be added here if needed
    }
}