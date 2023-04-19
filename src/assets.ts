import TilesImage from './img/tiles.png';
import PlayerImage from './img/player.png';


class AwaitableImage {
    img: HTMLImageElement;
    loaded: Promise<void>;

    constructor(src: string) {
        this.img = new Image();
        this.loaded = new Promise((resolve) => {
            this.img.onload = () => {resolve()};
        });
        this.img.src = src;
    }
}

export const images = {
    tiles: new AwaitableImage(TilesImage),
    player: new AwaitableImage(PlayerImage),
};
