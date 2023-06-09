import React, { useState, useEffect, useRef, MouseEvent, KeyboardEvent, ChangeEvent } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { images } from './assets';
import "./css/main.css";
import JoystickCircleImage from './img/joystick.svg';
import {
    TileId,
    Box,
    TileType,
    TILE_WIDTH,
    TILE_HEIGHT,
    TILES,
    DEFAULT_BOX,
    DEFAULT_SPIKES,
    HIDDEN_WALL,
    HIDDEN_DEATH,
    HIDDEN_JUMP,
} from './tiles';
import { createDefaultLevel, fixBoxEdges } from './levels';

const TICKS_PER_SECOND = 360;
const TICK_MS = 1000 / TICKS_PER_SECOND;

const INPUT_BUFFERING_TICKS = 30; // Ticks.

const PLAYER_WIDTH = 2; // Tiles.
const PLAYER_HEIGHT = 3; // Tiles.
const PLAYER_WALK_ACCEL = 0.015;  // Tiles per tick per tick.
const PLAYER_MAX_WALK_VELOCITY = 0.1; // Tiles per tick.
const PLAYER_FRICTION_ACCEL = 0.003; // Tiles per tick per tick.
const PLAYER_DASH_VELOCITY = 0.5;  // Tiles per tick.
const PLAYER_DASH_HANG_TIME = 30; // Ticks.
const PLAYER_DASH_CONTRAIL_OPACITY = 0.8; // Opacity.
const PLAYER_DASH_CONTRAIL_FADE = 0.01; // Opacity decrease per tick.
const PLAYER_GRAVITY_ACCEL = 0.0025; // Tiles per tick per tick.
const PLAYER_JUMP_VELOCITY = 0.2; // Tiles per tick.
// Not the total length a jump takes, but enough so that you can't immediately
// wall jump following a vertical jump next to a wall.
const PLAYER_JUMP_TICKS = INPUT_BUFFERING_TICKS * 2;
const PLAYER_WALL_JUMP_BUFFER_TICKS = 60; // Ticks.
const PLAYER_WALL_JUMP_VELOCITY = PLAYER_JUMP_VELOCITY; //(2 * (PLAYER_JUMP_VELOCITY ** 2)) ** 0.5; // Tiles per tick.
const PLAYER_MOVEMENT_STEP = 1 / TILE_WIDTH; // Tiles.
const PLAYER_DEATH_WIPE_PROGRESS = 0.0015; // Progress (out of 1) per tick.
const PLAYER_START_POS = [20, 2]; // Tiles.
//const PLAYER_START_POS = [60, 2]; // Tiles.
// Time to restore dash ability when standing on the floor. Used to make
// wavedashing more challenging.
//
// TODO: fix somehow? setting this above zero makes wavedashing more skillful
// but ruins regular jump-land-jump-dash a lot of the time.
const PLAYER_RESTORE_DASH_DELAY = 0; // Ticks.

const KEYBOARD_KEYS_LEFT = new Set(['KeyA', 'ArrowLeft']);
const KEYBOARD_KEYS_RIGHT = new Set(['KeyD', 'ArrowRight']);
const KEYBOARD_KEYS_UP = new Set(['KeyW', 'ArrowUp']);
const KEYBOARD_KEYS_DOWN = new Set(['KeyS', 'ArrowDown']);
const KEYBOARD_KEYS_JUMP = new Set(['Enter', 'Space']);
const KEYBOARD_KEYS_DASH = new Set(['Shift', 'ShiftLeft', 'ShiftRight']);

const LEVEL_EDIT_OPTIONS: [string, TileId][] = [
    ["Box 1", DEFAULT_BOX.fill],
    ["Spikes 1", DEFAULT_SPIKES.fill],
    ["Hidden wall", HIDDEN_WALL],
    ["Hidden death", HIDDEN_DEATH],
    ["Hidden jump", HIDDEN_JUMP],
];

// Shared variables between React app and game.
let editModeEnabled = false;
let editModeSelectedTile = DEFAULT_BOX.fill;
let resetLevelCallback = (): void => { throw new Error("Game not ready."); };
let exportLevelCallback = (): void => { throw new Error("Game not ready."); };
let exportImageCallback = (): void => { throw new Error("Game not ready."); };
let canvasMouseX: number | null = null;
let canvasMouseY: number | null = null;
let canvasMouseButtons = 0;
const canvasKeysDown = new Set<String>();

type ControllerState = {
    name: string;
    leftAxis: [number, number];
    joystick: {
        left: boolean;
        down: boolean;
        right: boolean;
        up: boolean;
    };
    dpad: {
        left: boolean;
        down: boolean;
        right: boolean;
        up: boolean;
    };
    buttons: {
        a: boolean,
        b: boolean,
        x: boolean,
        y: boolean,
    };
};

type InputState = {
    left: boolean;
    down: boolean;
    right: boolean;
    up: boolean;
    jump: boolean;
    dash: boolean;
};

// Used to buffer inputs (so that you can press a button slightly early) and to
// differentiate between holding and pressing a button.
//
// Input buffering is important for improving game "feeling". For example, it
// feels awful if you jump 1 frame before hitting the ground and then "stick"
// to the ground and it feels like your input was ignored (even though
// technically you were a frame early).
class BufferedInputState {
    private currentState: InputState;
    private holdingJump = false;
    private holdingDash = false;
    private jumpTicksRemaining = 0;
    private dashTicksRemaining = 0;

    update(state: InputState) {
        if (state.jump) {
            if (!this.holdingJump) {
                this.jumpTicksRemaining = INPUT_BUFFERING_TICKS;
                this.holdingJump = true;
            }
        } else {
            this.holdingJump = false;
        }
        if (state.dash) {
            if (!this.holdingDash) {
                this.dashTicksRemaining = INPUT_BUFFERING_TICKS;
                this.holdingDash = true;
            }
        } else {
            this.holdingDash = false;
        }
        this.currentState = state;
    }

    // TODO: get rid of this and use a global tick counter instead.
    tick() {
        this.jumpTicksRemaining--;
        this.dashTicksRemaining--;
    }

    get left(): boolean { return this.currentState.left; }
    get down(): boolean { return this.currentState.down; }
    get right(): boolean { return this.currentState.right; }
    get up(): boolean { return this.currentState.up; }
    get jump(): boolean { return this.jumpTicksRemaining > 0; }
    get dash(): boolean { return this.dashTicksRemaining > 0; }
};

const StatWidget: React.FC<{player: Player, fps: number, ticksPerFrame: number}> = ({player, fps, ticksPerFrame}) => {
    let hasDash;
    if (player.dashTicksRemaining > 0) {
        hasDash = <span className="dash dashing">Dashing</span>;
    } else if (player.hasDashAbility) {
        hasDash = <span className="dash has-dash">Has Dash</span>;
    } else {
        hasDash = <span className="dash no-dash">No Dash</span>;
    }

    return <div className="player-stats top-bar-child">
        FPS: {fps}<br />
        Ticks/Frame: {ticksPerFrame}<br />
        Pos: ({player.pos[0].toFixed(1)}, {player.pos[1].toFixed(1)})<br />
        Velocity: ({player.velocity[0].toFixed(1)}, {player.velocity[1].toFixed(1)})<br />
        Dash: {hasDash}
    </div>;
};

const JoystickCircle: React.FC<{axis: [number, number]}> = ({axis}) => {
    const size = 100;
    const x = (size / 2) + axis[0] * (size / 2) - 5;
    const y = (size / 2) + axis[1] * (size / 2) - 5;
    return <div className="joystick-circle">
        <img src={JoystickCircleImage} width={size} height={size} />
        <div className="indicator" style={{left: `${x}px`, top: `${y}px`}} />
    </div>;
};

const ControllerWidget: React.FC<{state: ControllerState | null}> = ({state}) => {
    return <div className="controller-display top-bar-child">
        <JoystickCircle axis={state ? state.leftAxis : [0, 0]} />
        <ul>
            {state !== null ?
                <>
                    <li>Name: {state.name}</li>
                    <li>Left Axis: {state.leftAxis[0].toFixed(2)} {state.leftAxis[1].toFixed(2)}</li>
                    <li>Joystick: {JSON.stringify(state.joystick)}</li>
                    <li>Dpad: {JSON.stringify(state.dpad)}</li>
                    <li>Buttons: {JSON.stringify(state.buttons)}</li>
                </>
                :
                <li>No controller connected. Connect a controller and press any button.</li>
            }
        </ul>
    </div>;
};

const EditModeWidget: React.FC<{}> = () => {
    const [enabled, setEnabled] = useState(editModeEnabled);
    const [selectedTile, setSelectedTile] = useState(editModeSelectedTile);

    useEffect(
        () => { editModeEnabled = enabled },
        [enabled],
    );

    useEffect(
        () => { editModeSelectedTile = selectedTile },
        [selectedTile],
    );

    return <div className="edit-mode top-bar-child">
        <div>
            <p>
                <label>
                    <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Edit Mode
                </label>
            </p>
            <ul>
                {LEVEL_EDIT_OPTIONS.map(([label, tile], i) => <li key={i}>
                    <label>
                        <input type="radio" checked={selectedTile === tile} onChange={(e) => setSelectedTile(tile)} />
                        {label}
                    </label>
                </li>)}
            </ul>
        </div>
        <div>
            <p><button onClick={() => confirm("Reset all level changes?") && resetLevelCallback()}>Reset Level</button></p>
            <p><button onClick={() => exportLevelCallback()}>Export Level</button></p>
            <p><button onClick={() => exportImageCallback()}>Export Image</button></p>
        </div>
    </div>;
};


type ZenithAppProps = {
    fps: number;
    ticksPerFrame: number;
    controllerState: ControllerState | null;
    player: Player;
}

const ZenithApp: React.FC<ZenithAppProps> = (props) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [canvasSize, setCanvasSize]= useState([100, 100]);

    useEffect(() => {
        if (contentRef.current !== null) {
            const content = contentRef.current;
            const resize = () => setCanvasSize([content.clientWidth, content.clientHeight]);
            resize();

            const resizeObserver = new ResizeObserver(() => {
                resize();
            });
            resizeObserver.observe(content);
        }
    }, [contentRef]);

    const onMouseMove = (e: MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        canvasMouseX = e.clientX - rect.left;
        canvasMouseY = e.clientY - rect.top;
        canvasMouseButtons = e.buttons;
    };

    const onKeyDown = (e: KeyboardEvent) => {
        canvasKeysDown.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
        canvasKeysDown.delete(e.code);
    };

    const onBlur = () => {
        canvasKeysDown.clear();
    };

    return <div className="zenith" tabIndex={-1} onKeyDown={onKeyDown} onKeyUp={onKeyUp} onBlur={onBlur}>
        <div className="top-bar">
            <ControllerWidget state={props.controllerState} />
            <StatWidget fps={props.fps} ticksPerFrame={props.ticksPerFrame} player={props.player} />
            <EditModeWidget />
        </div>
        <div className="content" ref={contentRef}>
            <canvas
                width={canvasSize[0]}
                height={canvasSize[1]}
                id="game-canvas"
                onMouseMove={onMouseMove}
                onContextMenu={(e) => {e.preventDefault(); return false;}}
            />
        </div>
    </div>;
};

const vecxy = (state: BufferedInputState): [number, number] => {
    let vecx = 0;
    let vecy = 0;

    if (state.left) {
        vecx = -1;
    } else if (state.right) {
        vecx = 1;
    }

    if (state.up) {
        vecy = -1;
    } else if (state.down) {
        vecy = 1;
    }

    const dist = (vecx ** 2 + vecy ** 2) ** 0.5;
    return [vecx / dist, vecy / dist];
};

const intersects = <T,>(s1: Set<T>, s2: Set<T>): boolean => {
    for (const el of s1) {
        if (s2.has(el)) {
            return true;
        }
    }
    return false;
}

enum PlayerDirection {
    Left,
    Right,
}

type DashPosition = [PlayerDirection, number, number, number];

class Player {
    pos: [number, number];
    velocity: [number, number];
    direction = PlayerDirection.Right;
    dashTicksRemaining = 0;
    jumpTicksRemaining = 0;
    hasDashAbility = true;
    dashPositions: DashPosition[];
    ticksTouchingFloor = 0;
    atLeftWallTicks = 0;
    atRightWallTicks = 0;
    dead = false;
    deathWipeProgress: number = 0;

    constructor() {
        this.pos = [PLAYER_START_POS[0], PLAYER_START_POS[1]];
        this.velocity = [0, 0];
        this.dashPositions = [];
    }
};

class ZenithGame {
    root: Root;
    lastFrameMs = 0;
    framesSinceLastSecond = 0;
    fps = 0;
    ticksPerFrame = 0;
    gamepadIndex: number | null = null;
    canvasCtx: CanvasRenderingContext2D | null = null;
    player: Player = new Player();
    level = createDefaultLevel();
    editModeEnabled = false;
    editModeCursorPosition: [number, number] | null = null;
    inputState = new BufferedInputState();

    constructor(container: HTMLDivElement) {
        this.root = createRoot(container);
    }

    run() {
        resetLevelCallback = () => {
            this.level = createDefaultLevel();
            if (this.editModeEnabled) {
                this.level.render(true);
            }
        };
        exportLevelCallback = () => {
            const levelExport = this.level.generateExport();
            navigator.clipboard.writeText(levelExport)
                .catch(() => {
                    alert("Could not copy to your clipboard.");
                })
                .then(() => {
                    alert("Level export copied to your clipboard.");
                });
        };
        exportImageCallback = () => {
            const newWindow = window.open("", "_blank")!;
            const image = new Image();
            image.src = this.canvasCtx!.canvas.toDataURL("image/png");
            newWindow.document.write(image.outerHTML);
            newWindow.focus();
        };

        this.renderUI();
        this.loop();
    }

    getControllerState(): ControllerState | null {
        const gamepads = navigator.getGamepads();

        // Use previously-selected gamepad if it's still available.
        let gamepad = this.gamepadIndex ? gamepads[this.gamepadIndex] : null;

        // Otherwise, see if we have a gamepad now...
        if (gamepad === null) {
            const possibleGamepads = gamepads.filter(Boolean).filter(g => !g!.id.includes('LED Controller'));
            possibleGamepads.sort(g => {
                // If the gamepad has any kind of input (even slightly-drifting
                // axes), select that over the other candidates.
                //
                // This helps for computers with multiple gamepads, where one
                // can be something like an LED controller with no inputs (why
                // does this even show up here?!).
                return (g as Gamepad).axes.map(Math.abs).reduce((a, b) => a + b);
            });
            gamepad = possibleGamepads.length > 0 ? possibleGamepads[0] : null;
        }

        if (!gamepad) {
            return null;
        }

        this.gamepadIndex = gamepad.index;

        let joystick = {
            left: false,
            down: false,
            right: false,
            up: false,
        };

        const deflection = (gamepad.axes[0] ** 2 + gamepad.axes[1] ** 2) ** 0.5;
        if (deflection > 0.7) {
            let angle = Math.atan2(gamepad.axes[1], gamepad.axes[0]) + Math.PI/8;
            if (angle < 0) {
                angle = 2 * Math.PI + angle;
            }

            // right, down, left, up
            const directions = [false, false, false, false];
            const segment = Math.floor(angle / (Math.PI / 4));
            const mainSegment = Math.floor(segment / 2);
            directions[mainSegment] = true;
            if (segment % 2 === 1) {
                directions[(mainSegment + 1 ) % directions.length] = true;
            }

            joystick.right = directions[0];
            joystick.down = directions[1];
            joystick.left = directions[2];
            joystick.up = directions[3];
        }

        return {
            name: gamepad.id,
            leftAxis: [gamepad.axes[0], gamepad.axes[1]],
            joystick,
            dpad: {
                left: gamepad.buttons[14].pressed,
                down: gamepad.buttons[13].pressed,
                right: gamepad.buttons[15].pressed,
                up: gamepad.buttons[12].pressed,
            },
            buttons: {
                a: gamepad.buttons[0].pressed,
                b: gamepad.buttons[1].pressed,
                x: gamepad.buttons[2].pressed,
                y: gamepad.buttons[3].pressed,
            },
        };
    }

    gameOffset(): [number, number] {
        // Return game content offset in the viewport, based on the player's
        // position, canvas size, etc.
        const ctx = this.canvasCtx!;

        const levelWidth = this.level.width() * TILE_WIDTH;
        const levelHeight = this.level.height() * TILE_HEIGHT;
        const relativeFocusPoint = [
            (this.player.pos[0] * TILE_WIDTH),
            (this.player.pos[1] * TILE_HEIGHT),
        ];

        return [
            ctx.canvas.width >= levelWidth ? Math.floor((ctx.canvas.width - levelWidth) / 2) : Math.min(
                0,
                Math.max(
                    ctx.canvas.width - levelWidth,
                    Math.floor((ctx.canvas.width / 2) - relativeFocusPoint[0]),
                ),
            ),
            ctx.canvas.height >= levelHeight ? Math.floor((ctx.canvas.height - levelHeight) / 2) : Math.min(
                0,
                Math.max(
                    ctx.canvas.height - levelHeight,
                    Math.floor((ctx.canvas.height / 2) - relativeFocusPoint[1]),
                ),
            ),
        ];
    }

    renderGame(offset: [number, number]) {
        const ctx = this.canvasCtx!;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        // Level start.
        ctx.fillStyle = this.level.backgroundColor;
        ctx.fillRect(offset[0], offset[1], this.level.bitmap.width, this.level.bitmap.height);

        // Level parallax backgrounds.
        const levelProgress = (((this.player.pos[0] - PLAYER_WIDTH / 2) / (this.level.width() - PLAYER_WIDTH)) - 0.5) * 2;
        for (let i = this.level.backgrounds.length - 1; i >= 0; i--) {
            const background = this.level.backgrounds[i];
            ctx.drawImage(
                background.image.bitmap,
                offset[0] + (this.level.bitmap.width / 2) - (background.image.bitmap.width / 2) - levelProgress * background.moveFactor,
                offset[1],
            );
        }

        // Level tiles.
        // TODO: add logic to only draw the portion of the level which is visible.
        ctx.drawImage(this.level.bitmap, offset[0], offset[1]);

        // Player.
        // TODO: replace with ImageBitmap sprites.
        let playerSpriteY = this.player.hasDashAbility ? 0 : 1;
        if (this.player.dead && this.player.deathWipeProgress > 0.15) {
            playerSpriteY = 3;
        }
        ctx.drawImage(
            images.player.bitmap,
            this.player.direction === PlayerDirection.Left ? 0 : TILE_WIDTH * PLAYER_WIDTH,
            playerSpriteY * TILE_HEIGHT * PLAYER_HEIGHT,
            TILE_WIDTH * PLAYER_WIDTH,
            TILE_HEIGHT * PLAYER_HEIGHT,
            offset[0] + TILE_WIDTH * (this.player.pos[0] - (PLAYER_WIDTH / 2)),
            offset[1] + TILE_HEIGHT * (this.player.pos[1] - PLAYER_HEIGHT),
            TILE_WIDTH * PLAYER_WIDTH,
            TILE_HEIGHT * PLAYER_HEIGHT,
        );

        // Player dash frames.
        this.player.dashPositions.forEach((pos) => {
            const [direction, x, y, opacity] = pos;
            ctx.globalAlpha = Math.max(0, opacity);
            ctx.drawImage(
                images.player.bitmap,
                // TODO: replace with ImageBitmap sprites.
                direction === PlayerDirection.Left? 0 : TILE_WIDTH * PLAYER_WIDTH,
                2 * TILE_HEIGHT * PLAYER_HEIGHT,
                TILE_WIDTH * PLAYER_WIDTH,
                TILE_HEIGHT * PLAYER_HEIGHT,
                offset[0] + TILE_WIDTH * (x - (PLAYER_WIDTH / 2)),
                offset[1] + TILE_HEIGHT * (y - PLAYER_HEIGHT),
                TILE_WIDTH * PLAYER_WIDTH,
                TILE_HEIGHT * PLAYER_HEIGHT,
            );
        });
        ctx.globalAlpha = 1;

        // Edit mode
        if (this.editModeEnabled) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.font = "32px sans-serif";
            ctx.fillText("Edit mode enabled", 10, 42);
            ctx.font = "16px sans-serif";
            ctx.fillText("Left click to place, right click to erase", 10, 62);
            if (this.editModeCursorPosition) {
                ctx.drawImage(
                    images.tiles.bitmap,
                    TILE_WIDTH * TILES[editModeSelectedTile].offset[0],
                    TILE_HEIGHT * TILES[editModeSelectedTile].offset[1],
                    TILE_WIDTH,
                    TILE_HEIGHT,
                    offset[0] + TILE_WIDTH * this.editModeCursorPosition[0],
                    offset[1] + TILE_HEIGHT * this.editModeCursorPosition[1],
                    TILE_WIDTH,
                    TILE_HEIGHT,
                );
            }
        }

        // Death animations.
        if (this.player.dead) {
            const center = [
                offset[0] + this.player.pos[0] * TILE_WIDTH,
                offset[1] + (this.player.pos[1] - (PLAYER_HEIGHT / 2)) * TILE_HEIGHT,
            ];
            let wipeSize;

            // Death circles.
            const circleCount = 8;
            const radius = Math.max(1, (0.3 - this.player.deathWipeProgress) * 100);
            const alpha = Math.max(0, 1 - (this.player.deathWipeProgress * 3));

            for (let i = 0; i < circleCount; i++) {
                const angle = ((Math.PI * 2) / circleCount) * i + (Math.PI * 2) * this.player.deathWipeProgress;
                ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.beginPath();
                ctx.arc(
                    center[0] + Math.cos(angle) * radius,
                    center[1] + Math.sin(angle) * radius,
                    7,
                    0,
                    2 * Math.PI,
                );
                ctx.fill();
            }


            // Death wipe.
            if (this.player.deathWipeProgress < 0.3) {
                wipeSize = 1 - (this.player.deathWipeProgress * 3.2);
            } else if (this.player.deathWipeProgress < 0.8) {
                wipeSize = 0.05;
            } else {
                wipeSize = Math.max(0, 0.05 * (1 - (this.player.deathWipeProgress - 0.8) / 0.1));
            }

            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(
                center[0],
                center[1],
                Math.max(ctx.canvas.width, ctx.canvas.height) * wipeSize,
                0,
                2 * Math.PI,
            );
            ctx.rect(ctx.canvas.width, 0, -ctx.canvas.width, ctx.canvas.height);
            ctx.fill();
        }
    }

    handlePlayerMovement() {
        const [vecx, vecy] = this.player.velocity;
        const dist = (vecx ** 2 + vecy ** 2) ** 0.5;
        const steps = Math.ceil(dist / PLAYER_MOVEMENT_STEP);
        const [stepVecx, stepVecy] = [vecx / steps, vecy / steps];

        const tile = (x: number, y: number) => {
            if (x < 0 || x >= this.level.width() || y < 0 || y >= this.level.height()) {
                return TileType.Blocking;
            } else {
                const tileId = this.level.columns[Math.floor(x)][Math.floor(y)];
                if (tileId !== null) {
                    return TILES[tileId].type;
                } else {
                    return TileType.None;
                }
            }
        }

        let hitLeftWall = false;
        let hitRightWall = false;
        let hitCeiling = false;
        let hitFloor = false;

        for (let step = 0; step < steps; step++) {
            let newx = this.player.pos[0] + stepVecx;
            let newy = this.player.pos[1] + stepVecy;

            const leftTileTypes = new Set([
                tile(newx - PLAYER_WIDTH / 2, this.player.pos[1] - PLAYER_MOVEMENT_STEP),
                tile(newx - PLAYER_WIDTH / 2, this.player.pos[1] - 2),
            ]);
            const rightTileTypes = new Set([
                tile(newx + PLAYER_WIDTH / 2, this.player.pos[1] - PLAYER_MOVEMENT_STEP),
                tile(newx + PLAYER_WIDTH / 2, this.player.pos[1] - 2),
            ]);
            hitLeftWall = leftTileTypes.has(TileType.Blocking);
            hitRightWall = rightTileTypes.has(TileType.Blocking);

            if (hitLeftWall || hitRightWall) {
                newx = this.player.pos[0];
            }

            const ceilingTileTypes = new Set([
                tile(newx + PLAYER_WIDTH / 2, newy - 2),
                tile(newx - PLAYER_WIDTH / 2, newy - 2),
            ]);
            const floorTileTypes = new Set([
                tile(newx + PLAYER_WIDTH / 2, newy - PLAYER_MOVEMENT_STEP),
                tile(newx - PLAYER_WIDTH / 2, newy - PLAYER_MOVEMENT_STEP),
            ]);

            hitCeiling = ceilingTileTypes.has(TileType.Blocking);
            hitFloor = floorTileTypes.has(TileType.Blocking);

            if (hitCeiling || hitFloor) {
                newy = this.player.pos[1];
            }

            this.player.pos[0] = newx;
            this.player.pos[1] = newy;

            const allTouchingTileTypes = new Set([
                ...leftTileTypes,
                ...rightTileTypes,
                ...floorTileTypes,
                ...ceilingTileTypes,
            ]);

            if (allTouchingTileTypes.has(TileType.Death)) {
                this.player.dead = true;
                return;
            } else if (allTouchingTileTypes.has(TileType.Jump)) {
                this.player.velocity[1] = -PLAYER_JUMP_VELOCITY * 1.5;
                this.player.hasDashAbility = true;
            }
        }

        if ((hitLeftWall && this.player.velocity[0] < 0) || (hitRightWall && this.player.velocity[0] > 0)) {
            this.player.velocity[0] = 0;
        }

        if (hitFloor) {
            if (this.player.velocity[1] > 0) {
                this.player.velocity[1] = 0;
            }

            this.player.ticksTouchingFloor++;
            if (this.player.ticksTouchingFloor > PLAYER_RESTORE_DASH_DELAY) {
                this.player.hasDashAbility = true;
            }
        } else {
            this.player.ticksTouchingFloor = 0;
        }

        if (hitCeiling && this.player.velocity[1] < 0) {
            this.player.velocity[1] = 0;
        }

        if (hitLeftWall) {
            this.player.atLeftWallTicks = PLAYER_WALL_JUMP_BUFFER_TICKS;
        } else {
            if (stepVecx !== 0) {
                this.player.atLeftWallTicks = 0;
            } else if (this.player.atLeftWallTicks > 0) {
                this.player.atLeftWallTicks--;
            }
        }

        if (hitRightWall) {
            this.player.atRightWallTicks = PLAYER_WALL_JUMP_BUFFER_TICKS;
        } else {
            if (stepVecx !== 0) {
                this.player.atRightWallTicks = 0;
            } else if (this.player.atRightWallTicks > 0) {
                this.player.atRightWallTicks--;
            }
        }
    }

    renderUI(controllerState: ControllerState | null = null) {
        this.root.render(<ZenithApp
            controllerState={controllerState}
            fps={this.fps}
            ticksPerFrame={this.ticksPerFrame}
            player={this.player}
        />);
    }

    getInputState(ctrlr: ControllerState | null): InputState {
        return {
            left: (ctrlr && (ctrlr.joystick.left || ctrlr.dpad.left)) || intersects(KEYBOARD_KEYS_LEFT, canvasKeysDown),
            down: (ctrlr && (ctrlr.joystick.down || ctrlr.dpad.down)) || intersects(KEYBOARD_KEYS_DOWN, canvasKeysDown),
            right: (ctrlr && (ctrlr.joystick.right || ctrlr.dpad.right)) || intersects(KEYBOARD_KEYS_RIGHT, canvasKeysDown),
            up: (ctrlr && (ctrlr.joystick.up || ctrlr.dpad.up)) || intersects(KEYBOARD_KEYS_UP, canvasKeysDown),
            jump: (ctrlr && ctrlr.buttons.a) || intersects(KEYBOARD_KEYS_JUMP, canvasKeysDown),
            dash: (ctrlr && (ctrlr.buttons.x || ctrlr.buttons.b)) || intersects(KEYBOARD_KEYS_DASH, canvasKeysDown),
        };
    }

    loop() {
        window.requestAnimationFrame(this.loop.bind(this));

        if (this.canvasCtx === null) {
            const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
            if (canvas !== null) {
                this.canvasCtx = canvas.getContext('2d');
            } else {
                // No canvas yet, wait until it's rendered.
                return;
            }
        }

        const gameOffset = this.gameOffset();

        // FPS logic.
        const now = window.performance.now();
        const elapsed = now - this.lastFrameMs;
        this.ticksPerFrame = Math.round(elapsed / TICK_MS);
        if (Math.floor(now / 1000) > Math.floor(this.lastFrameMs / 1000)) {
            this.fps = this.framesSinceLastSecond;
            this.framesSinceLastSecond = 0;
        }
        this.lastFrameMs = now;
        this.framesSinceLastSecond++;

        // Game logic.
        const controllerState = this.getControllerState();
        this.inputState.update(this.getInputState(controllerState));

        for (let tick = 0; tick < this.ticksPerFrame; tick++) {
            this.player.dashTicksRemaining = Math.max(0, this.player.dashTicksRemaining - 1);
            this.player.jumpTicksRemaining = Math.max(0, this.player.jumpTicksRemaining - 1);

            if (this.player.dead) {
                this.player.deathWipeProgress = Math.min(1, this.player.deathWipeProgress += PLAYER_DEATH_WIPE_PROGRESS);

                if (this.player.deathWipeProgress >= 1) {
                    this.player = new Player();
                }
            } else {
                if (this.player.dashTicksRemaining === 0) {
                    const [vecx, vecy] = vecxy(this.inputState);
                    if (vecx < 0) {
                        this.player.direction = PlayerDirection.Left;
                        this.player.velocity[0] = Math.max(-PLAYER_MAX_WALK_VELOCITY, this.player.velocity[0] - PLAYER_WALK_ACCEL);
                    } else if (vecx > 0) {
                        this.player.direction = PlayerDirection.Right;
                        this.player.velocity[0] = Math.min(PLAYER_MAX_WALK_VELOCITY, this.player.velocity[0] + PLAYER_WALK_ACCEL);
                    }

                    // Dash.
                    if (
                        this.inputState.dash &&
                        this.player.hasDashAbility &&
                        this.player.dashTicksRemaining === 0
                    ) {
                        const [dashVecx, dashVecy] = (vecy || vecy) ? [vecx, vecy] : [this.player.direction === PlayerDirection.Left ? -1 : 1, 0];
                        this.player.velocity[0] = PLAYER_DASH_VELOCITY * dashVecx;
                        this.player.velocity[1] = PLAYER_DASH_VELOCITY * dashVecy;
                        this.player.hasDashAbility = false;
                        this.player.dashTicksRemaining = PLAYER_DASH_HANG_TIME;
                        this.player.ticksTouchingFloor = 0;
                    }
                }

                // Jump.
                if (this.inputState.jump && this.player.jumpTicksRemaining === 0) {
                    if (this.player.ticksTouchingFloor > 0) {
                        this.player.velocity[1] = -PLAYER_JUMP_VELOCITY;
                        this.player.jumpTicksRemaining = PLAYER_JUMP_TICKS;
                    } else if (this.player.atLeftWallTicks > 0) {
                        if (this.inputState.left) {
                            // Holding left, go mainly right only.
                            this.player.velocity[0] = PLAYER_WALL_JUMP_VELOCITY * 1.5;
                            this.player.velocity[1] = -PLAYER_WALL_JUMP_VELOCITY * 0.5;
                        } else {
                            // Neutral jump, go up-right.
                            this.player.velocity[0] = PLAYER_WALL_JUMP_VELOCITY;
                            this.player.velocity[1] = -PLAYER_WALL_JUMP_VELOCITY;
                        }
                        this.player.jumpTicksRemaining = PLAYER_JUMP_TICKS;
                    } else if (this.player.atRightWallTicks > 0) {
                        if (this.inputState.right) {
                            // Holding right, go mainly left only.
                            this.player.velocity[0] = -PLAYER_WALL_JUMP_VELOCITY * 1.5;
                            this.player.velocity[1] = -PLAYER_WALL_JUMP_VELOCITY * 0.5;
                        } else {
                            // Neutral jump, go up-left.
                            this.player.velocity[0] = -PLAYER_WALL_JUMP_VELOCITY;
                            this.player.velocity[1] = -PLAYER_WALL_JUMP_VELOCITY;
                        }
                        this.player.jumpTicksRemaining = PLAYER_JUMP_TICKS;
                    }
                }

                if (this.player.dashTicksRemaining > 0) {
                    if (
                            this.player.dashPositions.length === 0 ||
                            this.player.dashPositions[this.player.dashPositions.length - 1][1] !== this.player.pos[0] ||
                            this.player.dashPositions[this.player.dashPositions.length - 1][2] !== this.player.pos[1]
                    ) {
                        this.player.dashPositions.push([
                            this.player.direction,
                            this.player.pos[0],
                            this.player.pos[1],
                            PLAYER_DASH_CONTRAIL_OPACITY,
                        ]);
                    }

                    if (this.player.dashTicksRemaining === 1) {
                        this.player.velocity[0] *= 0.7;
                        this.player.velocity[1] *= 0.4;
                    }
                } else {
                    if (this.player.velocity[0] > 0) {
                        this.player.velocity[0] = Math.max(0, this.player.velocity[0] - PLAYER_FRICTION_ACCEL);
                    } else if (this.player.velocity[0] < 0) {
                        this.player.velocity[0] = Math.min(0, this.player.velocity[0] + PLAYER_FRICTION_ACCEL);
                    }
                    this.player.velocity[1] += PLAYER_GRAVITY_ACCEL;
                }

                this.player.dashPositions = this.player.dashPositions
                    .map((p: DashPosition): DashPosition => [p[0], p[1], p[2], p[3] - PLAYER_DASH_CONTRAIL_FADE])
                    .filter(p => p[3] > 0);

                this.handlePlayerMovement();
            }

            this.inputState.tick();
        }

        // Edit mode.
        if (editModeEnabled && !this.editModeEnabled) {
            this.editModeEnabled = true;
            this.level.render(true);
        } else if (!editModeEnabled && this.editModeEnabled) {
            this.editModeEnabled = false;
            this.level.render(false);
        }

        if (this.editModeEnabled && canvasMouseX !== null && canvasMouseY !== null) {
            // TODO: ensure this is in the level.
            this.editModeCursorPosition = [
                Math.floor((canvasMouseX - gameOffset[0]) / TILE_WIDTH),
                Math.floor((canvasMouseY - gameOffset[1]) / TILE_WIDTH),
            ];

            if (
                this.editModeCursorPosition[0] < 0 ||
                this.editModeCursorPosition[0] >= this.level.width() ||
                this.editModeCursorPosition[1] < 0 ||
                this.editModeCursorPosition[1] >= this.level.height()
            ) {
                this.editModeCursorPosition = null;
            } else {
                const currentTile = this.level.columns[this.editModeCursorPosition[0]][this.editModeCursorPosition[1]];
                let newTile = currentTile;
                if (canvasMouseButtons & 1) {
                    newTile = editModeSelectedTile;
                } else if (canvasMouseButtons & 2) {
                    newTile = null;
                }

                if (newTile !== this.level.columns[this.editModeCursorPosition[0]][this.editModeCursorPosition[1]]) {
                    this.level.columns[this.editModeCursorPosition[0]][this.editModeCursorPosition[1]] = newTile;
                    // TODO: fix all boxes?
                    fixBoxEdges(this.level, DEFAULT_BOX);
                    fixBoxEdges(this.level, DEFAULT_SPIKES);
                    // TODO: implement some method to re-render only the changed tiles on top of the existing bitmap.
                    this.level.render(true);
                }
            }
        } else {
            this.editModeCursorPosition = null;
        }

        // Game render.
        if (this.canvasCtx !== null) {
            this.renderGame(gameOffset);
        }

        // UI render.
        this.renderUI(controllerState);
    }
}

const waitForAssetsToLoad = async () => {
    await Promise.all(Object.values(images).map(image => image.load));
};


const startup = () => {
    waitForAssetsToLoad()
        .catch((e) => {
            alert(`Could not load assets: ${e}`);
        })
        .then(() => {
            const container = document.createElement('div');
            container.id = 'container';
            document.body.appendChild(container);

            const game = new ZenithGame(container);
            game.run();
        });
};

startup();
