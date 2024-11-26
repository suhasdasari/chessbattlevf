import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { auth, firestore } from '../firebase/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Game.css';
import { getCommentary } from './chatgpt.js';

// Move pieceValues outside the component as a constant
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Add this array at the top of your file, outside the component
const BOT_NAMES = [
  "Sainath Patlolla",
  "Divya",
  "Shivananda",
  "Balakrishna",
  "Marcel",
  "BishopBrain",
  "PawnStar",
  "Trivikram",
  "Shivram",
  "StrategistAI",
  "TacticalBot",
  "Ninja",
  "MoveGenius",
  "NoobChess",
  "Sanjay Ramaswamy"
];

const Game = () => {
  const [user, setUser] = useState(null);
  const [game, setGame] = useState(new Chess());
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState([]);
  const [message, setMessage] = useState('');
  const [boardColors] = useState({ light: '#ffffff', dark: '#000000' });
  const [isCheck, setIsCheck] = useState(false);
  const navigate = useNavigate();
  const [moveHistory, setMoveHistory] = useState([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [commentary, setCommentary] = useState('');
  const [botDifficulty, setBotDifficulty] = useState('beginner');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [profileVisible, setProfileVisible] = useState(false);
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [botName, setBotName] = useState('');
  const [isBlackTurn, setIsBlackTurn] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setName(user.displayName || '');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * BOT_NAMES.length);
    setBotName(BOT_NAMES[randomIndex]);
  }, []);

  const saveGameState = useCallback(async () => {
    if (!isOnline) {
      console.log('Offline: Game state will not be saved');
      return;
    }

    if (user) {
      try {
        await setDoc(doc(firestore, 'games', user.uid), {
          fen: game.fen(),
          lastUpdated: new Date()
        });
      } catch (error) {
        console.error('Error saving game state:', error);
      }
    }
  }, [user, game, isOnline]);

  const loadGameState = useCallback(async () => {
    if (!isOnline) {
      console.log('Offline: Starting new game');
      return;
    }

    if (user) {
      try {
        const docRef = doc(firestore, 'games', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const savedGame = docSnap.data();
          setGame(new Chess(savedGame.fen));
        }
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    }
  }, [user, isOnline]);

  const evaluatePosition = useCallback((chess) => {
    let evaluation = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piece = chess.get(String.fromCharCode(97 + j) + (i + 1));
        if (piece) {
          evaluation += PIECE_VALUES[piece.type] * (piece.color === 'w' ? 1 : -1);
        }
      }
    }
    return evaluation;
  }, []);

  const negamax = useCallback((chess, depth, alpha, beta, color) => {
    if (depth === 0) return color * evaluatePosition(chess);
    
    const moves = chess.moves({ verbose: true });
    let bestEval = -Infinity;
    
    for (const move of moves) {
      const newGame = new Chess(chess.fen());
      newGame.move(move);
      const evaluation = -negamax(newGame, depth - 1, -beta, -alpha, -color);
      bestEval = Math.max(bestEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (alpha >= beta) break;
    }
    
    return bestEval;
  }, [evaluatePosition]);

  const findBestMove = useCallback((chess) => {
    const moves = chess.moves({ verbose: true });
    return moves.reduce((best, move) => {
      const newGame = new Chess(chess.fen());
      newGame.move(move);
      const evaluation = -negamax(newGame, 3, -Infinity, Infinity, -1);
      return evaluation > best.evaluation ? { move, evaluation } : best;
    }, { move: moves[0], evaluation: -Infinity }).move;
  }, [negamax]);

  const makeMove = useCallback(async (from, to) => {
    try {
      const move = game.move({ from, to, promotion: 'q' });
      if (move) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        setSelectedPiece(null);
        setPossibleMoves([]);
        saveGameState();
        setIsCheck(newGame.inCheck());
        setMoveHistory(prevHistory => [...prevHistory, game.fen()]);
        setIsPlayerTurn(!isPlayerTurn);
        setIsBlackTurn(!isBlackTurn);
        
        const newCommentary = await getCommentary(`${move.piece} from ${from} to ${to}`);
        setCommentary(newCommentary);
      }
    } catch (error) {
      setMessage("Invalid move");
      setTimeout(() => setMessage(''), 2000);
    }
  }, [isPlayerTurn, saveGameState, game, isBlackTurn]);

  const CommentaryBox = () => (
    <div className="commentary-box">
      <h3>Commentary</h3>
      <p>{commentary}</p>
    </div>
  );

  const generateBotMove = useCallback(() => {
    const moves = game.moves({ verbose: true });
    if (moves.length > 0) {
      let selectedMove;
      switch (botDifficulty) {
        case 'beginner':
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
          break;
        case 'intermediate':
          selectedMove = moves.reduce((best, move) => {
            const newGame = new Chess(game.fen());
            newGame.move(move);
            const evaluation = evaluatePosition(newGame);
            return evaluation > best.evaluation ? { move, evaluation } : best;
          }, { move: moves[0], evaluation: -Infinity }).move;
          break;
        case 'professional':
          selectedMove = findBestMove(game);
          break;
        default:
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
      }
      return selectedMove;
    }
    return null;
  }, [botDifficulty, evaluatePosition, findBestMove, game]);

  useEffect(() => {
    if (!isPlayerTurn) {
      const timeoutId = setTimeout(() => {
        const botMove = generateBotMove();
        if (botMove) {
          makeMove(botMove.from, botMove.to);
        }
      }, 3500);
      return () => clearTimeout(timeoutId);
    }
  }, [isPlayerTurn, generateBotMove, makeMove]);

  const handleSquareClick = (square) => {
    if (!isPlayerTurn) return;
    const piece = game.get(square);
    if (selectedPiece === square) {
      setSelectedPiece(null);
      setPossibleMoves([]);
    } else if (piece && piece.color === game.turn()) {
      setSelectedPiece(square);
      const moves = game.moves({ square: square, verbose: true });
      setPossibleMoves(moves.map(move => move.to));
    } else if (selectedPiece) {
      makeMove(selectedPiece, square);
    }
  };

  const handleNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setMoveHistory([]);
    setIsCheck(false);
    setIsPlayerTurn(true);
    setIsBlackTurn(false);
    setSelectedPiece(null);
    setPossibleMoves([]);
    saveGameState();
    setMessage("New game started");
    setTimeout(() => setMessage(''), 2000);
  };

  const handleUndo = () => {
    if (moveHistory.length > 1) {
      const previousState = moveHistory[moveHistory.length - 2];
      const newGame = new Chess(previousState);
      setGame(newGame);
      setMoveHistory(prevHistory => prevHistory.slice(0, -2));
      setIsCheck(newGame.inCheck());
      saveGameState();
      setIsPlayerTurn(true);
      setIsBlackTurn(false);
    } else {
      setMessage("No more moves to undo");
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleExit = () => {
    navigate('/');
  };

  const getPieceImage = (piece) => {
    if (!piece) return null;
    const color = piece.color === 'w' ? 'white' : 'black';
    const pieceType = { 'p': 'pawn', 'n': 'knight', 'b': 'bishop', 'r': 'rook', 'q': 'queen', 'k': 'king' }[piece.type];
    return `${process.env.PUBLIC_URL}/assets/${color}_${pieceType}.svg`;
  };

  const renderBoard = () => {
    const board = [];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    
    for (let i = 8; i >= 1; i--) {
      const row = [];
      for (let j = 0; j < 8; j++) {
        const square = files[j] + i;
        const piece = game.get(square);
        const isLight = (i + j) % 2 === 0;
        const isSelected = square === selectedPiece;
        const isPossibleMove = possibleMoves.includes(square);
        const isKingInCheck = isCheck && piece && piece.type === 'k' && piece.color === game.turn();

        row.push(
          <div
            key={square}
            className={`square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isPossibleMove ? 'possible-move' : ''} ${isKingInCheck ? 'king-in-check' : ''}`}
            style={{ backgroundColor: isLight ? boardColors.light : boardColors.dark }}
            onClick={() => handleSquareClick(square)}
          >
            {piece && <img src={getPieceImage(piece)} alt={piece.type} className="chess-piece" />}
            <span className={`coordinate ${isLight ? 'dark-text' : 'light-text'}`}>
              {j === 0 && i}
              {i === 1 && files[j]}
            </span>
          </div>
        );
      }
      board.push(<div key={`row-${i}`} className="board-row">{row}</div>);
    }
    return board;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadGameState().catch(error => {
          if (error.message.includes('offline')) {
            console.log('Unable to load saved game. Starting new game.');
          }
        });
      }
    });

    return () => unsubscribe();
  }, [loadGameState]);

  const handleSaveProfile = () => {
    setProfileVisible(false);
  };

  return (
    <div className="game">
      {!isOnline && (
        <div className="offline-indicator">
          You are offline. Game progress will not be saved.
        </div>
      )}
      
      <Link to="/" className="logo-text">
        Chess Battle
      </Link>
      
      <div className="game-header-user-menu" onClick={() => setDropdownOpen(!dropdownOpen)}>
        {user ? user.email : 'Guest'}
        {dropdownOpen && (
          <div className="dropdown">
            <div className="dropdown-item">
              <button 
                className="dropdown-button profile-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setProfileVisible(true);
                  setDropdownOpen(false);
                }}
              >
                Profile
              </button>
            </div>
            <div className="dropdown-item">
              <button 
                className="dropdown-button"
                onClick={(e) => {
                  e.stopPropagation();
                  signOut(auth);
                }}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {profileVisible && (
        <div className="profile-modal">
          <div className="profile-content">
            <h1>Edit Profile</h1>
            <label>
              Name:
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              Date of Birth:
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </label>
            <button onClick={handleSaveProfile}>Save</button>
          </div>
        </div>
      )}

      <div className="game-container">
        <div className="commentary-section">
          <CommentaryBox />
        </div>

        <div className="board-section">
          <div className="bot-profile">
            <img 
              src={`${process.env.PUBLIC_URL}/assets/default-avatar.png`}
              alt="Bot Avatar"
              className="player-avatar"
            />
            <span className="player-name">{botName}</span>
          </div>

          <div className={`turn-light bot-turn-light ${!isPlayerTurn ? 'active' : ''}`}></div>
          <div className="chessboard">
            {renderBoard()}
          </div>
          <div className={`turn-light user-turn-light ${isPlayerTurn ? 'active' : ''}`}></div>

          <div className="user-profile">
            <img 
              src={`${process.env.PUBLIC_URL}/assets/default-avatar.png`}
              alt="User Avatar"
              className="player-avatar"
            />
            <span className="player-name">{user ? user.email : 'Guest'}</span>
          </div>
        </div>

        <div className="controls-section">
          <select 
            className="difficulty-selector" 
            value={botDifficulty} 
            onChange={(e) => setBotDifficulty(e.target.value)}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <button onClick={handleUndo}>Undo</button>
          <button onClick={handleNewGame}>New Game</button>
          <button onClick={handleExit}>Exit</button>
        </div>
      </div>
      {message && <div className="message">{message}</div>}
    </div>
  );
};

export default Game;