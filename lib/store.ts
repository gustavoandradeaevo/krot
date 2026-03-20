// In-memory storage for quizzes and rooms
export const quizzes = new Map<string, {
  id: string;
  title: string;
  questions: Array<{
    text: string;
    options: string[];
    correctAnswerIndex: number;
    timeLimit: number; // in seconds
  }>;
}>();

// Room structure:
// roomCode -> {
//   quizId: string,
//   status: 'waiting' | 'playing' | 'game-over',
//   players: Array<{ id: string; name: string; score: number }>,
//   currentQuestion: number
// }
export const rooms = new Map<string, {
  quizId: string;
  status: 'waiting' | 'playing' | 'game-over';
  players: Array<{ id: string; name: string; score: number }>;
  currentQuestion: number;
}>();