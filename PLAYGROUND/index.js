const canvas = document.getElementById('turtle-canvas');
const ctx = canvas.getContext('2d');

const { Turtle } = SimpleTurtle;

const trtl = new Turtle(ctx, {
    disableWrapping: true,
    turtleSizeModifier: 2.5,
    autoDraw: true,
    defaultColor: 'black',
});

trtl.drawGrid(50);