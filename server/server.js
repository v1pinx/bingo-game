const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const port = 3000;

app.use(cors());

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST'],
    },
});

let players = {};
let games = {};

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('login', (playerId) => {
        players[socket.id] = playerId;
        socket.emit('loggedIn', { playerId });
    });

    socket.on('invite', (inviteeId) => {
        const inviterId = players[socket.id];
        const inviteeSocketId = Object.keys(players).find((key) => players[key] === inviteeId);

        if (inviteeSocketId) {
            const gameId = `${inviterId}-${inviteeId}`;
            games[gameId] = {
                players: [socket.id, inviteeSocketId],
                matrices: {
                    [socket.id]: generateMatrix(),
                    [inviteeSocketId]: generateMatrix(),
                },
                currentPlayer: socket.id,  // Set current player to inviter
            };

            io.to(socket.id).emit('startGame', { gameId, playerId: inviterId, matrix: games[gameId].matrices[socket.id] });
            io.to(inviteeSocketId).emit('startGame', { gameId, playerId: inviteeId, matrix: games[gameId].matrices[inviteeSocketId] });
        } else {
            socket.emit('inviteFailed', { message: 'Player not found' });
        }
    });

    socket.on('numberSelected', ({ gameId, number }) => {
        const game = games[gameId];
        const otherPlayerId = game.players.find((id) => id !== socket.id);

        if (game.currentPlayer !== socket.id) {
            socket.emit('notYourTurn');
            return;
        }

        game.matrices[socket.id] = crossNumber(game.matrices[socket.id], number);
        game.matrices[otherPlayerId] = crossNumber(game.matrices[otherPlayerId], number);
        io.to(socket.id).emit('updateMatrix', { matrix: game.matrices[socket.id], number });
        io.to(otherPlayerId).emit('updateMatrix', { matrix: game.matrices[otherPlayerId], number });

        if (checkWin(game.matrices[socket.id]) >= 5) {
            io.to(game.players[0]).emit('gameOver', `Player ${players[game.players[0]]} wins!`);
            io.to(game.players[1]).emit('gameOver', `Player ${players[game.players[0]]} wins!`);
        } else if (checkWin(game.matrices[otherPlayerId]) >= 5) {
            io.to(game.players[0]).emit('gameOver', `Player ${players[game.players[1]]} wins!`);
            io.to(game.players[1]).emit('gameOver', `Player ${players[game.players[1]]} wins!`);
        } else {
            game.currentPlayer = otherPlayerId;
            io.to(game.players[0]).emit('turnChange', players[game.currentPlayer]);
            io.to(game.players[1]).emit('turnChange', players[game.currentPlayer]);
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        const playerId = players[socket.id];

        // Handle ongoing games
        Object.keys(games).forEach((gameId) => {
            const game = games[gameId];
            if (game.players.includes(socket.id)) {
                const otherPlayerId = game.players.find((id) => id !== socket.id);
                io.to(otherPlayerId).emit('gameOver', `Player ${players[otherPlayerId]} wins by default!`);
                delete games[gameId];
            }
        });

        // Remove the player from players list
        delete players[socket.id];
    });
});

function generateMatrix() {
    const numbers = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

    const matrix = [];
    for (let i = 0; i < 5; i++) {
        matrix.push(numbers.slice(i * 5, i * 5 + 5));
    }
    return matrix;
}

function crossNumber(matrix, number) {
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (matrix[i][j] === number) {
                matrix[i][j] = 'X';
            }
        }
    }
    return matrix;
}

function checkWin(matrix) {
    let lines = 0;

    // Check rows
    matrix.forEach((row) => {
        if (row.every((cell) => cell === 'X')) lines++;
    });

    // Check columns
    for (let i = 0; i < 5; i++) {
        if (matrix.every((row) => row[i] === 'X')) lines++;
    }

    // Check diagonals
    if (matrix.every((row, i) => row[i] === 'X')) lines++;
    if (matrix.every((row, i) => row[4 - i] === 'X')) lines++;

    return lines;
}

app.get('/', (req, res) => {
    res.send('Server is running');
});

server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
