import GridImage from './img/grid.png';
import PlayerImage from './img/player.png';

const makeImage = (url: string) => {
    const image = new Image();
    image.src = url;
    return image;
};

export const images = {
    grid: makeImage(GridImage),
    player: makeImage(PlayerImage),
};
