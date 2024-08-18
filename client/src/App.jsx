import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

function App() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inviteeUsername, setInviteeUsername] = useState('');
  const [socket, setSocket] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameId, setGameId] = useState('');
  const [matrix, setMatrix] = useState([[], []]);
  const [message, setMessage] = useState('');
  const [showReset, setShowReset] = useState(false);

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
      setMessage('Game started!');
      setShowReset(true);
    });

    newSocket.on('updateMatrix', (data) => {
      setMatrix(data.matrix);
      setCurrentPlayer(data.currentPlayer);
      setMessage(`It's ${data.currentPlayer}'s turn!`);
    });

    newSocket.on('gameOver', (msg) => {
      setMessage(msg);
      setShowReset(true);
    });

    newSocket.on('turnChange', (playerId) => {
      setCurrentPlayer(playerId);
      setMessage(`It's ${playerId}'s turn!`);
    });

    newSocket.on('opponentLeft', (msg) => {
      setMessage(msg);
      setShowReset(true);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username) {
      socket.emit('login', username);
    }
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (inviteeUsername && inviteeUsername !== username) {
      socket.emit('invite', inviteeUsername);
    } else {
      setMessage('You cannot invite yourself!');
    }
  };

  const handleNumberClick = (rowIndex, colIndex) => {
    const selectedNumber = matrix[rowIndex][colIndex];
    if (username === currentPlayer && selectedNumber !== 'X') {
      socket.emit('numberSelected', { gameId, number: selectedNumber });
    }
  };

  const handleReset = () => {
    setMatrix([[], []]);
    setShowReset(false);
    setMessage('');
    setInviteeUsername('');
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
    <div className="app">
      {!isLoggedIn ? (
        <div id="login">
          <h1>Welcome to the 5x5 Grid Game</h1>
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button id="loginButton" onClick={handleLogin}>
            Login
          </button>
        </div>
      ) : (
        <>
          {!showReset && (
            <div id="invite">
              <h2>Invite a Friend to Play</h2>
              <input
                type="text"
                placeholder="Enter friend's username"
                value={inviteeUsername}
                onChange={(e) => setInviteeUsername(e.target.value.trim())}
              />
              <button id="inviteButton" onClick={handleInvite}>
                Invite
              </button>
            </div>
          )}

          <div id="game">
            <h2>Your Game Board</h2>
            <p>Click on a number to make your move</p>
            <div id="matrix">{renderMatrix(matrix)}</div>
          </div>

          {showReset && (
            <div id="controls">
              <button id="resetButton" onClick={handleReset}>
                Reset
              </button>
            </div>
          )}

          <div id="message">{message}</div>
        </>
      )}
    </div>
  );
}

export default App;
