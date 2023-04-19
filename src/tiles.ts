export enum TileType {
    Background,
    Blocking,
}

export type Tile = {
    offset: [number, number];
    isWall: boolean;
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
    {offset: [0, 0], isWall: false},
    {offset: [1, 0], isWall: false},
];

export const DEFAULT_BACKGROUND: Tile = {offset: [0, 1], isWall: false};

export const DEFAULT_BOX: Box = {
    fill: {offset: [4, 2], isWall: true},
    top: {offset: [5, 0], isWall: true},
    bottom: {offset: [5, 3], isWall: true},
    left: {offset: [4, 1], isWall: true},
    right: {offset: [7, 1], isWall: true},
    cornerTopLeft: {offset: [4, 0], isWall: true},
    cornerTopRight: {offset: [7, 0], isWall: true},
    cornerBottomLeft: {offset: [4, 3], isWall: true},
    cornerBottomRight: {offset: [7, 3], isWall: true},
    cornerInnerTopLeft: {offset: [6, 2], isWall: true},
    cornerInnerTopRight: {offset: [5, 2], isWall: true},
    cornerInnerBottomLeft: {offset: [6, 1], isWall: true},
    cornerInnerBottomRight: {offset: [5, 1], isWall: true},
};
