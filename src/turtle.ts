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
 * The different styles of the end caps for drawn lines.
 *
 * @note The value "round" and "square" make the lines slightly longer.
 *
 * @see https://www.w3schools.com/TAgs/canvas_linecap.asp
 */
export type LineCap = 'butt' | 'round' | 'square';

/**
 * Represents a remapping of method's names when exposing them onto a JavaScript object.
 *
 * @see {@link Turtle.expose}
 */

export interface ExposeRemap {
    forward?: string;
    left?: string;
    right?: string;
    hide?: string;
    show?: string;
    putPenUp?: string;
    putPenDown?: string;
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
    lineCap?: LineCap;

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
    private hidden: boolean = false;

    /**
     * Wether or not to wrap the turtle around the canvas.
     * The turtle goes around when overflowing.
     */
    private wrap: boolean = true;

    /**
     * Determines if the turtle draws on the canvas or not.
     */
    private penDown: boolean = true;

    /**
     * Canvas Image data before drawing the turtle.
     */
    private preDrawData?: ImageData;

    /**
     * Wether or not the Turtle is in Step by Step mode.
     * Enabled using {@link Turtle.setSpeed}.
     */
    private stepByStep: boolean = false;

    /**
     * Wether or not the Turtle is currently perfoming a step.
     * Use `.inStep` instead.
     */
    private step: boolean = false;

    /**
     * The queue of steps do execute.
     */
    private steps: TurtleStep[] = [];

    /**
     * The delay in ms between each steps.
     */
    speed?: number;

    /**
     * The timer identifier for the step interval.
     */
    private interval?: ReturnType<typeof setInterval>;

    /**
     * The Color object representing the current color of the turtle.
     */
    private color: Color = new Color([255, 0, 255]);
    private defaultColor: Color = new Color([255, 0, 255]);

    /**
     * The current width of the turtle's drawing.
     */
    private width: number = 1;

    /**
     * The current lineCap value of the Canvas.
     */

    private set lineCap(cap: LineCap) {
        this.ctx.lineCap = cap;
    }

    /**
     * The size modifier of the turtle.
     */
    
    private readonly turtleSizeModifier: number = 1;

    /**
     * Wether or not the turtle is doing a step.
     */
    private get inStep(): boolean {
        if (!this.stepByStep) return true;
        return this.step;
    }

    /**
     * The current X/Y position of the turtle on the canvas.
     */
    private position: Vertex2D = { x: 0, y: 0 };

    /**
     * The current angle of the turtle.
     */
    private angle: number = 0;

    /**
     * The shape of the turtle which is drawn with the `.draw` method.
     *
     * Represented by an array of 2D vertices (X/Y coordinates) defining
     * the boundaries of the shape.
     */
    private shape: Vertex2D[] = BuiltInShapes.Default;

    /**
     * Execute a certain step.
     *
     * @param step The step to execute
     * @returns {Turtle} For method chaining.
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
        if (step.type === TurtleStepType.PenDown) this.putPenDown();
        if (step.type === TurtleStepType.PenUp) this.putPenUp();
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
     * @returns {Turtle} For method chaining.
     */
    private nextStep(): Turtle {
        const step = this.steps.shift();
        if (step) {
            this.step = true;
            this.doStep(step);
            this.step = false;
        } else if (this.interval) {
            clearInterval(this.interval);
            this.interval = undefined;
        }

        return this;
    }

    /**
     * Wipes out the canvas.
     *
     * @returns {Turtle} For method chaining.
     */
    clear(): Turtle {
        if (this.inStep) {
            this.emit('clear');
            clearContext(this.ctx);
            this.draw();
        } else this.steps.push({ type: TurtleStepType.Clear });

        return this;
    }

    /**
     * Hide the turtle.
     *
     * @returns {Turtle} For method chaining.
     */
    hide(): Turtle {
        if (this.inStep) {
            this.emit('hide');
            this.hidden = true;
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.Hide });
        return this;
    }

    /**
     * Show the turtle.
     *
     * @returns {Turtle} For method chaining.
     */
    show(): Turtle {
        if (this.inStep) {
            this.emit('show');
            this.hidden = false;
            this.draw();
        } else this.steps.push({ type: TurtleStepType.Show });
        return this;
    }

    /**
     * Reset the turtle and the canvas.
     *
     * @returns {Turtle} For method chaining.
     */
    reset(): Turtle {
        if (this.inStep) {
            this.emit('reset');
            this.hidden = false;
            this.wrap = true;
            this.penDown = true;
            this.stepByStep = false;
            this.setWidth(1);
            this.setColor(this.defaultColor);
            this.setAngle(0);
            this.goto(0, 0);
            this.clear();
        } else this.steps.push({ type: TurtleStepType.Reset });
        return this;
    }

    /**
     * Change the shape used to draw the turtle.
     *
     * @param shape An array of X/Y coordinates.
     * @returns {Turtle} For method chaining.
     */
    setShape(shape: Vertex2D[]): Turtle {
        if (this.inStep) {
            this.emit('setShape', shape);
            this.shape = shape;
            this.draw();
        } else this.steps.push({ type: TurtleStepType.SetShape, args: [shape] });
        return this;
    }

    /**
     * Enable Step by Step mode and set the delay in ms between each steps.
     *
     * @param ms The delay between each steps
     * @returns {Turtle} For method chaining.
     */
    setSpeed(ms: number): Turtle {
        if (this.inStep) {
            this.emit('setSpeed', ms);
            this.stepByStep = ms > 0;
            this.speed = ms;

            if (this.interval) clearInterval(this.interval);

            this.interval = setInterval(this.nextStep.bind(this), ms);
        } else this.steps.push({ type: TurtleStepType.SetSpeed, args: [ms] });
        return this;
    }

    /**
     * Puts the pen up to stop drawing.
     *
     * @returns {Turtle} For method chaining.
     */
    putPenUp(): Turtle {
        if (this.inStep) {
            this.emit('putPenUp');
            this.penDown = false;
        } else this.steps.push({ type: TurtleStepType.PenUp });
        return this;
    }

    /**
     * Puts the pen down to start drawing.
     *
     * @returns {Turtle} For method chaining.
     */
    putPenDown(): Turtle {
        if (this.inStep) {
            this.emit('putPenDown');
            this.penDown = true;
        } else this.steps.push({ type: TurtleStepType.PenDown });
        return this;
    }

    /**
     * Inverts the position of the pen.
     *
     * @returns {Turtle} For method chaining.
     */
    invertPen(): Turtle {
        this.penDown = !this.penDown;
        return this;
    }

    /**
     * Sets a new color to be used for drawing.
     *
     * @param col Any value resolvable to a color.
     * @returns {Turtle} For method chaining.
     */
    setColor(col: ColorResolvable): Turtle {
        if (this.inStep) {
            this.emit('setColor', col);
            this.color = convertToColor(col);
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.SetColor, args: [col] });
        return this;
    }

    /**
     * Sets a new width to be used for drawing lines.
     *
     * @returns {Turtle} For method chaining.
     */
    setWidth(size: number): Turtle {
        if (this.inStep) {
            this.emit('setWidth', size);
            this.width = size;
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.SetWidth, args: [size] });
        return this;
    }

    /**
     * Change the line cap style of the lines being drawn.
     *
     * @returns {Turtle} For method chaining.
     */
    setLineCap(cap: LineCap): Turtle {
        if (this.inStep) {
            this.emit('setLineCap', cap);
            this.lineCap = cap;
        } else this.steps.push({ type: TurtleStepType.SetLineCap, args: [cap] });
        return this;
    }

    /**
     * Set the turtle to this angle.
     *
     * @returns {Turtle} For method chaining.
     */
    setAngle(ang: number): Turtle {
        if (this.inStep) {
            this.emit('setAngle', ang);
            this.angle = ang;
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.SetAngle, args: [ang] });
        return this;
    }

    /**
     * Rotate the turtle on the left.
     *
     * @returns {Turtle} For method chaining.
     */
    left(ang: number): Turtle {
        if (this.inStep) {
            this.emit('left', ang);
            this.angle -= ang;
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.Left, args: [ang] });
        return this;
    }

    /**
     * Rotate the turtle on the right.
     *
     * @returns {Turtle} For method chaining.
     */
    right(ang: number): Turtle {
        if (this.inStep) {
            this.emit('right', ang);
            this.angle += ang;
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.Right, args: [ang] });
        return this;
    }

    /**
     * Sends the turtle at a new position.
     *
     * @returns {Turtle} For method chaining.
     */
    goto(x: number, y: number): Turtle {
        if (this.inStep) {
            this.emit('goto', x, y);
            this.position.x = x;
            this.position.y = y;
            this.restoreImageData();
            this.draw();
        } else this.steps.push({ type: TurtleStepType.Goto, args: [x, y] });
        return this;
    }

    /**
     * Draws the turtle (The arrow).
     *
     * @returns {Turtle} For method chaining.
     */
    draw(): Turtle {
        this.saveImageData();
        if (this.hidden) return this;

        const proportionalSize = Math.max(this.width / 2, 1) * this.turtleSizeModifier;

        const shape = rotateShape(
            resizeShape(this.shape, proportionalSize),
            this.angle
        );

        const x = this.position.x;
        const y = this.position.y;

        this.ctx.save();
        centerCoordinates(this.ctx);

        this.ctx.beginPath();
        this.ctx.moveTo(x, y);

        for (let i = 0; i < shape.length; i++) {
            const vertex = shape[i];
            if (vertex) this.ctx.lineTo(x + vertex.x, y + vertex.y);
        }

        this.ctx.closePath();

        this.ctx.fillStyle = this.color.toHex();
        this.ctx.fill();
        this.ctx.lineWidth = Math.max(this.width / 4, 1);
        this.ctx.strokeStyle = 'black';
        this.ctx.stroke();
        this.ctx.restore();
        return this;
    }

    /**
     * Saves the current image into {@link Turtle.preDrawData}.
     *
     * @returns {Turtle} For method chaining.
     */
    saveImageData(): Turtle {
        this.preDrawData = this.ctx.getImageData(
            0,
            0,
            this.ctx.canvas.width,
            this.ctx.canvas.height
        );

        return this;
    }

    /**
     * Restores the image from {@link Turtle.preDrawData}.
     *
     * @returns {Turtle} For method chaining.
     */
    restoreImageData(): Turtle {
        if (this.preDrawData) this.ctx.putImageData(this.preDrawData, 0, 0);
        return this;
    }

    /**
     * Makes the turtle walk forward and draw a line.
     *
     * @param distance The distance in pixels for the turtle to travel.
     * @returns {Turtle} For method chaining.
     */
    forward(distance: number): Turtle {
        if (!this.inStep) {
            this.steps.push({ type: TurtleStepType.Forward, args: [distance] });
            return this;
        }

        this.emit('forward', distance);
        this.restoreImageData();
        this.ctx.save();
        centerCoordinates(this.ctx);
        this.ctx.lineWidth = this.width;
        this.ctx.strokeStyle = this.color.toRGBA();
        if (this.penDown) this.ctx.beginPath();
        const cosAngle = Math.cos(degToRad(this.angle));
        const sinAngle = Math.sin(degToRad(this.angle));
        const w = this.ctx.canvas.width / 2;
        const h = this.ctx.canvas.height / 2;

        let x = this.position.x;
        let y = this.position.y;
        let newX = x + sinAngle * distance;
        let newY = y + cosAngle * distance;

        this.ctx.moveTo(x, y);

        while (distance > 0) {
            const distanceToEdgeX = Math.abs((newX > x ? w - x : w + x) / sinAngle);
            const distanceToEdgeY = Math.abs((newY > y ? h - y : h + y) / cosAngle);

            this.ctx.moveTo(x, y);
            if (
                // Crossing X boundaries
                this.wrap &&
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
                this.wrap &&
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

        if (this.penDown) this.ctx.stroke();
        this.ctx.restore();
        this.saveImageData();
        this.goto(newX, newY);
        return this;
    }

    /**
     * Draws a grid on the Canvas. Pretty useful to be precise.
     *
     * @param separations The number of separations on the grid.
     * @returns {Turtle} For method chaining.
     */
    drawGrid(separations: number): Turtle {
        // Make it minimum 2
        separations = Math.max(2, separations);

        this.step = true;
        const oldAngle = this.angle;
        const oldColor = this.color;
        const oldWidth = this.width;
        const oldX = this.position.x;
        const oldY = this.position.y;
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
        this.step = false;
        return this;
    }

    /**
     * Expose the Turtle's methods onto an object.
     * This is very useful for example when using it with the `window` object,
     * abstracting method calls to simple functions calls.
     *
     * @param obj Any JavaScript Object
     * @param remap A remap object to remap method's names
     * @returns {Turtle} For method chaining.
     */
    expose(obj: any, remap?: ExposeRemap): Turtle {
        obj[remap?.forward ?? 'forward'] = this.forward.bind(this);
        obj[remap?.left ?? 'left'] = this.left.bind(this);
        obj[remap?.right ?? 'right'] = this.right.bind(this);
        obj[remap?.setAngle ?? 'setAngle'] = this.setAngle.bind(this);
        obj[remap?.hide ?? 'hide'] = this.hide.bind(this);
        obj[remap?.show ?? 'show'] = this.show.bind(this);
        obj[remap?.putPenUp ?? 'putPenUp'] = this.putPenUp.bind(this);
        obj[remap?.putPenDown ?? 'putPenDown'] = this.putPenDown.bind(this);
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

    constructor(context: CanvasRenderingContext2D, options?: TurtleOptions) {
        super();
        this.ctx = context;
        this.lineCap = 'round';

        if (options?.hidden) this.hidden = options.hidden;
        if (options?.disableWrapping) this.wrap = !options.disableWrapping;
        if (options?.defaultColor) {
            this.defaultColor = convertToColor(options.defaultColor)
            this.color = this.defaultColor;
        }
        if (options?.width) this.width = options.width;
        if (options?.startPostition) this.position = options.startPostition;
        if (options?.startAngle) this.angle = options.startAngle;
        if (options?.shape) this.shape = options.shape;
        if (options?.lineCap) this.lineCap = options.lineCap;
        if (options?.turtleSizeModifier) this.turtleSizeModifier = options.turtleSizeModifier;
        if (options?.autoDraw) this.draw();
    }
}
