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
    methods: ['GET', 'POST']
  }
});

let players = {};
let games = {};

io.on('connection', (socket) => {
    console.log('a user connected');
  
    socket.on('login', (username) => {
      players[socket.id] = username;
      socket.emit('loggedIn');
    });
  
    socket.on('invite', (inviteeUsername) => {
      const inviterUsername = players[socket.id];
      const inviteeSocketId = Object.keys(players).find(key => players[key] === inviteeUsername);
  
      if (inviteeSocketId && inviteeSocketId !== socket.id) {
        const gameId = `${inviterUsername}-${inviteeUsername}`;
        games[gameId] = {
          players: [socket.id, inviteeSocketId],
          matrices: {
            [socket.id]: generateMatrix(),
            [inviteeSocketId]: generateMatrix()
          },
          currentPlayer: socket.id
        };
  
        io.to(socket.id).emit('startGame', { gameId, playerId: inviterUsername, matrix: games[gameId].matrices[socket.id] });
        io.to(inviteeSocketId).emit('startGame', { gameId, playerId: inviteeUsername, matrix: games[gameId].matrices[inviteeSocketId] });
      } else {
        socket.emit('inviteFailed', { message: 'Player not found or inviting yourself is not allowed.' });
      }
    });
  
    socket.on('numberSelected', ({ gameId, number }) => {
      const game = games[gameId];
      const otherPlayerSocketId = game.players.find(id => id !== socket.id);
  
      if (game.currentPlayer !== socket.id) {
        socket.emit('notYourTurn');
        return;
      }
  
      game.matrices[socket.id] = crossNumber(game.matrices[socket.id], number);
      game.matrices[otherPlayerSocketId] = crossNumber(game.matrices[otherPlayerSocketId], number);
  
      io.to(socket.id).emit('updateMatrix', { matrix: game.matrices[socket.id], currentPlayer: players[otherPlayerSocketId] });
      io.to(otherPlayerSocketId).emit('updateMatrix', { matrix: game.matrices[otherPlayerSocketId], currentPlayer: players[otherPlayerSocketId] });
  
      if (checkWin(game.matrices[socket.id]) >= 5) {
        io.to(game.players[0]).emit('gameOver', `Player ${players[game.players[0]]} wins!`);
        io.to(game.players[1]).emit('gameOver', `Player ${players[game.players[0]]} wins!`);
      } else if (checkWin(game.matrices[otherPlayerSocketId]) >= 5) {
        io.to(game.players[0]).emit('gameOver', `Player ${players[game.players[1]]} wins!`);
        io.to(game.players[1]).emit('gameOver', `Player ${players[game.players[1]]} wins!`);
      } else {
        game.currentPlayer = otherPlayerSocketId;
        io.to(game.players[0]).emit('turnChange', players[game.currentPlayer]);
        io.to(game.players[1]).emit('turnChange', players[game.currentPlayer]);
      }
    });
  
    socket.on('disconnect', () => {
      console.log('user disconnected');
      const username = players[socket.id];
      const gameId = Object.keys(games).find(gameId => games[gameId].players.includes(socket.id));
  
      if (gameId) {
        const game = games[gameId];
        const otherPlayerSocketId = game.players.find(id => id !== socket.id);
  
        if (otherPlayerSocketId) {
          io.to(otherPlayerSocketId).emit('opponentLeft', `Player ${username} has left the game.`);
        }
  
        delete games[gameId];
      }
  
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
  matrix.forEach(row => {
    if (row.every(cell => cell === 'X')) lines++;
  });

  // Check columns
  for (let i = 0; i < 5; i++) {
    if (matrix.every(row => row[i] === 'X')) lines++;
  }

  // Check diagonals
  if (matrix.every((row, i) => row[i] === 'X')) lines++;
  if (matrix.every((row, i) => row[4 - i] === 'X')) lines++;

  return lines;
}

app.get('/', (req, res) => {
  res.send("Server is running");
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
