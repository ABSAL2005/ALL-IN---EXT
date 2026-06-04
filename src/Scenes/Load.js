class Load extends Phaser.Scene {
    constructor() {
        super("loadScene");
    }

    preload() {
        this.load.setPath("./assets/");

        // Load characters spritesheet
        this.load.image("player_idle", "Player/player_idle.png");
        this.load.image("player_right", "Player/right_player.png");
        this.load.image("right_walk1", "Player/right_walk1.png");
        this.load.image("right_walk2", "Player/right_walk2.png");
        this.load.image("right_walk3", "Player/right_walk3.png");
        this.load.image("jump_player", "Player/jump_player.png");
        this.load.image("crouch_player", "Player/crouch_player.png");
        this.load.image("boss_idle", "Player/boss_idle.png");
        this.load.image("boss_flying", "Player/boss_flying.png");

        // attacks
        this.load.image("card_throw", "Player/card_throw.png");
        this.load.image("dice_throw", "Player/dice_throw.png");

        // Load tilemap information
        this.load.image("tilemap_packed", "kenney_1-bit-platformer-pack/Tilemap/monochrome_tilemap_packed.png");   // Packed tilemap
        this.load.image("tilemap_packed2", "kenney_1-bit-platformer-pack/Tilemap/monochrome_tilemap_transparent_packed.png");  // Packed tilemap (duplicate for multiatlas)
        this.load.tilemapTiledJSON("Level3", "Dealer.json");
        this.load.tilemapTiledJSON("Level2", "Gold.json");
        this.load.tilemapTiledJSON("Level1", "Jackpot.json");   // Tilemap in JSON

        this.load.spritesheet("tilemap_sheet", "kenney_1-bit-platformer-pack/Tilemap/monochrome_tilemap_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });
        this.load.spritesheet("tilemap_sheet2", "kenney_1-bit-platformer-pack/Tilemap/monochrome_tilemap_transparent_packed.png", {
            frameWidth: 16,
            frameHeight: 16
        });

        this.load.multiatlas("kenny-particles", "kenny-particles.json");

        this.load.bitmapFont('kiwiSoda', 'kiwiSoda_0.png', 'kiwiSoda.fnt');

        this.load.audio("gambling", "kenney_casino-audio/Audio/dice-shake-1.ogg")
        this.load.audio("footstep", "kenney_impact-sounds/Audio/footstep_concrete_002.ogg")
    }

    create() {
        this.anims.create({
            key: 'walk',
            frames: [
                { key: 'player_right' },
                { key: 'right_walk1' },
                { key: 'right_walk2' },
                { key: 'right_walk3' }
            ],
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'idle',
            frames: [
                { key: 'player_idle' }
            ],
            frameRate: 1,
            repeat: -1
        });

        this.anims.create({
            key: 'jump',
            frames: [
                { key: 'jump_player' }
            ],
            frameRate: 1
        });
        this.anims.create({
            key: 'crouch',
            frames: [
                { key: 'crouch_player' }
            ],
            frameRate: 1,
        });

        this.anims.create({
            key: 'enemyWalk',
            frames: [
                { key: 'tilemap_sheet', frame: 380 },
                { key: 'tilemap_sheet', frame: 381 }
            ],
            frameRate: 6,
            repeat: -1
        });

         // ...and pass to the next Scene
         this.scene.start("bossBattle");

    }

    // Never get here since a new scene is started in create()
    update() {
    }
}