/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, GameType } from '../types';
import { SOCKET_EVENTS } from '../events';
import { checkTicTacToeWinner, checkRPSWinner } from '../utils/helpers';

type TargetedPayload<T> = T & { toUserId?: string };

export function useGameState(socket: Socket | null, partnerUserId?: string | null) {
  const [gameState, setGameState] = useState<GameState | null>(null);

  const withTarget = useCallback(<T extends object>(payload: T): TargetedPayload<T> => {
    if (!partnerUserId) return payload;
    return { ...payload, toUserId: partnerUserId };
  }, [partnerUserId]);

  const handleGameInvite = useCallback((type: GameType) => {
    socket?.emit(
      SOCKET_EVENTS.GAME_INVITE,
      partnerUserId ? withTarget({ gameType: type }) : type
    );
    setGameState({
      type,
      status: 'inviting',
      turn: 'me'
    });
  }, [socket, partnerUserId, withTarget]);

  const handleGameAccept = useCallback((type: GameType) => {
    socket?.emit(
      SOCKET_EVENTS.GAME_ACCEPT,
      partnerUserId ? withTarget({ gameType: type }) : type
    );
  }, [socket, partnerUserId, withTarget]);

  const handleGameCancel = useCallback(() => {
    socket?.emit(
      SOCKET_EVENTS.GAME_CANCEL,
      partnerUserId ? withTarget({}) : undefined
    );
    setGameState(null);
  }, [socket, partnerUserId, withTarget]);

  const handleGameMove = useCallback((move: number | string) => {
    if (!gameState || gameState.status !== 'playing') return;

    if (gameState.type === 'tictactoe') {
      if (gameState.turn !== 'me' || gameState.board?.[move as number] !== null) return;

      const newBoard = [...(gameState.board || [])];
      newBoard[move as number] = 'X';
      socket?.emit(
        SOCKET_EVENTS.GAME_MOVE,
        partnerUserId ? withTarget({ move }) : move
      );

      const winner = checkTicTacToeWinner(newBoard);
      if (winner) {
        setGameState({
          ...gameState,
          board: newBoard,
          status: 'ended',
          winner: winner === 'X' ? 'me' : (winner === 'draw' ? 'draw' : 'partner')
        });
      } else {
        setGameState({ ...gameState, board: newBoard, turn: 'partner' });
      }
    } else if (gameState.type === 'rps') {
      if (gameState.myMove) return;
      socket?.emit(
        SOCKET_EVENTS.GAME_MOVE,
        partnerUserId ? withTarget({ move }) : move
      );

      if (gameState.partnerMove) {
        const winner = checkRPSWinner(move as string, gameState.partnerMove);
        setGameState({ ...gameState, myMove: move as string, status: 'ended', winner });
      } else {
        setGameState({ ...gameState, myMove: move as string });
      }
    }
  }, [socket, gameState, partnerUserId, withTarget]);

  const handleDoodleDraw = useCallback((stroke: { x: number; y: number; color: string; isStart: boolean }) => {
    setGameState((prev) => {
      if (!prev || prev.type !== 'doodle') return prev;
      return {
        ...prev,
        strokes: [...(prev.strokes || []), stroke]
      };
    });
    socket?.emit(
      SOCKET_EVENTS.DOODLE_DRAW,
      partnerUserId ? withTarget({ stroke }) : stroke
    );
  }, [socket, partnerUserId, withTarget]);

  const handleDoodleClear = useCallback(() => {
    setGameState((prev) => {
      if (!prev || prev.type !== 'doodle') return prev;
      return {
        ...prev,
        strokes: []
      };
    });
    socket?.emit(
      SOCKET_EVENTS.DOODLE_CLEAR,
      partnerUserId ? withTarget({}) : undefined
    );
  }, [socket, partnerUserId, withTarget]);

  return {
    gameState,
    setGameState,
    handleGameInvite,
    handleGameAccept,
    handleGameCancel,
    handleGameMove,
    handleDoodleDraw,
    handleDoodleClear,
  };
}
