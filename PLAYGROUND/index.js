const canvas = document.getElementById('turtle-canvas');
const ctx = canvas.getContext('2d');

const { Turtle } = SimpleTurtle;

const trtl = new Turtle(ctx, {
    disableWrapping: true,
    autoDraw: true,
    defaultColor: 'black',
});
trtl.expose(window, { goto: 'goTo' });

trtl.setSpeed(1);

trtl.drawGrid(50);
trtl.reset();
trtl.drawGrid(25);
trtl.reset();
// setTimeout(() => {
    trtl.drawGrid(10);
// }, 180);


//! zadanie 1
// goTo(-400, -200);
// right(30);
// function drawTr(steps, itLimit) {
//     if (itLimit <= 0) return;
//     const steps3 = steps / 3;
//     for (let i = 0; i < 3; i++) {
//         forward(steps3 * 2);
//         drawTr(steps3, itLimit - 1);
//         forward(steps3);
//         right(120);
//     }
// }

// drawTr(500, 4);

//! zadanie 2
// function drawSq(steps, itLimit) {
//     if (itLimit <= 0) return;
//     forward(steps);
//     left(90);
//     drawSq(steps / 2, itLimit - 1);
//     right(180);
//     forward(steps);
//     right(90);
//     forward(steps);
//     left(90);
//     drawSq(steps / 2, itLimit - 1);
//     right(180);
//     forward(steps);
//     right(90);
// }

// drawSq(100, 4);

//! zadanie 3
// goTo(0, -300);
// setSpeed(1);



// forward(300);
// function drawSnow(steps, itLimit) {
//     if (itLimit <= 0) return;
//     for (let i = 0; i < 6; i++) {
//         forward(steps);
//         drawSnow(steps / 3, itLimit - 1);
//         right(180);
//         forward(steps);
//         right(120);
//     }
// }

// drawSnow(120, 4);