class Credits extends Phaser.Scene {
    constructor() {
        super("creditsScene");
        this.spaceKey = null;
    }

    create() {
        const centerX = this.cameras.main.width / 2;
        const centerY = this.cameras.main.height / 2;


        let text = this.add.bitmapText(centerX, centerY, 'kiwiSoda', "You shortly go on to lose all of your earnings...", 50).setOrigin(0.5, 0.5);
        // Credits text (start off screen)
        let creditsText = this.add.bitmapText(400, 700, 'kiwiSoda',
            "CREDITS\n\n" +
            "Game Design & Code:\nAlan Salazar\n\n" +
            "Assets:\nKenney.nl\n\n" +
            "Sound Effects:\nKenney.nl and Royalty Free Sounds (pixabay)\n\n" +
            "Thanks for playing!",
            28
        ).setOrigin(0.5);

        // Scrolling animation
        this.tweens.add({
            targets: creditsText,
            y: -200,
            duration: 8000,
            ease: "Linear"
        });

        // Back text
        let backText = this.add.bitmapText(400, 550, 'kiwiSoda', "Press SPACE to return", 20).setOrigin(0.5);

        // Fade animation
        this.tweens.add({
            targets: backText,
            alpha: 0,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.spaceKey = this.input.keyboard.addKey(
            Phaser.Input.Keyboard.KeyCodes.SPACE
        );

        this.spaceKey.once("down", () => {

            this.scene.start("titleScene");
        });
    }
}