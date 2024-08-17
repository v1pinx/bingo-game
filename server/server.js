const express = require('express');
const cors = require('cors');
const http = require('http');
const {Server} = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app)
const port = 3000;


app.use(cors());

const io = new Server(server ,{
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
});

let players = {};
let games = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('login', (playerId) => {
        players[socket.id] = playerId;
        socket.emit('loggedIn', { playerId });
    })

    socket.on('invite', (inviteeId) => {
        const inviterId = players[socket.id];
        const inviteeSocketId = Object.keys(players).find(key => players[key] === inviteeId);

        if(inviteeSocketId) {
            const gameId = `${inviterId}-${inviteeId}`;
            let games = {};
            games[gameId] = {
                players: [socket.id, inviteeSocketId],
                matrices: {
                    [socket.id]: generateMatrix(),
                    [inviteeSocketId]: generateMatrix()
                }
            };

            io.to(socket.id).emit('startGame', {gameId, playerId : inviterId, matrix: games[gameId].matrices[socket.id]});
            io.to(inviteeSocketId).emit('startGame', {gameId, playerId: inviteeId, matrix: games[gameId].matrices[inviteeSocketId]});
        }
        else{
            socket.emit('inviteFailed', {message: 'Player not found'});
        }
    });




    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
});

function generateMatrix(){
    const numbers = Array.from({ length: 25}, (_, i) => i+1).sort(() => Math.random() - 0.5);

    const matrix = [];
    for(let i = 0; i < 5; i++) {
        matrix.push(numbers.slice(i*5, i*5+5));
    }
    return matrix;
}

app.get('/', (req, res) => {
    res.send("Server is running");
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
