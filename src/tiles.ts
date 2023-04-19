export const TILE_WIDTH = 16;
export const TILE_HEIGHT = TILE_WIDTH;

export enum TileType {
    Background,
    Blocking,
}

export type Tile = {
    offset: [number, number];
    type: TileType;
}

export type Box = {
    fill: Tile;
    top: Tile;
    bottom: Tile;
    left: Tile;
    right: Tile;
    cornerTopLeft: Tile;
    cornerTopRight: Tile;
    cornerBottomLeft: Tile;
    cornerBottomRight: Tile;
    cornerInnerTopLeft: Tile;
    cornerInnerTopRight: Tile;
    cornerInnerBottomLeft: Tile;
    cornerInnerBottomRight: Tile;
}

export const TRANSPARENCY_TILES: Tile[] = [
    {offset: [0, 0], type: TileType.Background},
    {offset: [1, 0], type: TileType.Background},
];

export const DEFAULT_BACKGROUND: Tile = {offset: [0, 1], type: TileType.Background};

export const DEFAULT_BOX: Box = {
    fill: {offset: [4, 2], type: TileType.Blocking},
    top: {offset: [5, 0], type: TileType.Blocking},
    bottom: {offset: [5, 3], type: TileType.Blocking},
    left: {offset: [4, 1], type: TileType.Blocking},
    right: {offset: [7, 1], type: TileType.Blocking},
    cornerTopLeft: {offset: [4, 0], type: TileType.Blocking},
    cornerTopRight: {offset: [7, 0], type: TileType.Blocking},
    cornerBottomLeft: {offset: [4, 3], type: TileType.Blocking},
    cornerBottomRight: {offset: [7, 3], type: TileType.Blocking},
    cornerInnerTopLeft: {offset: [6, 2], type: TileType.Blocking},
    cornerInnerTopRight: {offset: [5, 2], type: TileType.Blocking},
    cornerInnerBottomLeft: {offset: [6, 1], type: TileType.Blocking},
    cornerInnerBottomRight: {offset: [5, 1], type: TileType.Blocking},
};
