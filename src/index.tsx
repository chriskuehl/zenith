import React, { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { images } from './assets';
import "./css/main.css";
import JoystickCircleImage from './img/joystick.svg';

const TICKS_PER_SECOND = 360;
const TICK_MS = 1000 / TICKS_PER_SECOND;
const TILE_WIDTH = 16;
const TILE_HEIGHT = 16;

const PLAYER_WIDTH = 2;
const PLAYER_HEIGHT = 3;
const PLAYER_WALK_ACCEL = 0.02;  // Tiles per tick per tick.
const PLAYER_DASH_VELOCITY = 1;  // Tiles per tick.
// TODO: remove this if we can make horiz/vertical deccel more consistent.
const PLAYER_DASH_VELOCITY_VERTICAL_MULTIPLIER = 0.5; // Multiplier on vertical velocity.
// TODO: rename this if we decide not to restore hang time.
const PLAYER_DASH_HANG_TIME = 30; // Ticks.
const PLAYER_AIR_FRICTION = 0.9; // Horizontal acceleration multiplier per tick.
const PLAYER_GRAVITY_ACCEL = 0.0025; // Tiles per tick per tick.
const PLAYER_JUMP_VELOCITY = 0.2; // Tiles per tick.
const PLAYER_WALL_JUMP_VELOCITY = PLAYER_JUMP_VELOCITY; //(2 * (PLAYER_JUMP_VELOCITY ** 2)) ** 0.5; // Tiles per tick.

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

const PlayerStatDisplay: React.FC<{player: Player}> = ({player}) => {
    let hasDash;
    if (player.dashTicksRemaining > 0) {
        hasDash = <span className="dash dashing">Dashing</span>;
    } else if (player.hasDashAbility) {
        hasDash = <span className="dash has-dash">Has Dash</span>;
    } else {
        hasDash = <span className="dash no-dash">No Dash</span>;
    }

    return <p className="player-stats">
        Pos: ({player.pos[0].toFixed(1)}, {player.pos[1].toFixed(1)})
        Velocity: ({player.velocity[0].toFixed(1)}, {player.velocity[1].toFixed(1)})
        Dash: {hasDash}
    </p>;
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

const ControllerDisplay: React.FC<{state: ControllerState | null}> = ({state}) => {
    return <>
        <p>Controller state:</p>
        <div className="controller-display">
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
        </div>
    </>;
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

    return <div className="zenith">
        <div className="top-bar">
            <p>FPS: {props.fps} Ticks/Frame: {props.ticksPerFrame}</p>
            <PlayerStatDisplay player={props.player} />
            <ControllerDisplay state={props.controllerState} />
        </div>
        <div className="content" ref={contentRef}>
            <canvas width={canvasSize[0]} height={canvasSize[1]} id="game-canvas" />
        </div>
    </div>;
};

const vecxy = (state: ControllerState): [number, number] => {
    let vecx = 0;
    let vecy = 0;

    if (state.dpad.left || state.joystick.left) {
        vecx = -1;
    } else if (state.dpad.right || state.joystick.right) {
        vecx = 1;
    }

    if (state.dpad.up || state.joystick.up) {
        vecy = -1;
    } else if (state.dpad.down || state.joystick.down) {
        vecy = 1;
    }

    const dist = (vecx ** 2 + vecy ** 2) ** 0.5;
    return [vecx / dist, vecy / dist];
};

enum PlayerDirection {
    Left,
    Right,
}

class Player {
    pos = [45, 0];
    velocity = [0, 0];
    direction = PlayerDirection.Right;
    dashTicksRemaining = 0;
    hasDashAbility = true;
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

    constructor(container: HTMLDivElement) {
        this.root = createRoot(container);
    }

    run() {
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

        this.gamepadIndex = gamepad.index;
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

        const levelWidth = 90 * TILE_WIDTH;
        const levelHeight = 40 * TILE_HEIGHT;

        // For now just center it, even if it doesn't fit...
        return [
            (ctx.canvas.width - levelWidth) / 2,
            (ctx.canvas.height - levelHeight) / 2,
        ];
    }

    renderGame() {
        const ctx = this.canvasCtx!;

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        const width = 90;
        const height = 40;
        const offset = this.gameOffset();

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                ctx.drawImage(images.grid, TILE_WIDTH * ((x + y) % 2), 0, TILE_WIDTH, TILE_HEIGHT, offset[0] + x * TILE_WIDTH, offset[1] + y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT);
            }
        }

        ctx.drawImage(images.player, this.player.direction === PlayerDirection.Left ? 0 : TILE_WIDTH * PLAYER_WIDTH, 0, TILE_WIDTH * PLAYER_WIDTH, TILE_HEIGHT * PLAYER_HEIGHT, offset[0] + TILE_WIDTH * (this.player.pos[0] - (PLAYER_WIDTH / 2)), offset[1] + TILE_HEIGHT * (this.player.pos[1] - PLAYER_HEIGHT), TILE_WIDTH * PLAYER_WIDTH, TILE_HEIGHT * PLAYER_HEIGHT);
    }

    loop() {
        window.requestAnimationFrame(this.loop.bind(this));

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

        for (let tick = 0; tick < this.ticksPerFrame; tick++) {
            this.player.dashTicksRemaining = Math.max(0, this.player.dashTicksRemaining - 1);
            if (controllerState) {
                const [vecx, vecy] = vecxy(controllerState);
                if (vecx < 0) {
                    this.player.direction = PlayerDirection.Left;
                    this.player.velocity[0] -= PLAYER_WALK_ACCEL;
                } else if (vecx > 0) {
                    this.player.direction = PlayerDirection.Right;
                    this.player.velocity[0] += PLAYER_WALK_ACCEL;
                }

                // Jump.
                if (controllerState.buttons.a) {
                    if (this.player.pos[1] === 40) {
                        this.player.velocity[1] = -PLAYER_JUMP_VELOCITY;
                    } else if (this.player.pos[0] === PLAYER_WIDTH/2) {
                        this.player.velocity[0] = PLAYER_WALL_JUMP_VELOCITY;
                        this.player.velocity[1] = -PLAYER_WALL_JUMP_VELOCITY;
                    } else if (this.player.pos[0] === 90 - PLAYER_WIDTH/2) {
                        this.player.velocity[0] = -PLAYER_WALL_JUMP_VELOCITY;
                        this.player.velocity[1] = -PLAYER_WALL_JUMP_VELOCITY;
                    }
                }

                // Dash.
                if (
                    (controllerState.buttons.x || controllerState.buttons.b) &&
                    this.player.hasDashAbility &&
                    this.player.dashTicksRemaining === 0
                ) {
                    const [dashVecx, dashVecy] = (vecy || vecy) ? [vecx, vecy] : [this.player.direction === PlayerDirection.Left ? -1 : 1, 0];
                    this.player.velocity[0] = PLAYER_DASH_VELOCITY * dashVecx;
                    this.player.velocity[1] = PLAYER_DASH_VELOCITY * dashVecy * PLAYER_DASH_VELOCITY_VERTICAL_MULTIPLIER;
                    this.player.hasDashAbility = false;
                    this.player.dashTicksRemaining = PLAYER_DASH_HANG_TIME;
                }
            }

            if (this.player.dashTicksRemaining > 0) {
                // TODO: figure out how to fix this to not suck.
                this.player.velocity[0] *= 0.95;
                this.player.velocity[1] += 0.0025;
            } else {
                this.player.velocity[0] *= PLAYER_AIR_FRICTION;
                this.player.velocity[1] += PLAYER_GRAVITY_ACCEL;
            }

            // TODO: replace with collision code
            this.player.pos[0] = Math.max(PLAYER_WIDTH/2, Math.min(90 - PLAYER_WIDTH/2, this.player.pos[0] + this.player.velocity[0]));
            this.player.pos[1] = Math.max(0, Math.min(40, this.player.pos[1] + this.player.velocity[1]));

            if (Math.abs(this.player.velocity[0]) < 0.001 || this.player.pos[0] === PLAYER_WIDTH/2 || this.player.pos[0] === 90 - PLAYER_WIDTH/2) {
                this.player.velocity[0] = 0;
            }

            if (this.player.pos[1] === 40) {
                this.player.velocity[1] = 0;
                this.player.hasDashAbility = true;
            }
        }

        // Game render.
        if (this.canvasCtx === null) {
            const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
            if (canvas !== null) {
                this.canvasCtx = canvas.getContext('2d');
            }
        }

        if (this.canvasCtx !== null) {
            this.renderGame();
        }

        // UI render.
        this.root.render(<ZenithApp
            controllerState={controllerState}
            fps={this.fps}
            ticksPerFrame={this.ticksPerFrame}
            player={this.player}
        />);
    }
}


const startup = () => {
    const container = document.createElement('div');
    container.id = 'container';
    document.body.appendChild(container);

    const game = new ZenithGame(container);
    game.run();
};

startup();
