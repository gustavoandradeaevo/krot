import { createServer } from 'http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { quizzes, rooms } from './lib/store.js';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// Store for tracking player answers and game state
const playerAnswers = new Map<string, Map<string, { answerIndex: number; timeSpent: number }>>();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle joining a room
    socket.on('join-room', (data) => {
      const { roomCode, playerName } = data;
      const roomCodeUpper = roomCode.toUpperCase();
      
      socket.join(roomCodeUpper);

      // Add player to room if room exists
      const room = rooms.get(roomCodeUpper);
      if (room) {
        // Check if player already exists (reconnecting)
        const existingPlayerIndex = room.players.findIndex((p) => p.id === socket.id);
        if (existingPlayerIndex === -1) {
          room.players.push({ id: socket.id, name: playerName, score: 0 });
          rooms.set(roomCodeUpper, room);
        }
        
        // Notify room about updated players
        io.to(roomCodeUpper).emit('update-players', room.players);
        
        // If game is already in progress, notify the player
        if (room.status === 'playing') {
          socket.emit('game-already-started');
        }
      } else {
        // Room doesn't exist - create a mock room for testing
        const mockRoom = {
          quizId: 'mock',
          status: 'waiting' as const,
          players: [{ id: socket.id, name: playerName, score: 0 }],
          currentQuestion: 0,
        };
        rooms.set(roomCodeUpper, mockRoom);
        io.to(roomCodeUpper).emit('update-players', mockRoom.players);
      }
    });

    // Handle game starting (countdown)
    socket.on('game-starting', (roomCode: string) => {
      const roomCodeUpper = roomCode.toUpperCase();
      io.to(roomCodeUpper).emit('game-starting');
    });

    // Handle starting the game
    socket.on('start-game', (roomCode: string) => {
      const roomCodeUpper = roomCode.toUpperCase();
      const room = rooms.get(roomCodeUpper);
      
      if (room) {
        room.status = 'playing';
        room.currentQuestion = 0;
        rooms.set(roomCodeUpper, room);

        // Get quiz data
        const quiz = quizzes.get(room.quizId);
        
        if (quiz && quiz.questions.length > 0) {
          // Send first question to all players
          const firstQuestion = quiz.questions[0];
          io.to(roomCodeUpper).emit('new-question', {
            question: firstQuestion,
            questionIndex: 0,
            totalQuestions: quiz.questions.length,
          });
        } else {
          // Mock questions for testing
          const mockQuestions = [
            {
              id: '1',
              text: 'What is the capital of France?',
              options: ['London', 'Berlin', 'Paris', 'Madrid'],
              correctAnswerIndex: 2,
              timeLimit: 30,
            },
            {
              id: '2',
              text: 'Which planet is known as the Red Planet?',
              options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
              correctAnswerIndex: 1,
              timeLimit: 30,
            },
            {
              id: '3',
              text: 'What is 7 × 8?',
              options: ['54', '56', '48', '64'],
              correctAnswerIndex: 1,
              timeLimit: 30,
            },
          ];
          
          io.to(roomCodeUpper).emit('new-question', {
            question: mockQuestions[0],
            questionIndex: 0,
            totalQuestions: mockQuestions.length,
          });
        }
      }
    });

    // Handle next question
    socket.on('next-question', (roomCode: string) => {
      const roomCodeUpper = roomCode.toUpperCase();
      const room = rooms.get(roomCodeUpper);
      
      if (room) {
        room.currentQuestion += 1;
        rooms.set(roomCodeUpper, room);

        const quiz = quizzes.get(room.quizId);
        
        if (quiz && room.currentQuestion < quiz.questions.length) {
          const question = quiz.questions[room.currentQuestion];
          io.to(roomCodeUpper).emit('new-question', {
            question,
            questionIndex: room.currentQuestion,
            totalQuestions: quiz.questions.length,
          });
          
          // Clear answers for new question
          playerAnswers.delete(roomCodeUpper);
        } else {
          // No more questions, game over
          const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
          const rankings = sortedPlayers.map((p, i) => ({ playerId: p.id, rank: i + 1 }));
          
          io.to(roomCodeUpper).emit('game-over', {
            players: room.players,
            rankings,
          });
          
          room.status = 'game-over';
          rooms.set(roomCodeUpper, room);
        }
      }
    });

    // Handle submitting an answer
    socket.on('submit-answer', (data: { roomCode: string; answerIndex: number; timeSpent: number }) => {
      const { roomCode, answerIndex, timeSpent } = data;
      const roomCodeUpper = roomCode.toUpperCase();
      
      const room = rooms.get(roomCodeUpper);
      if (!room) return;

      const quiz = quizzes.get(room.quizId);
      
      // Get current question
      let currentQuestion: { text: string; options: string[]; correctAnswerIndex: number; timeLimit: number } | null = null;
      
      if (quiz && room.currentQuestion < quiz.questions.length) {
        currentQuestion = quiz.questions[room.currentQuestion];
      } else {
        // Mock question for testing
        const mockQuestions = [
          { text: 'What is the capital of France?', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctAnswerIndex: 2, timeLimit: 30 },
          { text: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctAnswerIndex: 1, timeLimit: 30 },
          { text: 'What is 7 × 8?', options: ['54', '56', '48', '64'], correctAnswerIndex: 1, timeLimit: 30 },
        ];
        currentQuestion = mockQuestions[room.currentQuestion] || null;
      }

      if (!currentQuestion) return;

      const isCorrect = answerIndex === currentQuestion.correctAnswerIndex;
      let points = 0;
      
      if (isCorrect) {
        // Calculate points: 1000 base - 10 points per second
        points = Math.max(100, 1000 - Math.floor(timeSpent * 10));
      }

      // Update player score
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);
      if (playerIndex !== -1) {
        room.players[playerIndex].score += points;
        rooms.set(roomCodeUpper, room);
      }

      // Track this answer
      if (!playerAnswers.has(roomCodeUpper)) {
        playerAnswers.set(roomCodeUpper, new Map());
      }
      const roomAnswers = playerAnswers.get(roomCodeUpper);
      if (roomAnswers) {
        roomAnswers.set(socket.id, { answerIndex, timeSpent });
      }

      // Calculate streak
      // For simplicity, we'll check if the previous answer was also correct
      // In a real app, you'd track this per-player
      
      // Send result back to the player
      socket.emit('answer-result', {
        isCorrect,
        points,
        correctAnswerIndex: currentQuestion.correctAnswerIndex,
        streak: isCorrect ? 1 : 0, // Simplified streak
      });

      // Check if all players have answered
      const totalAnswers = roomAnswers?.size || 0;
      if (totalAnswers >= room.players.length) {
        // All players have answered, show results and move to next question
        setTimeout(() => {
          io.to(roomCodeUpper).emit('show-results');
          
          // Wait a bit then move to next question
          setTimeout(() => {
            room.currentQuestion += 1;
            rooms.set(roomCodeUpper, room);

            if (quiz && room.currentQuestion < quiz.questions.length) {
              const nextQuestion = quiz.questions[room.currentQuestion];
              io.to(roomCodeUpper).emit('new-question', {
                question: nextQuestion,
                questionIndex: room.currentQuestion,
                totalQuestions: quiz.questions.length,
              });
              playerAnswers.delete(roomCodeUpper);
            } else {
              // Game over
              const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
              const rankings = sortedPlayers.map((p, i) => ({ playerId: p.id, rank: i + 1 }));
              
              io.to(roomCodeUpper).emit('game-over', {
                players: room.players,
                rankings,
              });
              
              room.status = 'game-over';
              rooms.set(roomCodeUpper, room);
            }
          }, 3000);
        }, 2000);
      }
    });

    // Handle resetting the room (Play Again)
    socket.on('reset-room', (roomCode: string) => {
      const roomCodeUpper = roomCode.toUpperCase();
      const room = rooms.get(roomCodeUpper);
      
      if (room) {
        // Reset scores for all players
        room.players.forEach((player) => {
          player.score = 0;
        });
        
        // Reset game state
        room.status = 'waiting';
        room.currentQuestion = 0;
        
        rooms.set(roomCodeUpper, room);
        
        // Clear tracked answers
        playerAnswers.delete(roomCodeUpper);
        
        // Notify all clients that room has been reset
        io.to(roomCodeUpper).emit('room-reset', {
          players: room.players,
          message: 'Room has been reset. Waiting for host to start new game.'
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Remove player from any room they were in
      rooms.forEach((room, roomCode) => {
        const playerIndex = room.players.findIndex((p) => p.id === socket.id);
        if (playerIndex !== -1) {
          const playerName = room.players[playerIndex].name;
          room.players.splice(playerIndex, 1);
          rooms.set(roomCode, room);
          
          // Notify the room
          io.to(roomCode).emit('update-players', room.players);
          io.to(roomCode).emit('player-left', { playerId: socket.id, playerName });
        }
      });
    });
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
