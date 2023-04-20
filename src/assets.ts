import TilesImage from './img/tiles.png';
import PlayerImage from './img/player.png';
import DefaultLevelParallaxX from './img/parallax-X.png';
import DefaultLevelParallax0 from './img/parallax-0.png';
import DefaultLevelParallax1 from './img/parallax-1.png';
import DefaultLevelParallax2 from './img/parallax-2.png';
import DefaultLevelParallax3 from './img/parallax-3.png';


export class AwaitableImage {
    bitmap: ImageBitmap;
    load: Promise<void>;

    constructor(src: string) {
        const image = new Image();
        this.load = new Promise((resolve) => {
            image.onload = () => {
                createImageBitmap(image).then(bitmap => {
                    this.bitmap = bitmap;
                    resolve();
                });
            };
        });
        image.src = src;
    }
}

export const images = {
    tiles: new AwaitableImage(TilesImage),
    player: new AwaitableImage(PlayerImage),
    defaultLevelParallaxX: new AwaitableImage(DefaultLevelParallaxX),
    defaultLevelParallax0: new AwaitableImage(DefaultLevelParallax0),
    defaultLevelParallax1: new AwaitableImage(DefaultLevelParallax1),
    defaultLevelParallax2: new AwaitableImage(DefaultLevelParallax2),
    defaultLevelParallax3: new AwaitableImage(DefaultLevelParallax3),
};
