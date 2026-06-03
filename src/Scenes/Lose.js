class Lose extends Phaser.Scene {
    constructor() {
        super("loseScene");
        this.spaceKey = null;
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;


        let text = this.add.bitmapText(centerX, centerY, 'kiwiSoda', "YOU LOSE", 32).setOrigin(0.5, 0.5);

        let retry = this.add.bitmapText(centerX, centerY + 50, 'kiwiSoda', "PRESS SPACE - RESTART", 20
        ).setOrigin(0.5, 0.5);

        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        this.spaceKey.once("down", () => {

            this.scene.start("platformerScene");
        });
    }
}