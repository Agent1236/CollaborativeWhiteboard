const socket = io();

const canvas = document.getElementById('whiteboard');
const context = canvas.getContext('2d');
const roomNameInput = document.getElementById('roomName');
const joinRoomButton = document.getElementById('joinRoom');
const saveSketchButton = document.getElementById('saveSketch');
const sketchList = document.getElementById('sketchList');

canvas.width = 800;
canvas.height = 600;

let drawing = false;
let roomName = '';
let current = { x: 0, y: 0 };

const draw = (x0, y0, x1, y1, color, emit) => {
    context.beginPath();
    context.moveTo(x0, y0);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
    context.closePath();

    if (!emit) return;

    const w = canvas.width;
    const h = canvas.height;

    socket.emit('drawing', {
        room: roomName,
        x0: x0 / w,
        y0: y0 / h,
        x1: x1 / w,
        y1: y1 / h,
        color: color
    });
};

const onMouseDown = (e) => {
    drawing = true;
    current.x = e.clientX - canvas.offsetLeft;
    current.y = e.clientY - canvas.offsetTop;
};

const onMouseUp = () => {
    if (!drawing) return;
    drawing = false;
    draw(current.x, current.y, current.x, current.y, 'black', true);
};

const onMouseMove = (e) => {
    if (!drawing) return;
    draw(current.x, current.y, e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop, 'white', true);
    current.x = e.clientX - canvas.offsetLeft;
    current.y = e.clientY - canvas.offsetTop;
};

const throttle = (callback, delay) => {
    let previousCall = new Date().getTime();
    return function () {
        const time = new Date().getTime();
        if ((time - previousCall) >= delay) {
            previousCall = time;
            callback.apply(null, arguments);
        }
    };
};

canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);
canvas.addEventListener('mouseout', onMouseUp, false);
canvas.addEventListener('mousemove', throttle(onMouseMove, 10), false);

socket.on('drawing', (data) => {
    const w = canvas.width;
    const h = canvas.height;
    draw(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
});

joinRoomButton.addEventListener('click', () => {
    roomName = roomNameInput.value.trim();
    if (roomName) {
        socket.emit('joinRoom', roomName);
        loadSketches();
    }
});

saveSketchButton.addEventListener('click', () => {
    const sketch = canvas.toDataURL('image/png');
    const name = prompt('Enter sketch name');
    if (name) {
        fetch('/sketches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sketch, name })
        }).then(response => response.text()).then(alert);
    }
});

const loadSketches = () => {
    fetch('/sketches').then(response => response.json()).then(files => {
        console.log('Fetched sketches:', files);
        sketchList.innerHTML = '';
        files.forEach(file => {
            const listItem = document.createElement('div');
            listItem.textContent = file;
            listItem.onclick = () => loadSketch(file);
            sketchList.appendChild(listItem);
        });
    }).catch(error => {
        console.error('Error fetching sketches:', error);
    });
};

const loadSketch = (file) => {
    console.log('Loading sketch:', file);
    const img = new Image();
    img.src = `/sketches/${file}`;
    img.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0);
    };
};
