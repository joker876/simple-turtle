import { Color, ColorResolvable } from './colors';
import { Vertex2D } from './shapes';

/**
 * The different types of steps the turtle is making.
 */
export enum TurtleStepType {
    Forward,
    Backward,
    Left,
    Right,
    SetAngle,
    Hide,
    Show,
    PenUp,
    PenDown,
    PenToggle,
    Reset,
    Clear,
    Goto,
    SetColor,
    SetWidth,
    SetShape,
    SetSpeed,
    SetLineCap,
}

export type TurtleStep =
    | {
        type: TurtleStepType.Forward;
        args: [number];
    }
    | {
        type: TurtleStepType.Backward;
        args: [number];
    }
    | {
        type: TurtleStepType.Hide;
    }
    | {
        type: TurtleStepType.Show;
    }
    | {
        type: TurtleStepType.Left;
        args: [number];
    }
    | {
        type: TurtleStepType.Right;
        args: [number];
    }
    | {
        type: TurtleStepType.Goto;
        args: [number, number];
    }
    | {
        type: TurtleStepType.SetAngle;
        args: [number];
    }
    | {
        type: TurtleStepType.PenDown;
    }
    | {
        type: TurtleStepType.PenUp;
    }
    | {
        type: TurtleStepType.PenToggle;
    }
    | {
        type: TurtleStepType.Reset;
    }
    | {
        type: TurtleStepType.Clear;
    }
    | {
        type: TurtleStepType.SetWidth;
        args: [number];
    }
    | {
        type: TurtleStepType.SetSpeed;
        args: [number];
    }
    | {
        type: TurtleStepType.SetColor;
        args: [ColorResolvable];
    }
    | {
        type: TurtleStepType.SetShape;
        args: [Vertex2D[]];
    }
    | {
        type: TurtleStepType.SetLineCap;
        args: [CanvasLineCap];
    };

export interface TurtleEvents {
    /**
     * Emitted at every steps when StepByStep mode is enabled.
     *
     * @see {@link Turtle.stepByStep}
     */
    step: (step: TurtleStep) => void;
    clear: () => void;
    hide: () => void;
    show: () => void;
    reset: () => void;
    setShape: (shape: Vertex2D[]) => void;
    setSpeed: (ms: number) => void;
    penUp: () => void;
    penDown: () => void;
    penToggle: (newValue: boolean) => void;
    setColor: (color: Color) => void;
    setWidth: (width: number) => void;
    setLineCap: (cap: CanvasLineCap) => void;
    setAngle: (angle: number) => void;
    left: (angle: number) => void;
    right: (angle: number) => void;
    goto: (x: number, y: number) => void;
    forward: (distance: number) => void;
    backward: (distance: number) => void;
}
