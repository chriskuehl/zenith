import TilesImage from './img/tiles.png';
import PlayerImage from './img/player.png';

const makeImage = (url: string) => {
    const image = new Image();
    image.src = url;
    return image;
};

export const images = {
    tiles: makeImage(TilesImage),
    player: makeImage(PlayerImage),
};
