import { TileId, TileType, Box, TILES, TILE_WIDTH, TILE_HEIGHT, DEFAULT_BOX } from './tiles';
import { AwaitableImage, images } from './assets';
import { data as defaultLevelData } from './levels/default';

type MaybeTile = TileId | null;
type LevelExport = {
    width: number,
    height: number,
    tiles: string[],
};

export class Level {
    backgroundColor: string = 'pink';
    columns: MaybeTile[][];
    bitmap: ImageBitmap;

    // Parallax background images, closest first.
    backgrounds: AwaitableImage[] = [];

    constructor(columns: TileId[][]) {
        this.columns = columns;
        this.render();
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

    render(showInvisible: boolean = false) {
        const canvas = new OffscreenCanvas(this.width() * TILE_WIDTH, this.height() * TILE_HEIGHT);
        const ctx = canvas.getContext('2d')!;
        for (let x = 0; x < this.width(); x++) {
            for (let y = 0; y < this.height(); y++) {
                const tileId = this.columns[x][y];
                const tile = tileId ? TILES[tileId] : null;
                if (tile !== null && (tile.visible || showInvisible)) {
                    ctx.drawImage(
                        images.tiles.bitmap,
                        TILE_WIDTH * tile.offset[0],
                        TILE_HEIGHT * tile.offset[1],
                        TILE_WIDTH,
                        TILE_HEIGHT,
                        x * TILE_WIDTH,
                        y * TILE_HEIGHT,
                        TILE_WIDTH,
                        TILE_HEIGHT,
                    );
                }
            }
        }
        this.bitmap = canvas.transferToImageBitmap();
    }

    generateExport(): string {
        const data: LevelExport = {
            width: this.width(),
            height: this.height(),
            tiles: this.columns.flatMap((column, x) =>
                column.map((tile, y) => [x, y, tile])
                    .filter(([x, y, tile]) => tile !== null)
                    .map(([x, y, tile]) => `${x}|${y}|${tile}`)
            ),
        };
        return "export const data = " + JSON.stringify(data, null, 4) + ";";
    }

    static createEmpty(width: number, height: number): Level {
        const columns = Array(width).fill(null).map(() => {
            return Array(height).fill(null);
        });
        return new Level(columns);
    }

    static createFromExport(levelExport: LevelExport): Level {
        const level = this.createEmpty(levelExport.width, levelExport.height);
        for (const tile of levelExport.tiles) {
            const [x, y, tileId] = tile.split("|")
            level.columns[parseInt(x)][parseInt(y)] = tileId;
        }
        return level;
    }
}

const fillBox = (level: Level, box: Box, x: number, y: number, width: number, height: number) => {
    for (let j = x; j < x + width; j++) {
        for (let k = y; k < y + height; k++) {
            level.columns[j][k] = box.fill;
        }
    }
};

export const fixBoxEdges = (level: Level, box: Box) => {
    const boxTiles: Set<TileId> = new Set(Object.values(box));
    const coordsUsingBox = new Set(level.columns.flatMap(
        (column, x) => column.map((tile, y) => tile !== null && boxTiles.has(tile) ? level.tileId(x, y) : null).filter(Boolean)
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
            if (isBoxTile(x, y)) {
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

// TODO: maybe move this into the level file itself somehow.
export const createDefaultLevel = () => {
    const level = Level.createFromExport(defaultLevelData);
    level.backgroundColor = 'rgb(50, 50, 50)';
    level.backgrounds = [
        images.defaultLevelParallaxX,
        images.defaultLevelParallax0,
        images.defaultLevelParallax1,
        images.defaultLevelParallax2,
        //images.defaultLevelParallax3,
    ];
    level.render();
    return level;
}
