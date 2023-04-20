export const TILE_WIDTH = 16;
export const TILE_HEIGHT = TILE_WIDTH;

export enum TileType {
    None,
    Background,
    Blocking,
    Death,
    Jump,
}

export type Tile = {
    offset: [number, number];
    type: TileType;
    visible: boolean;
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

export const HIDDEN_WALL: Tile = {offset: [0, 0], type: TileType.Blocking, visible: false};
export const HIDDEN_DEATH: Tile = {offset: [0, 1], type: TileType.Death, visible: false};
export const HIDDEN_JUMP: Tile = {offset: [0, 2], type: TileType.Jump, visible: false};

export const DEFAULT_BOX: Box = {
    fill: {offset: [4, 2], type: TileType.Blocking, visible: true},
    top: {offset: [5, 0], type: TileType.Blocking, visible: true},
    bottom: {offset: [5, 3], type: TileType.Blocking, visible: true},
    left: {offset: [4, 1], type: TileType.Blocking, visible: true},
    right: {offset: [7, 1], type: TileType.Blocking, visible: true},
    cornerTopLeft: {offset: [4, 0], type: TileType.Blocking, visible: true},
    cornerTopRight: {offset: [7, 0], type: TileType.Blocking, visible: true},
    cornerBottomLeft: {offset: [4, 3], type: TileType.Blocking, visible: true},
    cornerBottomRight: {offset: [7, 3], type: TileType.Blocking, visible: true},
    cornerInnerTopLeft: {offset: [6, 2], type: TileType.Blocking, visible: true},
    cornerInnerTopRight: {offset: [5, 2], type: TileType.Blocking, visible: true},
    cornerInnerBottomLeft: {offset: [6, 1], type: TileType.Blocking, visible: true},
    cornerInnerBottomRight: {offset: [5, 1], type: TileType.Blocking, visible: true},
};
