"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Trophy,
  Clock,
  Zap,
  Star,
  Target,
  Users,
  Crown,
  Loader2,
  CheckCircle2,
  XCircle,
  Medal,
  RotateCcw,
} from "lucide-react";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  timeLimit: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
}

interface AnswerResult {
  isCorrect: boolean;
  points: number;
  correctAnswerIndex: number;
  streak: number;
}

export default function PlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomCode = params.code as string;
  const playerName = searchParams.get("name") || "Anonymous";

  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<
    "connecting" | "waiting" | "countdown" | "playing" | "answered" | "results" | "gameover"
  >("connecting");
  const [countdown, setCountdown] = useState(3);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [players, setPlayers] = useState<Player[]>([]);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [finalRank, setFinalRank] = useState(0);
  const [connectionError, setConnectionError] = useState("");

  const answerColors = [
    { bg: "from-[#FF3355] to-[#CC2944]", icon: "▲", color: "#FF3355" },
    { bg: "from-[#2684FF] to-[#1E6AD4]", icon: "◆", color: "#2684FF" },
    { bg: "from-[#FFCC00] to-[#CC9900]", icon: "●", color: "#FFCC00" },
    { bg: "from-[#66E366] to-[#4BC44B]", icon: "■", color: "#66E366" },
  ];

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setGameState("waiting");

      // Join the room
      newSocket.emit("join-room", {
        roomCode: roomCode.toUpperCase(),
        playerName: playerName.trim(),
      });
    });

    newSocket.on("connect_error", () => {
      setConnectionError("Failed to connect to server. Please try again.");
      setGameState("connecting");
    });

    return () => {
      newSocket.close();
    };
  }, [roomCode, playerName]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Update players list
    socket.on("update-players", (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    // Game is starting (countdown)
    socket.on("game-starting", () => {
      setGameState("countdown");
      setCountdown(3);
    });

    // New question
    socket.on(
      "new-question",
      (data: {
        question: Question;
        questionIndex: number;
        totalQuestions: number;
      }) => {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionIndex + 1);
        setTotalQuestions(data.totalQuestions);
        setTimeRemaining(data.question.timeLimit);
        setSelectedAnswer(null);
        setAnswerResult(null);
        setGameState("playing");
      }
    );

    // Answer result
    socket.on(
      "answer-result",
      (result: {
        isCorrect: boolean;
        points: number;
        correctAnswerIndex: number;
        streak: number;
      }) => {
        setAnswerResult(result);
        if (result.isCorrect) {
          setScore((prev) => prev + result.points);
          setStreak(result.streak);
        } else {
          setStreak(0);
        }
        setGameState("answered");
      }
    );

    // Game over
    socket.on(
      "game-over",
      (data: { players: Player[]; rankings: { playerId: string; rank: number }[] }) => {
        const currentPlayerRank =
          data.rankings.find((r) => r.playerId === socket.id)?.rank || 0;
        setFinalRank(currentPlayerRank);
        setPlayers(data.players);
        setGameState("gameover");
      }
    );

    // Room reset (Play Again)
    socket.on("room-reset", () => {
      setScore(0);
      setStreak(0);
      setFinalRank(0);
      setGameState("waiting");
    });

    // Error handling
    socket.on("error", (message: string) => {
      setConnectionError(message);
    });

    return () => {
      socket.off("update-players");
      socket.off("game-starting");
      socket.off("new-question");
      socket.off("answer-result");
      socket.off("game-over");
      socket.off("room-reset");
      socket.off("error");
    };
  }, [socket]);

  // Timer logic - visual countdown only, server controls advancement
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (gameState === "playing" && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, timeRemaining]);

  // Countdown timer
  useEffect(() => {
    if (gameState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, countdown]);

  const handleAnswer = (answerIndex: number) => {
    if (gameState !== "playing" || selectedAnswer !== null || !socket || !currentQuestion) return;

    setSelectedAnswer(answerIndex);
    const timeSpent = currentQuestion.timeLimit - timeRemaining;

    socket.emit("submit-answer", {
      roomCode: roomCode.toUpperCase(),
      answerIndex,
      timeSpent,
    });
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === "playing" && selectedAnswer === null) {
        switch (e.key) {
          case "1":
          case "ArrowUp":
            handleAnswer(0);
            break;
          case "2":
          case "ArrowRight":
            handleAnswer(1);
            break;
          case "3":
          case "ArrowDown":
            handleAnswer(2);
            break;
          case "4":
          case "ArrowLeft":
            handleAnswer(3);
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, selectedAnswer]);

  // Medal styles for top 3
  const getMedalStyle = (rank: number) => {
    switch (rank) {
      case 0: // Gold
        return {
          bg: "from-[#FFD700] to-[#FFA500]",
          border: "border-[#FFD700]",
          icon: "🥇",
          label: "1st",
        };
      case 1: // Silver
        return {
          bg: "from-[#C0C0C0] to-[#808080]",
          border: "border-[#C0C0C0]",
          icon: "🥈",
          label: "2nd",
        };
      case 2: // Bronze
        return {
          bg: "from-[#CD7F32] to-[#8B4513]",
          border: "border-[#CD7F32]",
          icon: "🥉",
          label: "3rd",
        };
      default:
        return {
          bg: "from-white/10 to-white/5",
          border: "border-white/10",
          icon: rank + 1,
          label: `${rank + 1}th`,
        };
    }
  };

  // Connecting screen
  if (gameState === "connecting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center animate-[bounce-in_0.6s_ease-out]">
        <Loader2 className="w-16 h-16 text-[#FF6B35] animate-spin mb-6" />
        <h1 className="text-3xl font-black text-white mb-2">Connecting...</h1>
        <p className="text-[#B8B8D1]">Joining room {roomCode.toUpperCase()}</p>
        {connectionError && (
          <p className="mt-4 text-red-400 text-center max-w-md px-4">{connectionError}</p>
        )}
      </div>
    );
  }

  // Waiting screen
  if (gameState === "waiting") {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="glass-card border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FF8E53] flex items-center justify-center text-white font-bold">
                  {playerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{playerName}</p>
                  <p className="text-xs text-[#B8B8D1]">Player</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#B8B8D1] uppercase tracking-wide">Room</p>
                <p className="text-xl font-black text-white">{roomCode.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center animate-[bounce-in_0.6s_ease-out]">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#2684FF] to-[#1E6AD4] flex items-center justify-center shadow-2xl">
              <Loader2 className="w-12 h-12 text-white animate-spin" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
              Waiting for Host
            </h1>
            <p className="text-xl text-[#B8B8D1] mb-8">
              The game will start when the host is ready
            </p>

            {/* Players in room */}
            <div className="glass-card rounded-2xl p-6 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="w-5 h-5 text-[#66E366]" />
                <span className="text-sm font-bold text-[#B8B8D1] uppercase tracking-wide">
                  Players Joined
                </span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {players.length > 0 ? (
                  players.map((player, index) => (
                    <div
                      key={player.id}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-sm animate-[slideInUp_0.3s_ease-out]"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      {player.name}
                    </div>
                  ))
                ) : (
                  <p className="text-[#6B7280]">Waiting for players...</p>
                )}
              </div>
              <p className="mt-4 text-sm text-[#6B7280]">
                {players.length} player{players.length !== 1 ? "s" : ""} in room
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Countdown screen
  if (gameState === "countdown") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center animate-[bounce-in_0.5s_ease-out]">
        <div className="text-center">
          <p className="text-3xl font-bold text-[#B8B8D1] mb-8 uppercase tracking-widest">
            Get Ready!
          </p>
          <div className="relative">
            <div
              className="w-48 h-48 rounded-full flex items-center justify-center text-white font-black"
              style={{
                background: `conic-gradient(from 0deg, #FF3355 ${
                  (countdown / 3) * 360
                }deg, transparent ${(countdown / 3) * 360}deg)`,
                boxShadow: "0 0 60px rgba(255, 51, 85, 0.5)",
              }}
            >
              <div className="w-40 h-40 rounded-full bg-[#1A1A2E] flex items-center justify-center">
                <span className="text-8xl font-black text-white animate-pulse">
                  {countdown}
                </span>
              </div>
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-8">
            {countdown === 1 ? "GO!" : "Starting in..."}
          </p>
        </div>
      </div>
    );
  }

  // Sort players by score for game over screen
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Game Over screen
  if (gameState === "gameover") {
    const topThree = sortedPlayers.slice(0, 3);
    const restOfPlayers = sortedPlayers.slice(3);

    return (
      <div className="min-h-screen flex flex-col p-4 animate-[slideInUp_0.5s_ease-out]">
        {/* Header */}
        <header className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-[#FFCC00] to-[#FFAA00] flex items-center justify-center shadow-2xl">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
            Game Over!
          </h1>
          <p className="text-xl text-[#B8B8D1]">Final Scoreboard</p>
        </header>

        {/* Top 3 Podium */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <div className="flex justify-center items-end gap-4 md:gap-8 mb-8">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#C0C0C0] to-[#808080] flex items-center justify-center text-4xl shadow-xl mb-2">
                  🥈
                </div>
                <div className="glass-card rounded-2xl p-4 text-center border-2 border-[#C0C0C0] shadow-lg shadow-gray-400/30">
                  <p className="text-2xl font-black text-white mb-1">
                    {topThree[1].name}
                  </p>
                  <p className="text-xl font-black text-[#C0C0C0]">
                    {topThree[1].score.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#B8B8D1] uppercase">2nd Place</p>
                </div>
                <div className="w-20 h-24 bg-gradient-to-t from-[#808080] to-[#C0C0C0] rounded-t-lg mt-4 opacity-80" />
              </div>
            )}

            {/* 1st Place */}
            {topThree[0] && (
              <div className="flex flex-col items-center -mt-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center text-5xl shadow-2xl mb-2 animate-pulse">
                  🥇
                </div>
                <div className="glass-card rounded-2xl p-6 text-center border-2 border-[#FFD700] shadow-xl shadow-yellow-500/50 transform scale-110">
                  <p className="text-3xl font-black text-white mb-1">
                    {topThree[0].name}
                  </p>
                  <p className="text-2xl font-black text-[#FFD700]">
                    {topThree[0].score.toLocaleString()}
                  </p>
                  <p className="text-sm text-[#FFCC00] uppercase font-bold">🏆 Winner!</p>
                </div>
                <div className="w-28 h-32 bg-gradient-to-t from-[#FFA500] to-[#FFD700] rounded-t-lg mt-4" />
              </div>
            )}

            {/* 3rd Place */}
            {topThree[2] && (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#CD7F32] to-[#8B4513] flex items-center justify-center text-4xl shadow-xl mb-2">
                  🥉
                </div>
                <div className="glass-card rounded-2xl p-4 text-center border-2 border-[#CD7F32] shadow-lg shadow-orange-600/30">
                  <p className="text-2xl font-black text-white mb-1">
                    {topThree[2].name}
                  </p>
                  <p className="text-xl font-black text-[#CD7F32]">
                    {topThree[2].score.toLocaleString()}
                  </p>
                  <p className="text-xs text-[#B8B8D1] uppercase">3rd Place</p>
                </div>
                <div className="w-20 h-16 bg-gradient-to-t from-[#8B4513] to-[#CD7F32] rounded-t-lg mt-4 opacity-80" />
              </div>
            )}
          </div>
        </div>

        {/* Full Ranking List */}
        <div className="max-w-2xl mx-auto w-full mb-8">
          <div className="glass-card rounded-3xl p-6">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <Medal className="w-6 h-6 text-[#FF6B35]" />
              Full Rankings
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
              {sortedPlayers.map((player, index) => {
                const style = getMedalStyle(index);
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                      index < 3
                        ? `bg-gradient-to-r ${style.bg} bg-opacity-20 border ${style.border}`
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                        index < 3
                          ? `bg-gradient-to-br ${style.bg} text-white shadow-lg`
                          : "bg-white/10 text-white"
                      }`}
                    >
                      {index < 3 ? style.icon : index + 1}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-bold ${
                          index < 3 ? "text-white text-lg" : "text-white"
                        }`}
                      >
                        {player.name}
                      </p>
                      {index < 3 && (
                        <p className="text-xs text-white/70">{style.label} Place</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-mono font-black ${
                          index === 0
                            ? "text-2xl text-[#FFD700]"
                            : index === 1
                            ? "text-xl text-[#C0C0C0]"
                            : index === 2
                            ? "text-lg text-[#CD7F32]"
                            : "text-lg text-white"
                        }`}
                      >
                        {player.score.toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Waiting for host to start next game */}
        <div className="text-center mb-8">
          <p className="text-[#B8B8D1] mb-4">Waiting for host to start next game...</p>
          <Loader2 className="w-8 h-8 text-[#FF6B35] animate-spin mx-auto" />
        </div>

        {/* Footer */}
        <footer className="text-center text-[#6B7280] text-sm mt-auto">
          <p>Room: {roomCode.toUpperCase()}</p>
        </footer>
      </div>
    );
  }

  // Playing or Answered state
  if (!currentQuestion) return null;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            {/* Player Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6B35] to-[#FF8E53] flex items-center justify-center text-white font-bold">
                {playerName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{playerName}</p>
                <div className="flex items-center gap-2">
                  <Star className="w-3 h-3 text-[#FFCC00]" />
                  <span className="text-xs text-[#B8B8D1]">Streak: {streak}</span>
                </div>
              </div>
            </div>

            {/* Question Counter */}
            <div className="text-center">
              <p className="text-xs text-[#B8B8D1] uppercase tracking-wide">Question</p>
              <p className="text-xl font-black text-white">
                {questionNumber}/{totalQuestions}
              </p>
            </div>

            {/* Score */}
            <div className="text-right">
              <p className="text-xs text-[#B8B8D1] uppercase tracking-wide">Score</p>
              <p className="text-xl font-black text-[#FF6B35]">{score.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        {/* Timer Bar */}
        {gameState === "playing" && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#FFCC00]" />
                <span className="text-sm font-bold text-[#B8B8D1]">Time Remaining</span>
              </div>
              <span
                className={`text-2xl font-black ${
                  timeRemaining <= 5 ? "text-[#FF3355] animate-pulse" : "text-white"
                }`}
              >
                {timeRemaining}s
              </span>
            </div>
            <div className="h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF3355] via-[#FF6B35] to-[#FFCC00] rounded-full transition-all duration-1000"
                style={{
                  width: `${(timeRemaining / currentQuestion.timeLimit) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Question Card */}
        <div className="flex-1 flex flex-col">
          <div className="glass-card rounded-3xl p-6 sm:p-8 mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white leading-tight">
              {currentQuestion.text}
            </h2>
          </div>

          {/* Answer Options */}
          <div className="flex-1 grid grid-cols-2 gap-3 sm:gap-4">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const showCorrect =
                gameState === "answered" && index === answerResult?.correctAnswerIndex;
              const showWrong =
                gameState === "answered" && isSelected && !answerResult?.isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  disabled={gameState !== "playing"}
                  className={`relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-300 btn-answer overflow-hidden ${
                    gameState === "playing"
                      ? "hover:scale-[1.02] hover:-translate-y-1"
                      : ""
                  } ${showCorrect ? "ring-4 ring-[#66E366] scale-105" : ""} ${
                    showWrong ? "ring-4 ring-[#FF3355] opacity-50" : ""
                  } ${
                    gameState === "answered" && !isSelected && !showCorrect
                      ? "opacity-40"
                      : ""
                  }`}
                  style={{
                    background: `linear-gradient(145deg, ${
                      showCorrect
                        ? "#66E366, #4BC44B"
                        : showWrong
                        ? "#FF3355, #CC2944"
                        : index === 0
                        ? "#FF3355, #CC2944"
                        : index === 1
                        ? "#2684FF, #1E6AD4"
                        : index === 2
                        ? "#FFCC00, #CC9900"
                        : "#66E366, #4BC44B"
                    })`,
                  }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />

                  <div className="relative flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl font-black text-white/80">
                      {answerColors[index].icon}
                    </span>
                    <span className="text-lg sm:text-xl md:text-2xl font-black text-white text-left">
                      {option}
                    </span>
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      {answerResult?.isCorrect ? (
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-[#66E366]" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                          <XCircle className="w-5 h-5 text-[#FF3355]" />
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Answer Result */}
          {gameState === "answered" && answerResult && (
            <div className="mt-6 glass-card rounded-2xl p-6 text-center animate-[bounce-in_0.3s_ease-out]">
              {answerResult.isCorrect ? (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Zap className="w-6 h-6 text-[#66E366]" />
                    <span className="text-2xl font-black text-white">Correct!</span>
                  </div>
                  <p className="text-lg text-[#66E366]">+{answerResult.points} points</p>
                  {streak > 1 && (
                    <p className="text-lg text-[#FFCC00] mt-2">🔥 Streak: {streak}x</p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <XCircle className="w-6 h-6 text-[#FF3355]" />
                    <span className="text-2xl font-black text-white">Wrong!</span>
                  </div>
                  <p className="text-lg text-[#B8B8D1]">The correct answer was marked</p>
                </>
              )}
              <p className="text-sm text-[#6B7280] mt-4">Waiting for next question...</p>
            </div>
          )}

          {/* Keyboard Hints */}
          {gameState === "playing" && (
            <div className="mt-4 text-center">
              <p className="text-xs text-[#6B7280]">
                Press 1-4 or use arrow keys to answer
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
