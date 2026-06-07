class Casino extends Phaser.Scene {
    constructor() {
        super("casinoScene");
    }

    init(data) {
        this.diamonds = data.diamonds || 0;
        this.abilitiesData = data.abilities || {}
        this.spaceKey = null; 
        this.rKey = null;
        this.reelHeight = 80;
        this.reelSpinning = false;
        this.nextScene = data.nextScene || 'platformer2Scene'
    }

    create() {

        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        this.canSpin = true;

        this.symbols = [
            "7",
            "$",
            "7",
            "7",
            "7",
            "&",
            "7"
        ];
        this.reels = [];

        const reelWidth = 80;
        const reelHeight = 80;
        const reelSpacing = 20;
        const startX = centerX - (reelWidth + reelSpacing);

        for (let i = 0; i < 3; i++) {
            let reelX = startX + i * (reelWidth + reelSpacing);

            // Background box
            this.add.rectangle(reelX, centerY, reelWidth, reelHeight, 0x000000)
                .setStrokeStyle(2, 0xffff00);

            // Container positioned at 0,0 symbols positioned
            let reelContainer = this.add.container(0, 0);

            let symbolTexts = [];
            for (let s = 0; s < this.symbols.length; s++) {
                let txt = this.add.bitmapText(reelX, centerY + (s * reelHeight), 'kiwiSoda', this.symbols[s], 48)
                    .setOrigin(0.5);
                symbolTexts.push(txt);
                reelContainer.add(txt);
            }

            this.add.rectangle(reelX, centerY - reelHeight - 200, reelWidth, reelHeight + 400, 0x000000).setDepth(10); // above
            this.add.rectangle(reelX, centerY + reelHeight + 200, reelWidth, reelHeight + 400, 0x000000).setDepth(10); // below

            this.reels.push({
                container: reelContainer,
                symbols: symbolTexts,
                startY: centerY,
                result: "?",
                spinning: false
            });
        }

        this.lever = this.add.rectangle(centerX, centerY + 120, 20, 80, 0xff0000).setDepth(20);

        this.diamondText = this.add.bitmapText(
            20, 
            20,
            'kiwiSoda',
            `Diamonds: ${this.diamonds}`,
            24
        );

        this.infoText = this.add.bitmapText(
            centerX, 
            centerY + 200,
            'kiwiSoda',
            "Press SPACE to spin",
            30
        ).setOrigin(0.5, 0.5).setDepth(20);

        this.gamblingSound = this.sound.add("gambling", { volume: 0.5 });

        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        this.rKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.R
        );

        if (this.diamonds <= 0) {

            this.canSpin = false;

            this.infoText.setText(
                "NO DIAMONDS (YOU LOSE)- PRESS R TO RESTART"
            );

            this.rKey.once("down", () => {

                this.scene.start("platformerScene");
            });
        }
    }

    update() {

        if (
            Phaser.Input.Keyboard.JustDown(this.spaceKey)
            && this.canSpin
            && this.diamonds > 0
        ) {
            // Lever pull animation
            this.tweens.add({
                targets: this.lever,
                angle: -30,
                duration: 200,
                yoyo: true
            });
            this.spinReels();
        }

        if (this.reelSpinning == true) {
            this.infoText.setText(".....");
        }
    }

    spinReels() {
        this.canSpin = false;
        this.diamonds -= 1;
        this.diamondText.setText(`Diamonds: ${this.diamonds}`);
        this.gamblingSound.play();

        // Randomize reel results
        let results = [
            Phaser.Utils.Array.GetRandom(this.symbols),
            Phaser.Utils.Array.GetRandom(this.symbols),
            Phaser.Utils.Array.GetRandom(this.symbols)
        ];

        // Spin each reel with different stop times
        for (let i = 0; i < 3; i++) {
            let stopDelay = 1000 + i * 500;  // reel 0: 1s, reel 1: 1.5s, reel 2: 2s
            this.spinSingleReel(i, results[i], stopDelay);
        }

        // Check results after all reels stop
        this.time.delayedCall(2500, () => {
            this.checkResults(results);
        });
    }

    spinSingleReel(index, result, stopDelay) {
        let reel = this.reels[index];
        this.reelSpinning = true;

        let spinEvent = this.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => {
                reel.symbols.forEach(sym => {
                    sym.y += 8;
                    if (sym.y > reel.startY + this.reelHeight) {
                        sym.y -= this.symbols.length * this.reelHeight;
                    }
                });
            }
        });

        this.time.delayedCall(stopDelay, () => {
            spinEvent.remove();

            let resultIndex = this.symbols.indexOf(result);
            reel.symbols.forEach((sym, s) => {
                sym.y = reel.startY + (s - resultIndex) * this.reelHeight;
            });

            reel.result = result;
            this.reelSpinning = false;

            this.tweens.add({
                targets: reel.symbols,
                y: (target) => target.y + 10,
                yoyo: true,
                duration: 100
            });
        });
    }

    checkResults(results) {
        if (results[0] === results[1] && results[1] === results[2]) {
            // JACKPOT — all match
            this.infoText.setText("JACKPOT! PRESS R TO CONTINUE");
            this.jackpotDisplay();
            this.rKey.once("down", () => {
                this.scene.start(this.nextScene, {
                    diamonds: this.diamonds,
                    abilities: this.abilitiesData
                })
            });
        } else if (this.diamonds === 0) {
            this.infoText.setText("BUST - PRESS R TO RESTART");
            this.rKey.once("down", () => this.scene.start("platformerScene"));
        } else {
            this.infoText.setText("Try again!");
            this.canSpin = true;
        }
    }

    jackpotDisplay() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const left = centerX - 160;
        const right = centerX + 160;
        const top = centerY - 140;
        const bottom = centerY + 140;
        const spacing = 40;

        const numLights = 24;
        const lights = [];

        // Place lights evenly around the rectangle
        // top edge — left to right
        for (let x = left; x <= right; x += spacing) {
            lights.push(this.add.circle(x, top, 6, 0xffff00).setDepth(30));
        }
        // right edge — top to bottom
        for (let y = top; y <= bottom; y += spacing) {
            lights.push(this.add.circle(right, y, 6, 0xffff00).setDepth(30));
        }
        // bottom edge — right to left
        for (let x = right; x >= left; x -= spacing) {
            lights.push(this.add.circle(x, bottom, 6, 0xffff00).setDepth(30));
        }
        // left edge — bottom to top
        for (let y = bottom; y >= top; y -= spacing) {
            lights.push(this.add.circle(left, y, 6, 0xffff00).setDepth(30));
        }


        // Animate lights
        let tick = 0;
        this.time.addEvent({
            delay: 80,
            loop: true,
            callback: () => {
                tick++;
                lights.forEach((light, i) => {
                    // alternate on/off to create chase effect
                    light.setFillStyle((i + tick) % 3 === 0 ? 0xffff00 : 0xff6600);
                    light.setScale((i + tick) % 3 === 0 ? 1.4 : 0.8);
                });
            }
        });

        // Flash screen after Jackpot
        this.cameras.main.flash(300, 255, 255, 0);
        this.time.delayedCall(400, () => this.cameras.main.flash(300, 255, 200, 0));
    }

}