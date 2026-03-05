import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Trophy, User, Hand, Scissors, Square, Eraser, Palette } from 'lucide-react';
import { GameState, GameType } from '../types';
import { cn } from '../lib/utils';

interface MiniGamesProps {
  gameState: GameState | null;
  onMove: (move: any) => void;
  onCancel: () => void;
  onAccept: (type: GameType) => void;
  onInvite: (type: GameType) => void;
  onDoodleDraw: (stroke: { x: number; y: number; color: string; isStart: boolean }) => void;
  onDoodleClear: () => void;
}

export function MiniGames({ gameState, onMove, onCancel, onAccept, onInvite, onDoodleDraw, onDoodleClear }: MiniGamesProps) {
  if (!gameState) return null;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState('#6366f1'); // indigo-500

  useEffect(() => {
    if (gameState.type === 'doodle' && gameState.status === 'playing' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear and redraw all strokes
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = 'round';
      ctx.lineWidth = 3;

      gameState.strokes?.forEach((stroke, i) => {
        if (stroke.isStart) {
          ctx.beginPath();
          ctx.moveTo(stroke.x * canvas.width, stroke.y * canvas.height);
        } else {
          ctx.strokeStyle = stroke.color;
          ctx.lineTo(stroke.x * canvas.width, stroke.y * canvas.height);
          ctx.stroke();
        }
      });
    }
  }, [gameState.strokes, gameState.type, gameState.status]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState.status !== 'playing') return;
    setIsDrawing(true);
    const pos = getPos(e);
    onDoodleDraw({ ...pos, color: currentColor, isStart: true });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || gameState.status !== 'playing') return;
    const pos = getPos(e);
    onDoodleDraw({ ...pos, color: currentColor, isStart: false });
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const renderDoodle = () => {
    const colors = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#ffffff'];
    
    return (
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="relative w-full aspect-square bg-zinc-900 rounded-2xl border border-white/10 overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-full cursor-crosshair"
          />
        </div>
        
        <div className="flex items-center justify-between w-full px-2">
          <div className="flex gap-2">
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setCurrentColor(color)}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all",
                  currentColor === color ? "border-white scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <button
            onClick={onDoodleClear}
            className="p-2 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
            title="Clear Canvas"
          >
            <Eraser className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  const renderTicTacToe = () => {
    const board = gameState.board || Array(9).fill(null);
    const isMyTurn = gameState.turn === 'me';

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-3 gap-2 bg-zinc-800 p-2 rounded-xl">
          {board.map((cell, i) => (
            <button
              key={i}
              disabled={!isMyTurn || cell !== null || gameState.status === 'ended'}
              onClick={() => onMove(i)}
              className={cn(
                "w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold transition-all",
                cell === 'X' ? "text-indigo-400" : "text-emerald-400",
                !cell && isMyTurn && gameState.status === 'playing' ? "hover:bg-zinc-700 cursor-pointer" : "bg-zinc-900",
                cell === null && "text-transparent"
              )}
            >
              {cell || '-'}
            </button>
          ))}
        </div>
        <div className="text-sm font-medium text-zinc-400">
          {gameState.status === 'playing' ? (
            isMyTurn ? "Your turn (X)" : "Waiting for partner (O)..."
          ) : (
            gameState.winner === 'me' ? "You won! 🎉" : 
            gameState.winner === 'partner' ? "Partner won!" : "It's a draw!"
          )}
        </div>
      </div>
    );
  };

  const renderRPS = () => {
    const moves = [
      { id: 'rock', icon: Hand, label: 'Rock' },
      { id: 'paper', icon: Square, label: 'Paper' },
      { id: 'scissors', icon: Scissors, label: 'Scissors' }
    ];

    return (
      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-4">
          {moves.map((move) => (
            <button
              key={move.id}
              disabled={gameState.myMove !== undefined || gameState.status === 'ended'}
              onClick={() => onMove(move.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                gameState.myMove === move.id 
                  ? "bg-indigo-600 border-indigo-500 scale-110" 
                  : "bg-zinc-900 border-white/5 hover:border-white/20"
              )}
            >
              <move.icon className="w-8 h-8" />
              <span className="text-xs font-bold uppercase tracking-widest">{move.label}</span>
            </button>
          ))}
        </div>
        <div className="text-sm font-medium text-zinc-400">
          {gameState.status === 'playing' ? (
            gameState.myMove ? "Waiting for partner..." : "Choose your move!"
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex gap-4 text-xs uppercase tracking-widest font-black">
                <span className="text-indigo-400">You: {gameState.myMove}</span>
                <span className="text-emerald-400">Partner: {gameState.partnerMove}</span>
              </div>
              <span className="text-lg font-bold">
                {gameState.winner === 'me' ? "You won! 🎉" : 
                 gameState.winner === 'partner' ? "Partner won!" : "It's a draw!"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
    >
      <div className={cn(
        "bg-zinc-950 border border-white/10 rounded-[2.5rem] p-8 w-full shadow-2xl relative overflow-hidden",
        gameState.type === 'doodle' ? "max-w-md" : "max-w-sm"
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500" />
        
        <button
          onClick={onCancel}
          className="absolute top-6 right-6 p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 mb-4">
            <Trophy className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight mb-2">
            {gameState.type === 'tictactoe' ? 'Tic-Tac-Toe' : 
             gameState.type === 'rps' ? 'Rock Paper Scissors' : 'Shared Doodle'}
          </h3>
          <p className="text-zinc-500 text-sm">
            {gameState.status === 'inviting' ? 'Waiting for partner to accept...' : 
             gameState.type === 'doodle' ? 'Draw something together!' : 'Good luck!'}
          </p>
        </div>

        {gameState.status === 'inviting' ? (
          <div className="flex flex-col gap-3">
            {gameState.turn === 'me' ? (
              <>
                <div className="flex items-center justify-center gap-4 py-8">
                  <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                </div>
                <button
                  onClick={onCancel}
                  className="w-full py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold transition-all cursor-pointer"
                >
                  Cancel Invitation
                </button>
              </>
            ) : (
              <>
                <div className="py-8 text-center text-zinc-400">
                  Stranger has invited you to play!
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    className="flex-1 py-4 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold transition-all cursor-pointer"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => onAccept(gameState.type)}
                    className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    Accept
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="py-4">
            {gameState.type === 'tictactoe' ? renderTicTacToe() : 
             gameState.type === 'rps' ? renderRPS() : renderDoodle()}
            
            {gameState.status === 'ended' && (
              <button
                onClick={onCancel}
                className="w-full mt-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                Close Game
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
