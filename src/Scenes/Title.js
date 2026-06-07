class Title extends Phaser.Scene {
    constructor() {
        super("titleScene");
        this.spaceKey = null;
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;


        let text = this.add.bitmapText(centerX, centerY - 330, 'kiwiSoda', "ALL-IN", 100).setOrigin(0.5, 0.5);
        let desc = this.add.bitmapText(centerX, centerY - 150, 'kiwiSoda', "Risk it all", 35).setOrigin(0.5, 0.5);
        let desc2 = this.add.bitmapText(centerX, centerY - 110, 'kiwiSoda', "Or", 35).setOrigin(0.5, 0.5);
        let desc3 = this.add.bitmapText(centerX, centerY - 70, 'kiwiSoda', "Lose it all", 35).setOrigin(0.5, 0.5);

        let start = this.add.bitmapText(centerX, centerY + 70, 'kiwiSoda', "PRESS SPACE TO START", 40
        ).setOrigin(0.5, 0.5);

        this.jackpotDisplay();

        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        this.spaceKey.once("down", () => {

            this.scene.start("platformerScene");
        });
    }

    jackpotDisplay() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;

        const left = centerX - 670;
        const right = centerX + 670;
        const top = centerY - 420;
        const bottom = centerY + 420;
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
    }
}