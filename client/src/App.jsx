import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [playerId, setPlayerId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inviteeId, setInviteeId] = useState('');
  const [socket, setSocket] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameId, setGameId] = useState('');
  const [matrix, setMatrix] = useState([[], []]);
  const [message, setMessage] = useState('');
  const [inputNumber, setInputNumber] = useState('');

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('loggedIn', () => {
      setIsLoggedIn(true);
    });

    newSocket.on('startGame', (data) => {
      setGameId(data.gameId);
      setCurrentPlayer(data.playerId);
      setMatrix(data.matrix);
      setMessage('Game started');
    });

    newSocket.on('updateMatrix', (data) => {
      setMatrix(data.matrix);
      setCurrentPlayer(data.currentPlayer);
      setMessage(`Player ${data.currentPlayer}'s turn`);
    });

    newSocket.on('gameOver', (msg) => {
      setMessage(msg);
      document.getElementById('submitNumber').disabled = true;
    });

    newSocket.on('turnChange', (playerId) => {
      setCurrentPlayer(playerId);
      setMessage(`Player ${playerId}'s turn`);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (playerId) {
      socket.emit('login', playerId);
    }
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (inviteeId) {
      socket.emit('invite', inviteeId);
    }
  };

  const handleNumberClick = (rowIndex, colIndex) => {
    const selectedNumber = matrix[rowIndex][colIndex];
    if (playerId === currentPlayer && selectedNumber !== 'X') {
      socket.emit('numberSelected', { gameId, number: selectedNumber });
    }
  };

  const handleSubmitNumber = () => {
    const number = parseInt(inputNumber);
    if (number < 1 || number > 25) {
      alert('Please enter a valid number between 1 and 25.');
      return;
    }

    if (playerId === currentPlayer) {
      socket.emit('numberSelected', { gameId, number });
    } else {
      alert("It's not your turn!");
    }

    setInputNumber('');
  };

  const renderMatrix = (matrix) => {
    return matrix.map((row, rowIndex) => (
      <div key={rowIndex} className="matrix-row">
        {row.map((cell, colIndex) => (
          <div
            key={colIndex}
            className={`matrix-cell ${cell === 'X' ? 'crossed' : ''}`}
            onClick={() => handleNumberClick(rowIndex, colIndex)}
          >
            {cell}
          </div>
        ))}
      </div>
    ));
  };

  return (
    <>
      {!isLoggedIn ? (
        <div id="login">
          <input
            type="text"
            placeholder="Enter your unique ID"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          />
          <button id="loginButton" onClick={handleLogin}>
            Login
          </button>
        </div>
      ) : (
        <div id="invite">
          <input
            type="text"
            placeholder="Enter player ID to invite"
            value={inviteeId}
            onChange={(e) => setInviteeId(e.target.value.trim())}
          />
          <button id="inviteButton" onClick={handleInvite}>
            Invite
          </button>
        </div>
      )}
      <div id="game">
        <h2>Your Matrix</h2>
        <div id="matrix">{renderMatrix(matrix)}</div>
      </div>
      <div id="controls">
        <input
          type="number"
          id="numberInput"
          value={inputNumber}
          onChange={(e) => setInputNumber(e.target.value)}
          placeholder="Enter a number (1-25)"
        />
        <button id="submitNumber" onClick={handleSubmitNumber}>
          Submit
        </button>
      </div>
      <div id="message">{message}</div>
    </>
  );
}

export default App;
