
import { createCanvas } from 'canvas';
import { Turtle } from './../src/turtle';

describe('Turtle', () => {
    beforeEach(() => {
    })
    it('should be defined', () => {
        expect(Turtle).toBeDefined();
    });
    it('should be constructable', () => {
        let canvas = createCanvas(800, 800);
        let ctx = canvas.getContext('2d');
        expect(new Turtle(ctx)).toBeDefined();
    });
});