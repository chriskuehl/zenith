import React, { useState, useEffect, useRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { images } from './assets';
import "./css/main.css";
import JoystickCircleImage from './img/joystick.svg';

const FPS = 60;
const MS_PER_FRAME = 1000 / FPS;
const TILE_WIDTH = 16;
const TILE_HEIGHT = 16;

const PLAYER_WIDTH = 2;
const PLAYER_HEIGHT = 3;
const PLAYER_ACCEL = 0.2;
const PLAYER_MAX_VELOCITY = 2;
const PLAYER_DASH_VELOCITY = 1.2;
const PLAYER_DASH_TIMING_MS = MS_PER_FRAME * 6;

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
    return <p>
        Pos: ({player.pos[0].toFixed(1)}, {player.pos[1].toFixed(1)})
        Velocity: ({player.velocity[0].toFixed(1)}, {player.velocity[1].toFixed(1)})
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
                    <li>No controller connected.</li>
                }
            </ul>
        </div>
    </>;
};

type ZenithAppProps = {
    fps: number;
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
            <p>FPS: {props.fps}</p>
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
    pos = [0, 0];
    velocity = [0, 0];
    direction = PlayerDirection.Right;
    lastDashTimeMs: number | null = null;
    isMidDash = false;
    hasDashAbility = true;
};

class ZenithGame {
    root: Root;
    lastFrameMs = 0;
    framesSinceLastSecond = 0;
    fps = 0;
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

        const deflection = (gamepad.axes[0]**2 + gamepad.axes[1]**2)**0.5;
        if (deflection > 0.7) {
            let angle = Math.atan2(gamepad.axes[1], gamepad.axes[0]) + Math.PI/8;
            console.log("before:", angle);
            if (angle < 0) {
                angle = 2 * Math.PI + angle;
            }
            console.log("after:", angle);

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
        const elapsed = this.lastFrameMs - now;
        if (Math.floor(now / 1000) > Math.floor(this.lastFrameMs / 1000)) {
            this.fps = this.framesSinceLastSecond;
            this.framesSinceLastSecond = 0;
        }
        this.lastFrameMs = now;
        this.framesSinceLastSecond++;

        // Game logic.
        this.player.isMidDash = this.player.lastDashTimeMs ?  (now - this.player.lastDashTimeMs) < PLAYER_DASH_TIMING_MS : false;
        const controllerState = this.getControllerState();

        if (controllerState) {
            const [vecx, vecy] = vecxy(controllerState);
            if (vecx < 0) {
                this.player.direction = PlayerDirection.Left;
                if (this.player.velocity[0] > -PLAYER_MAX_VELOCITY) {
                    this.player.velocity[0] = Math.max(-PLAYER_MAX_VELOCITY, this.player.velocity[0] - PLAYER_ACCEL);
                }
            } else if (vecx > 0) {
                this.player.direction = PlayerDirection.Right;
                if (this.player.velocity[0] < PLAYER_MAX_VELOCITY) {
                    this.player.velocity[0] = Math.min(PLAYER_MAX_VELOCITY, this.player.velocity[0] + PLAYER_ACCEL);
                }
            }

            // Jump.
            if (controllerState.buttons.a) {
                if (this.player.pos[1] === 40) {
                    this.player.velocity[1] = -1.2;
                } else if (this.player.pos[0] === PLAYER_WIDTH/2) {
                    this.player.velocity[0] = 1.2;
                    this.player.velocity[1] = -1.2;
                } else if (this.player.pos[0] === 90 - PLAYER_WIDTH/2) {
                    this.player.velocity[0] = -1.2;
                    this.player.velocity[1] = -1.2;
                }
            }

            // Super jump.
            if (controllerState.buttons.y && this.player.pos[1] === 40) {
                this.player.velocity[1] = -2;
            }

            // Dash.
            if ((controllerState.buttons.x || controllerState.buttons.b) && this.player.hasDashAbility && !this.player.isMidDash) {
                const [dashVecx, dashVecy] = (vecy || vecy) ? [vecx, vecy] : [this.player.direction === PlayerDirection.Left ? -1 : 1, 0];
                this.player.velocity[0] = PLAYER_DASH_VELOCITY * dashVecx;
                this.player.velocity[1] = PLAYER_DASH_VELOCITY * dashVecy;
                this.player.hasDashAbility = false;
                this.player.lastDashTimeMs = now;
                this.player.isMidDash = true;
            }
        }

        if (!this.player.isMidDash) {
            this.player.velocity[0] *= 0.7;
            this.player.velocity[1] += 0.1;  // More realistic velocity changes, plus make it reset to zero when hitting the floor.
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
