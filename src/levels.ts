import { Tile, TileType, Box, DEFAULT_BACKGROUND, DEFAULT_BOX, TRANSPARENCY_TILES } from './tiles';

export class Level {
    columns: Tile[][];

    constructor(columns: Tile[][]) {
        this.columns = columns;
    }

    width(): number {
        return this.columns.length;
    }

    height(): number {
        return this.columns[0].length;
    }

    tileId(x: number, y: number) {
        return x * this.height() + y;
    }

    static createEmpty(width: number, height: number): Level {
        const columns = Array(width).fill(null).map(() => {
            return Array(height).fill(DEFAULT_BACKGROUND);
        });
        return new Level(columns);
    }
}

const fillBox = (level: Level, box: Box, x: number, y: number, width: number, height: number) => {
    for (let j = x; j < x + width; j++) {
        for (let k = y; k < y + height; k++) {
            level.columns[j][k] = box.fill;
        }
    }
};

const fixBoxEdges = (level: Level, box: Box) => {
    const boxTiles = new Set(Object.values(box));
    const coordsUsingBox = new Set(level.columns.flatMap(
        (column, x) => column.map((tile, y) => boxTiles.has(tile) ? level.tileId(x, y) : null).filter(Boolean)
    ));
    const isBoxTile = (x: number, y: number) => {
        if (x < 0 || x >= level.width() || y < 0 || y >= level.height()) {
            return false;
        } else {
            return coordsUsingBox.has(level.tileId(x, y));
        }
    }

    for (let x = 0; x < level.width(); x++) {
        for (let y = 0; y < level.height(); y++) {
            if (boxTiles.has(level.columns[x][y])) {
                let tile;

                if (!isBoxTile(x - 1, y)) {  // Left
                    if (!isBoxTile(x, y - 1)) {
                        tile = box.cornerTopLeft;
                    } else if (!isBoxTile(x, y + 1)) {
                        tile = box.cornerBottomLeft;
                    } else {
                        tile = box.left;
                    }
                } else if (!isBoxTile(x + 1, y)) { // Right
                    if (!isBoxTile(x, y - 1)) {
                        tile = box.cornerTopRight;
                    } else if (!isBoxTile(x, y + 1)) {
                        tile = box.cornerBottomRight;
                    } else {
                        tile = box.right;
                    }
                } else if (!isBoxTile(x, y - 1)) { // Top
                    tile = box.top;
                } else if (!isBoxTile(x, y + 1)) { // Bottom
                    tile = box.bottom;
                } else { // Fill
                    if (!isBoxTile(x - 1, y - 1)) {
                        tile = box.cornerInnerTopLeft;
                    } else if (!isBoxTile(x + 1, y - 1)) {
                        tile = box.cornerInnerTopRight;
                    } else if (!isBoxTile(x - 1, y + 1)) {
                        tile = box.cornerInnerBottomLeft;
                    } else if (!isBoxTile(x + 1, y + 1)) {
                        tile = box.cornerInnerBottomRight;
                    } else {
                        tile = box.fill;
                    }
                }

                level.columns[x][y] = tile;
            }
        }
    }
};

export const createDefaultLevel = () => {
    const level = Level.createEmpty(200, 50);

    fillBox(level, DEFAULT_BOX, 20, 40, 14, 3);
    fillBox(level, DEFAULT_BOX, 24, 36, 6, 10);
    fillBox(level, DEFAULT_BOX, 22, 33, 6, 3);
    fillBox(level, DEFAULT_BOX, 36, 28, 4, 3);
    fillBox(level, DEFAULT_BOX, 40, 26, 6, 6);
    fillBox(level, DEFAULT_BOX, 52, 44, 12, 3);
    fillBox(level, DEFAULT_BOX, 60, 12, 6, 3);
    fillBox(level, DEFAULT_BOX, 75, 30, 22, 3);
    fillBox(level, DEFAULT_BOX, 107, 10, 4, 35);

    fixBoxEdges(level, DEFAULT_BOX);

    return level;
}
