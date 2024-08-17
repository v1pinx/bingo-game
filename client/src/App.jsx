import { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import './App.css'

function App() {
  const [playerId, setPlayerId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [inviteeId, setInviteeId] = useState('');
  const [socket, setSocket] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('');
  const [gameId, setGameId] = useState('');
  const [matrix, setMatrix] = useState([[],[]]);
  const [message, setMessage] = useState('');

  useEffect(() => {

    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Listen for the loggedIn event
    newSocket.on('loggedIn', (data) => {
      console.log(data);
      setIsLoggedIn(true);
    });

    newSocket.on('startGame', (data) => {
      setGameId(data.gameId);
      setCurrentPlayer(data.playerId);
      setMatrix(data.matrix);
      setMessage('Game started');

    })

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if(playerId) {
      socket.emit('login', playerId);
    }
  }

  const handleInvite = (e) => {
    e.preventDefault();
    if(inviteeId) {
      socket.emit('invite', inviteeId); 
    }
  }

  function renderMatrix(matrix, elementId) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';
    matrix.forEach(row => {
        row.forEach(cell => {
            const div = document.createElement('div');
            div.innerText = cell;
            div.className = cell === 'X' ? 'crossed' : '';
            container.appendChild(div);

            div.addEventListener('click', () => {
                if (playerId === currentPlayer && cell !== 'X') {
                    socket.emit('numberSelected', { gameId, number: cell });
                }
            });
        });
    });
}

  

  return (
    <>
    { !isLoggedIn ? (
      <div id="login" >
        <input type="text" placeholder="Enter your unique ID" value={playerId} onChange={(e) => setPlayerId(e.target.value)}/>
        <button id="loginButton" onClick={handleLogin}>Login</button>
    </div>
    ) :  (
    <div id="invite">
        <input type="text" placeholder="Enter player ID to invite" value={inviteeId} onChange={(e) => setInviteeId(e.target.value.trim())}/>
        <button id='inviteButton' onClick={handleInvite}>Invite</button>
    </div> )}
    <div id="game" >
        <div id="player1">
            <h2>Player 1</h2>
            <div id="matrix1"></div>
        </div>
        <div id="player2" >
            <h2 >Player 2</h2>
            <div id="matrix2"></div>
        </div>
    </div>


    <div id="controls" >
        <input type="number" id="numberInput" placeholder="Enter a number (1-25)" />
        <button id="submitNumber">Submit</button>
    </div>
    <div id="message"></div>
    </>

  )
}

export default App
