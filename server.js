const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/sketches', express.static(path.join(__dirname, 'sketches'))); // Serve sketches as static files

app.get('/sketches', (req, res) => {
    fs.readdir(path.join(__dirname, 'sketches'), (err, files) => {
        if (err) {
            console.error('Error reading sketches directory:', err);
            res.status(500).send('Unable to load sketches.');
        } else {
            console.log('Fetched sketches:', files);
            res.json(files);
        }
    });
});

app.post('/sketches', (req, res) => {
    const { sketch, name } = req.body;
    const filePath = path.join(__dirname, 'sketches', `${name}.png`);
    const base64Data = sketch.replace(/^data:image\/png;base64,/, "");

    fs.writeFile(filePath, base64Data, 'base64', err => {
        if (err) {
            console.error('Error saving sketch:', err);
            res.status(500).send('Failed to save sketch.');
        } else {
            res.status(200).send('Sketch saved successfully.');
        }
    });
});

const rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', (room) => {
        if (!rooms[room]) rooms[room] = [];
        rooms[room].push(socket.id);
        socket.join(room);
    });

    socket.on('drawing', (data) => {
        io.to(data.room).emit('drawing', data);
    });

    socket.on('disconnect', () => {
        for (const room in rooms) {
            rooms[room] = rooms[room].filter(id => id !== socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
const HOST = 'localhost';

server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
