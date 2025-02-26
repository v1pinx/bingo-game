import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { FaGithub } from "react-icons/fa";
import { RxExit } from "react-icons/rx";
import toast from 'react-hot-toast';
import OnlinePlayers from './components/OnlinePlayers';
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
  const [gameStarted, setGameStarted] = useState(false);

  const serverUrl = import.meta.env.VITE_APP_URL;

  useEffect(() => {
    const newSocket = io(`${serverUrl}`);
    setSocket(newSocket);

    newSocket.on('loggedIn', () => {
      toast.success('Logged in successfully!');
      setIsLoggedIn(true);
    });

    newSocket.on('startGame', (data) => {
      setGameId(data.gameId);
      setCurrentPlayer(data.playerId);
      setMatrix(data.matrix);
      setMessage('Game started!');
      setShowReset(true);
      setGameStarted(true);
    });

    newSocket.on('updateMatrix', (data) => {
      setMatrix(data.matrix);
      setCurrentPlayer(data.currentPlayer);
      setMessage(`It's ${data.currentPlayer}'s turn!`);
    });

    newSocket.on('gameOver', (msg) => {
      setMessage(msg);
      toast.success('Game over!');
      setShowReset(true);
    });

    newSocket.on('turnChange', (playerId) => {
      setCurrentPlayer(playerId);
      setMessage(`It's ${playerId}'s turn!`);
    });

    newSocket.on('opponentLeft', (msg) => {
      toast.success('Your opponent left the game! Game over!')
      setTimeout(() => {
        handleReset();
      }, 2000);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username) {
      socket.emit('login', username);
    } else {
      toast.error('Please enter your username')
    }

    socket.on('loginFailed', (data) => {
      toast.error(data.message);
    });
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (inviteeUsername && inviteeUsername !== username) {
      socket.emit('invite', inviteeUsername);
    } else if (inviteeUsername === username) {
      toast.error('You cannot invite yourself!');
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
    setGameStarted(false);
  };

  const renderMatrix = (matrix) => {
    return matrix.map((row, rowIndex) => (
      <div key={rowIndex} className="matrix-row flex flex-row">
        {row.map((cell, colIndex) => (
          <div
            key={colIndex}
            className={`bg-[#191A2E] border-[1.5px] text-3xl font-semibold border-gray-300  py-2 text-[#F9F9F9] w-20 h-20 flex items-center justify-center cursor-pointer hover:bg-[#191A2E]/80 transition-all duration-300 ${cell === 'X' ? 'crossed' : ''}`}
            onClick={() => handleNumberClick(rowIndex, colIndex)}
          >
            {cell}
          </div>
        ))}
      </div>
    ));
  };

  return (
    <div className="app bg-[#191A2E] relative flex flex-col items-center justify-center h-screen">
      <OnlinePlayers />
      {!gameStarted && (
        <a className='absolute top-4 right-4 p-4' href='https://github.com/v1pinx/bingo-game' target='_blank' rel='noopener noreferrer'>
          <FaGithub className='text-[#F9F9F9] text-3xl cursor-pointer hover:text-[#E94560] transition-all duration-300' />
        </a>
      )}
      {!isLoggedIn ? (
        <div id="login" className='flex flex-col items-center justify-center h-screen space-y-4'>
          <h1 className='text-[#F9F9F9] text-5xl font-bold'>Ultimate Bingo Adventure</h1>
          <p className='text-gray-400 font-semibold text-md mt-[-10px]'>Play the ultimate bingo game with your friends</p>
          <form onSubmit={handleLogin} className='w-full space-y-4 mt-[5px]'>
            <input
              type="text"
              placeholder="Enter your username to login and see online players"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-[1.5px] border-gray-300 rounded-lg py-2 text-[#F9F9F9] w-full 
            outline-none focus:ring-1 focus:ring-[#E94560] focus:ring-offset-1 px-3"
            />
            <button id="loginButton" type='submit' className='bg-[#E94560] text-white font-semibold p-2 rounded-lg w-full cursor-pointer hover:bg-[#E94560]/80 transition-all duration-300'>
              Login
            </button>
          </form>
        </div>
      ) : (
        <>
          {!gameStarted && (
            <div id="invite" className='flex flex-col items-center justify-center space-y-4 h-screen'>
              <h2 className='text-[#F9F9F9] text-5xl font-bold'>Invite a Friend</h2>
              <p className='text-gray-400 font-semibold text-md mt-[-10px]'>Enter your friend's username to invite them to play</p>
              <form onSubmit={handleInvite} className='w-full space-y-4 mt-[5px]'>

                <input
                  type="text"
                  placeholder="Enter friend's username"
                  value={inviteeUsername}
                  onChange={(e) => setInviteeUsername(e.target.value.trim())}
                  className='border-[1.5px] border-gray-300 rounded-lg py-2 text-[#F9F9F9] w-full 
                outline-none focus:ring-1 focus:ring-[#E94560] focus:ring-offset-1 px-3'
                />
                <button id="inviteButton" type='submit' className='bg-[#E94560] text-white font-semibold p-2 rounded-lg w-full cursor-pointer hover:bg-[#E94560]/80 transition-all duration-300'>
                  Invite
                </button>
              </form>
            </div>
          )}

          {gameStarted && (
            <div id="game" className='flex flex-col items-center justify-center space-y-4'>
              <div className='absolute top-4 right-4 p-4'>
                <RxExit className='text-[#F9F9F9] text-3xl cursor-pointer hover:text-[#E94560] transition-all duration-300' />
              </div>
              <h2 className='text-[#F9F9F9] text-4xl font-bold'>Your Game Board</h2>
              <p className='text-gray-400 font-semibold text-md'>Click on a box to make your move</p>
              <div id="matrix">{renderMatrix(matrix)}</div>
            </div>
          )}

          {showReset && (
            <div id="controls">
              <button id="resetButton" onClick={handleReset} className='bg-[#E94560] text-white font-semibold mt-4 p-2 rounded-lg w-full cursor-pointer hover:bg-[#E94560]/80 transition-all duration-300'>
                Reset
              </button>
            </div>
          )}

          <div id="message" className='text-[#F9F9F9] text-2xl font-semibold'>{message}</div>
        </>
      )}
    </div>
  );
}

export default App;
