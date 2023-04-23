export const TILE_WIDTH = 16;
export const TILE_HEIGHT = TILE_WIDTH;

export enum TileType {
    None,
    Background,
    Blocking,
    Death,
    Jump,
}

export type TileId = string;

export type TileDefinition = {
    offset: [number, number];
    type: TileType;
    visible: boolean;
}

export type Box = {
    fill: TileId;
    top: TileId;
    bottom: TileId;
    left: TileId;
    right: TileId;
    cornerTopLeft: TileId;
    cornerTopRight: TileId;
    cornerBottomLeft: TileId;
    cornerBottomRight: TileId;
    cornerInnerTopLeft: TileId;
    cornerInnerTopRight: TileId;
    cornerInnerBottomLeft: TileId;
    cornerInnerBottomRight: TileId;
}

export const TILES: {[key: TileId]: TileDefinition} = {};


const createTile = (offset: [number, number], type: TileType, visible: boolean = true): TileId => {
    const tileId: TileId = `${offset[0]},${offset[1]}`;
    TILES[tileId] = {offset, type, visible};
    return tileId;
};

export const HIDDEN_WALL = createTile([0, 0], TileType.Blocking, false);
export const HIDDEN_DEATH = createTile([0, 1], TileType.Death, false);
export const HIDDEN_JUMP = createTile([0, 2], TileType.Jump, false);

export const DEFAULT_BOX: Box = {
    fill: createTile([4, 2], TileType.Blocking),
    top: createTile([5, 0], TileType.Blocking),
    bottom: createTile([5, 3], TileType.Blocking),
    left: createTile([4, 1], TileType.Blocking),
    right: createTile([7, 1], TileType.Blocking),
    cornerTopLeft: createTile([4, 0], TileType.Blocking),
    cornerTopRight: createTile([7, 0], TileType.Blocking),
    cornerBottomLeft: createTile([4, 3], TileType.Blocking),
    cornerBottomRight: createTile([7, 3], TileType.Blocking),
    cornerInnerTopLeft: createTile([6, 2], TileType.Blocking),
    cornerInnerTopRight: createTile([5, 2], TileType.Blocking),
    cornerInnerBottomLeft: createTile([6, 1], TileType.Blocking),
    cornerInnerBottomRight: createTile([5, 1], TileType.Blocking),
};

export const DEFAULT_SPIKES: Box = {
    fill: createTile([8, 2], TileType.Death),
    top: createTile([9, 0], TileType.Death),
    bottom: createTile([9, 3], TileType.Death),
    left: createTile([8, 1], TileType.Death),
    right: createTile([11, 1], TileType.Death),
    cornerTopLeft: createTile([8, 0], TileType.Death),
    cornerTopRight: createTile([11, 0], TileType.Death),
    cornerBottomLeft: createTile([8, 3], TileType.Death),
    cornerBottomRight: createTile([11, 3], TileType.Death),
    cornerInnerTopLeft: createTile([10, 2], TileType.Death),
    cornerInnerTopRight: createTile([9, 2], TileType.Death),
    cornerInnerBottomLeft: createTile([10, 1], TileType.Death),
    cornerInnerBottomRight: createTile([9, 1], TileType.Death),
};
