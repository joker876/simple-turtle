import { EventEmitter } from 'events';
import { Color, ColorResolvable, convertToColor } from './colors';
import {
    Vertex2D,
    rotateShape,
    degToRad,
    BuiltInShapes,
    resizeShape,
} from './shapes';
import { TurtleEvents, TurtleStepType, TurtleStep } from './steps';

/**
 * Clears a canvas.
 */
function clearContext(context: CanvasRenderingContext2D) {
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    context.restore();
}

function centerCoordinates(ctx: CanvasRenderingContext2D): void {
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.transform(1, 0, 0, -1, 0, 0);
}

/**
 * Represents a remapping of method's names when exposing them onto a JavaScript object.
 *
 * @see {@link Turtle.expose}
 */

export interface ExposeRemap {
    forward?: string;
    backward?: string;
    left?: string;
    right?: string;
    hide?: string;
    show?: string;
    penUp?: string;
    penDown?: string;
    penToggle?: string;
    clear?: string;
    reset?: string;
    goto?: string;
    setAngle?: string;
    setColor?: string;
    setWidth?: string;
    setSpeed?: string;
    setShape?: string;
    setLineCap?: string;
}

/**
 * A set of options to apply to a Turtle instance.
 */
export interface TurtleOptions {
    /**
     * Wether the turtle should be hidden.
     *
     * @default false
     */
    hidden?: boolean;

    /**
     * Wether or not to disable wrapping the turtle around the canvas.
     * The turtle goes around when overflowing.
     *
     * @default false
     */
    disableWrapping?: boolean;

    /**
     * The default drawing color.
     *
     * @default '[255, 0, 255]'
     */
    defaultColor?: ColorResolvable;

    /**
     * The default drawing width.
     *
     * @default 2
     */
    width?: number;

    /**
     * The position on which to start drawing.
     *
     * @default '{x: 0, y: 0}'
     */
    startPostition?: Vertex2D;

    /**
     * The angle at which to start drawing.
     *
     * @default 0
     */
    startAngle?: number;

    /**
     * The shape of the turtle.
     *
     * @default BuiltInShapes.Default
     */
    shape?: Vertex2D[];

    /**
     * The default lineCap value.
     *
     * @default 'round'
     */
    lineCap?: CanvasLineCap;

    /**
     * The size modifier of the turtle.
     */
    turtleSizeModifier?: number;

    /**
     * If the turtle should automatically draw on creation.
     *
     * @default true
     */
    autoDraw?: boolean;
}

export interface Turtle {
    on<U extends keyof TurtleEvents>(event: U, listener: TurtleEvents[U]): this;
    emit<U extends keyof TurtleEvents>(
        event: U,
        ...args: Parameters<TurtleEvents[U]>
    ): boolean;
}

/**
 * A Turtle to draw on a canvas.
 */
export class Turtle extends EventEmitter {
    /**
     * The turtle's Canvas 2D context.
     */
    readonly ctx: CanvasRenderingContext2D;

    /**
     * Wether or not the turtle is hidden.
     */
    private _hidden: boolean = false;

    /**
     * Wether or not to wrap the turtle around the canvas.
     * The turtle goes around when overflowing.
     */
    private _wrap: boolean = true;

    /**
     * Determines if the turtle draws on the canvas or not.
     */
    private _isPenDown: boolean = true;

    /**
     * Canvas Image data before drawing the turtle.
     */
    private _preDrawData?: ImageData;

    /**
     * Wether or not the Turtle is in Step by Step mode.
     * Enabled using {@link Turtle.setSpeed}.
     */
    private _stepByStep: boolean = false;

    /**
     * Whether or not the Turtle is currently perfoming a step.
     * Use {@link Turtle.isInStep} instead.
     */
    private _step: boolean = false;

    /**
     * The queue of steps do execute.
     */
    private _steps: TurtleStep[] = [];

    /**
     * The delay in ms between each steps.
     */
    private _speed?: number;

    /**
     * The timer identifier for the step interval.
     */
    private _interval?: NodeJS.Timer;

    /**
     * The Color object representing the current color of the turtle.
     */
    private _color: Color = new Color([255, 0, 255]);
    private _defaultColor: Color = new Color([255, 0, 255]);

    /**
     * The current width of the turtle's drawing.
     */
    private _width: number = 1;

    /**
     * The size modifier of the turtle.
     */
    private readonly _turtleSizeModifier: number = 1;

    /**
     * The current X/Y position of the turtle on the canvas.
     */
    private _position: Vertex2D = { x: 0, y: 0 };

    /**
     * The current angle of the turtle.
     */
    private _angle: number = 0;

    /**
     * The shape of the turtle which is drawn with the `.draw` method.
     *
     * Represented by an array of 2D vertices (X/Y coordinates) defining
     * the boundaries of the shape.
     */
    private _shape: Vertex2D[] = BuiltInShapes.Default;
    
    /**
     * Wether or not the turtle is doing a step.
     */
    get isInStep(): boolean {
        return !this._stepByStep || this._step;
    }

    /**
     * Execute a certain step.
     *
     * @param step The step to execute
     * @returns {Turtle} `Turtle` for method chaining.
     */
    private doStep(step: TurtleStep): Turtle {
        this.emit('step', step);
        if (step.type === TurtleStepType.Goto) this.goto(...step.args);
        if (step.type === TurtleStepType.SetAngle) this.setAngle(...step.args);
        if (step.type === TurtleStepType.Forward) this.forward(...step.args);
        if (step.type === TurtleStepType.Left) this.left(...step.args);
        if (step.type === TurtleStepType.Right) this.right(...step.args);
        if (step.type === TurtleStepType.Hide) this.hide();
        if (step.type === TurtleStepType.Show) this.show();
        if (step.type === TurtleStepType.PenDown) this.penDown();
        if (step.type === TurtleStepType.PenUp) this.penUp();
        if (step.type === TurtleStepType.Reset) this.reset();
        if (step.type === TurtleStepType.Clear) this.clear();
        if (step.type === TurtleStepType.SetColor) this.setColor(...step.args);
        if (step.type === TurtleStepType.SetWidth) this.setWidth(...step.args);
        if (step.type === TurtleStepType.SetSpeed) this.setSpeed(...step.args);
        if (step.type === TurtleStepType.SetShape) this.setShape(...step.args);
        if (step.type === TurtleStepType.SetLineCap) this.setLineCap(...step.args);
        return this;
    }

    /**
     * Execute the next step in the queue. Call this method to skip the interval.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    private nextStep(): Turtle {
        const step = this._steps.shift();
        if (step) {
            this._step = true;
            this.doStep(step);
            this._step = false;
        } else if (this._interval) {
            clearInterval(this._interval);
            this._interval = undefined;
        }

        return this;
    }

    /**
     * Wipes out the canvas.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    clear(): Turtle {
        if (this.isInStep) {
            this._clear();
            this.emit('clear');
        } else this._steps.push({ type: TurtleStepType.Clear });

        return this;
    }
    private _clear() {
        clearContext(this.ctx);
        this.drawTurtle();
    }

    /**
     * Hide the turtle.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    hide(): Turtle {
        if (this.isInStep) {
            this._hide();
            this.emit('hide');
        } else this._steps.push({ type: TurtleStepType.Hide });
        return this;
    }
    private _hide() {
        this._hidden = true;
        this.restoreImageData();
        this.drawTurtle();
    }

    /**
     * Show the turtle.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    show(): Turtle {
        if (this.isInStep) {
            this._show();
            this.emit('show');
        } else this._steps.push({ type: TurtleStepType.Show });
        return this;
    }
    private _show() {
        this._hidden = false;
        this.drawTurtle();
    }

    /**
     * Reset the turtle and the canvas.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    reset(): Turtle {
        if (this.isInStep) {
            this._reset();
            this.emit('reset');
        } else this._steps.push({ type: TurtleStepType.Reset });
        return this;
    }
    private _reset() {
        this._hidden = false;
        this._isPenDown = true;
        this._stepByStep = false;
        this.setWidth(1);
        this.setColor(this._defaultColor);
        this.setAngle(0);
        this.goto(0, 0);
        this.clear();
    }

    /**
     * Change the shape used to draw the turtle.
     *
     * @param shape An array of X/Y coordinates.
     * @returns {Turtle} `Turtle` for method chaining.
     */
    setShape(shape: Vertex2D[]): Turtle {
        if (this.isInStep) {
            this._setShape(shape);
            this.emit('setShape', shape);
        } else this._steps.push({ type: TurtleStepType.SetShape, args: [shape] });
        return this;
    }
    private _setShape(shape: Vertex2D[]): void {
        this._shape = shape;
        this.drawTurtle();
    }

    /**
     * Enable Step by Step mode and set the delay in ms between each steps.
     *
     * @param ms The delay between each steps
     * @returns {Turtle} `Turtle` for method chaining.
     */
    setSpeed(ms: number): Turtle {
        if (this.isInStep) {
            this._setSpeed(ms);
            this.emit('setSpeed', ms);
        } else this._steps.push({ type: TurtleStepType.SetSpeed, args: [ms] });
        return this;
    }
    private _setSpeed(ms: number): void {
        this._stepByStep = ms > 0;
        this._speed = ms;

        if (this._interval) clearInterval(this._interval);

        this._interval = setInterval(this.nextStep.bind(this), this._speed);
    }

    /**
     * Puts the pen up to stop drawing.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    penUp(): Turtle {
        if (this.isInStep) {
            this._penUp();
            this.emit('penUp');
        } else this._steps.push({ type: TurtleStepType.PenUp });
        return this;
    }
    private _penUp(): void {
        this._isPenDown = false;
    }

    /**
     * Puts the pen down to start drawing.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    penDown(): Turtle {
        if (this.isInStep) {
            this._penDown();
            this.emit('penDown');
        } else this._steps.push({ type: TurtleStepType.PenDown });
        return this;
    }
    private _penDown(): void {
        this._isPenDown = true;
    }

    /**
     * Inverts the position of the pen.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    penToggle(): Turtle {
        if (this.isInStep) {
            this._penToggle();
            this.emit('penToggle', this._isPenDown);
        } else this._steps.push({ type: TurtleStepType.PenDown });
        return this;
    }
    private _penToggle(): void {
        this._isPenDown = !this._isPenDown;
    }

    /**
     * Sets a new color to be used for drawing.
     *
     * @param color Any value resolvable to a color.
     * @returns {Turtle} `Turtle` for method chaining.
     */
    setColor(color: ColorResolvable): Turtle {
        if (this.isInStep) {
            this._setColor(color);
            this.emit('setColor', this._color);
        } else this._steps.push({ type: TurtleStepType.SetColor, args: [color] });
        return this;
    }
    private _setColor(color: ColorResolvable): void {
        this._color = convertToColor(color);
        this.restoreImageData();
        this.drawTurtle();
    }

    /**
     * Sets a new width to be used for drawing lines.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    setWidth(size: number): Turtle {
        if (this.isInStep) {
            this._setWidth(size);
            this.emit('setWidth', size);
        } else this._steps.push({ type: TurtleStepType.SetWidth, args: [size] });
        return this;
    }
    private _setWidth(size: number): void {
        this._width = size;
        this.restoreImageData();
        this.drawTurtle();
    }

    /**
     * Change the line cap style of the lines being drawn.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    setLineCap(cap: CanvasLineCap): Turtle {
        if (this.isInStep) {
            this._setLineCap(cap);
            this.emit('setLineCap', cap);
        } else this._steps.push({ type: TurtleStepType.SetLineCap, args: [cap] });
        return this;
    }
    private _setLineCap(cap: CanvasLineCap): void {
        this._lineCap = cap;
    }

    /**
     * Set the turtle to this angle.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    setAngle(degrees: number): Turtle {
        if (this.isInStep) {
            this._setAngle(degrees);
            this.emit('setAngle', degrees);
        } else this._steps.push({ type: TurtleStepType.SetAngle, args: [degrees] });
        return this;
    }
    private _setAngle(degrees: number): void {
        this._angle = degrees;
        this.restoreImageData();
        this.drawTurtle();
    }

    /**
     * Rotate the turtle on the left.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    left(degrees: number): Turtle {
        if (this.isInStep) {
            this._left(degrees);
            this.emit('left', degrees);
        } else this._steps.push({ type: TurtleStepType.Left, args: [degrees] });
        return this;
    }
    private _left(degrees: number): void {
        this._angle -= degrees;
        this.restoreImageData();
        this.drawTurtle();
    }

    /**
     * Rotate the turtle on the right.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    right(degrees: number): Turtle {
        if (this.isInStep) {
            this._right(degrees);
            this.emit('right', degrees);
        } else this._steps.push({ type: TurtleStepType.Right, args: [degrees] });
        return this;
    }
    private _right(degrees: number): void {
        this._angle -= degrees;
        this.restoreImageData();
        this.drawTurtle();
    }

    /**
     * Sends the turtle at a new position.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    goto(x: number, y: number): Turtle {
        if (this.isInStep) {
            this._goto(x, y);
            this.emit('goto', x, y);
        } else this._steps.push({ type: TurtleStepType.Goto, args: [x, y] });
        return this;
    }
    private _goto(x: number, y: number): void {
        this._position.x = x;
        this._position.y = y;
        this.restoreImageData();
        this.drawTurtle();
    }
    
    private _doStraightLine(distance: number) {
        this.restoreImageData();
        this.ctx.save();
        centerCoordinates(this.ctx);
        this.ctx.lineWidth = this._width;
        this.ctx.strokeStyle = this._color.toRGBA();
        if (this._isPenDown) this.ctx.beginPath();
        const cosAngle = Math.cos(degToRad(this._angle));
        const sinAngle = Math.sin(degToRad(this._angle));
        const w = this.ctx.canvas.width / 2;
        const h = this.ctx.canvas.height / 2;

        let x = this._position.x;
        let y = this._position.y;
        let newX = x + sinAngle * distance;
        let newY = y + cosAngle * distance;

        this.ctx.moveTo(x, y);

        while (distance > 0) {
            const distanceToEdgeX = Math.abs((newX > x ? w - x : w + x) / sinAngle);
            const distanceToEdgeY = Math.abs((newY > y ? h - y : h + y) / cosAngle);

            this.ctx.moveTo(x, y);
            if (
                // Crossing X boundaries
                this._wrap &&
                Math.abs(newX) > w &&
                distanceToEdgeX <= distanceToEdgeY
            ) {
                x = newX > 0 ? -w : w;
                y += cosAngle * distanceToEdgeX;
                this.ctx.lineTo(newX, newY);
                newX -= newX > 0 ? w * 2 : -(w * 2);
                distance -= distanceToEdgeX;
            } else if (
                // Crossing Y boundaries
                this._wrap &&
                Math.abs(newY) > h &&
                distanceToEdgeX >= distanceToEdgeY
            ) {
                y = newY > 0 ? -h : h;
                x += sinAngle * distanceToEdgeY;
                this.ctx.lineTo(newX, newY);
                newY -= newY > 0 ? h * 2 : -(h * 2);
                distance -= distanceToEdgeY;
            } else {
                // Does not cross any boundary
                this.ctx.lineTo(newX, newY);
                distance = 0;
            }
        }

        if (this._isPenDown) this.ctx.stroke();
        this.ctx.restore();
        this.saveImageData();
        this.goto(newX, newY);
    }
    /**
     * Makes the turtle walk forward and draw a line.
     *
     * @param distance The distance in pixels for the turtle to travel.
     * @returns {Turtle} `Turtle` for method chaining.
     */
    forward(distance: number): Turtle {
        if (this.isInStep) {
            this._forward(distance);
            this.emit('forward', distance);
        } else this._steps.push({ type: TurtleStepType.Forward, args: [distance] });
        return this;
    }
    private _forward(distance: number): void {
        this._doStraightLine(distance);
    }
    /**
     * Makes the turtle walk forward and draw a line.
     *
     * @param distance The distance in pixels for the turtle to travel.
     * @returns {Turtle} `Turtle` for method chaining.
     */
    backward(distance: number): Turtle {
        if (this.isInStep) {
            this._backward(distance);
            this.emit('backward', distance);
        } else this._steps.push({ type: TurtleStepType.Backward, args: [distance] });
        return this;
    }
    private _backward(distance: number): void {
        this._doStraightLine(-distance);
    }

    //! helper methods
    /**
     * Draws the turtle (The arrow).
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    drawTurtle(): Turtle {
        this.saveImageData();
        if (this._hidden) return this;

        const proportionalSize = Math.max(this._width / 2, 1) * this._turtleSizeModifier;

        const shape = rotateShape(
            resizeShape(this._shape, proportionalSize),
            this._angle
        );

        const x = this._position.x;
        const y = this._position.y;

        this.ctx.save();
        centerCoordinates(this.ctx);

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);

        for (let i = 0; i < shape.length; i++) {
            const vertex = shape[i];
            if (vertex) this.ctx.lineTo(x + vertex.x, y + vertex.y);
        }

        this.ctx.closePath();

        this.ctx.fillStyle = this._color.toHex();
        this.ctx.fill();
        this.ctx.lineWidth = Math.max(this._width / 4, 1);
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();
        this.ctx.restore();
        return this;
    }

    /**
     * Saves the current image into {@link Turtle._preDrawData}.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    saveImageData(): Turtle {
        this._preDrawData = this.ctx.getImageData(
            0,
            0,
            this.ctx.canvas.width,
            this.ctx.canvas.height
        );

        return this;
    }

    /**
     * Restores the image from {@link Turtle._preDrawData}.
     *
     * @returns {Turtle} `Turtle` for method chaining.
     */
    restoreImageData(): Turtle {
        if (this._preDrawData) this.ctx.putImageData(this._preDrawData, 0, 0);
        return this;
    }

    /**
     * Draws a grid on the Canvas. Pretty useful to be precise.
     *
     * @param separations The number of separations on the grid.
     * @returns {Turtle} `Turtle` for method chaining.
     */
    drawGrid(separations: number): Turtle {
        // Make it minimum 2
        separations = Math.max(2, separations);

        this._step = true;
        const oldAngle = this._angle;
        const oldColor = this._color;
        const oldWidth = this._width;
        const oldX = this._position.x;
        const oldY = this._position.y;
        const w = this.ctx.canvas.width;
        const h = this.ctx.canvas.height;

        this.setColor('grey');
        this.setWidth(2);

        for (let i = 1; i < separations; i++) {
            this.setAngle(90);
            this.goto(-(w / 2), h - (h / separations) * i - h / 2);
            this.forward(w);
            this.setAngle(180);
            this.goto(w - (w / separations) * i - w / 2, h / 2);
            this.forward(h);
        }

        this.setAngle(oldAngle);
        this.setColor(oldColor);
        this.setWidth(oldWidth);
        this.goto(oldX, oldY);
        this.ctx.restore();
        this._step = false;
        return this;
    }
    private set _lineCap(cap: CanvasLineCap) {
        this.ctx.lineCap = cap;
    }

    /**
     * Expose the Turtle's methods onto an object.
     * This is very useful for example when using it with the `window` object,
     * abstracting method calls to simple functions calls.
     *
     * @param obj Any JavaScript Object
     * @param remap A remap object to remap method's names
     * @returns {Turtle} `Turtle` for method chaining.
     */
    expose(obj: any, remap?: ExposeRemap): Turtle {
        obj[remap?.forward ?? 'forward'] = this.forward.bind(this);
        obj[remap?.backward ?? 'backward'] = this.backward.bind(this);
        obj[remap?.left ?? 'left'] = this.left.bind(this);
        obj[remap?.right ?? 'right'] = this.right.bind(this);
        obj[remap?.setAngle ?? 'setAngle'] = this.setAngle.bind(this);
        obj[remap?.hide ?? 'hide'] = this.hide.bind(this);
        obj[remap?.show ?? 'show'] = this.show.bind(this);
        obj[remap?.penUp ?? 'penUp'] = this.penUp.bind(this);
        obj[remap?.penDown ?? 'penDown'] = this.penDown.bind(this);
        obj[remap?.reset ?? 'reset'] = this.reset.bind(this);
        obj[remap?.clear ?? 'clear'] = this.clear.bind(this);
        obj[remap?.goto ?? 'goto'] = this.goto.bind(this);
        obj[remap?.setColor ?? 'setColor'] = this.setColor.bind(this);
        obj[remap?.setWidth ?? 'setWidth'] = this.setWidth.bind(this);
        obj[remap?.setShape ?? 'setShape'] = this.setShape.bind(this);
        obj[remap?.setSpeed ?? 'setSpeed'] = this.setSpeed.bind(this);
        obj[remap?.setLineCap ?? 'setLineCap'] = this.setLineCap.bind(this);
        return this;
    }
    /**
     * Expose one of the Turtle's methods onto an object.
     * This is very useful for example when using it with the `window` object,
     * abstracting method calls to simple functions calls.
     *
     * @param obj Any JavaScript Object
     * @param method The name of the method to remap.
     * @param remapName The remapped method's name on the object.
     * @returns {Turtle} `Turtle` for method chaining.
     */
    exposeSingle(obj: any, method: keyof ExposeRemap, remapName: string) {
        obj[remapName] = this[method].bind(this);
    }

    constructor(context: CanvasRenderingContext2D, options?: TurtleOptions) {
        super();
        this.ctx = context;
        this._lineCap = 'round';

        if (options?.hidden) {
            this._hidden = options.hidden;
        }
        if (options?.disableWrapping) {
            this._wrap = false;
        }
        if (options?.defaultColor) {
            this._defaultColor = convertToColor(options.defaultColor)
            this._color = this._defaultColor;
        }
        if (options?.width) {
            this._width = options.width;
        }
        if (options?.startPostition) {
            this._position = options.startPostition;
        }
        if (options?.startAngle) {
            this._angle = options.startAngle;
        }
        if (options?.shape) {
            this._shape = options.shape;
        }
        if (options?.lineCap) {
            this._lineCap = options.lineCap;
        }
        if (options?.turtleSizeModifier) {
            this._turtleSizeModifier = options.turtleSizeModifier;
        }
        if (options?.autoDraw) {
            this.drawTurtle();
        }
    }
}
