
// debug with extreme prejudice
"use strict"

// game config
let config = {
    parent: 'phaser-game',
    type: Phaser.AUTO,
    render: {
        pixelArt: true,
        roundPixels: true  // prevent pixel art from getting blurred when scaled
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: {
                x: 0,
                y: 2000
            }
        }
    },
    width: 1440,
    height: 900,
    scene: [Load, Title, BossBattle, Platformer2, Platformer, Lose, Casino, Credits]
}

var cursors;
const SCALE = 2.0;
var my = {sprite: {}, text: {}};

const game = new Phaser.Game(config);