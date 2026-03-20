"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Users,
  Copy,
  Check,
  Play,
  Trophy,
  Clock,
  Crown,
  ArrowLeft,
  UserPlus,
  Volume2,
  VolumeX,
  MoreHorizontal,
  Zap,
  Loader2,
  RotateCcw,
  Medal,
} from "lucide-react";

interface Player {
  id: string;
  name: string;
  score: number;
  joinedAt: Date;
}

interface Quiz {
  id: string;
  title: string;
  questions: Array<{
    text: string;
    options: string[];
    correctAnswerIndex: number;
    timeLimit: number;
  }>;
}

export default function RoomPage() {
  const params = useParams();
  const roomCode = params.code as string;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [gameState, setGameState] = useState<
    "waiting" | "countdown" | "playing" | "gameover"
  >("waiting");
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Host connected to server");
      
      // Host joins the room as well so they can receive player updates
      newSocket.emit("join-room", {
        roomCode: roomCode.toUpperCase(),
        playerName: "Host",
      });
      
      fetchRoomData();
    });

    newSocket.on("connect_error", () => {
      setError("Failed to connect to server");
      setIsLoading(false);
    });

    return () => {
      newSocket.close();
    };
  }, [roomCode]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // Update players list
    socket.on("update-players", (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    // Game over
    socket.on(
      "game-over",
      (data: { players: Player[]; rankings: { playerId: string; rank: number }[] }) => {
        setPlayers(data.players);
        setGameState("gameover");
      }
    );

    // Room reset (when Play Again is clicked)
    socket.on("room-reset", () => {
      const resetPlayers = players.map((p) => ({ ...p, score: 0 }));
      setPlayers(resetPlayers);
      setGameState("waiting");
      setCountdown(3);
    });

    return () => {
      socket.off("update-players");
      socket.off("game-over");
      socket.off("room-reset");
    };
  }, [socket]);

  // Fetch room data
  const fetchRoomData = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setQuiz(data.quiz);
        setPlayers(data.players || []);
      } else {
        setError("Room not found");
      }
    } catch (err) {
      console.error("Error fetching room:", err);
      setQuiz({
        id: "1",
        title: "Trivia Challenge",
        questions: [
          {
            text: "What is the capital of France?",
            options: ["London", "Berlin", "Paris", "Madrid"],
            correctAnswerIndex: 2,
            timeLimit: 30,
          },
          {
            text: "Which planet is known as the Red Planet?",
            options: ["Venus", "Mars", "Jupiter", "Saturn"],
            correctAnswerIndex: 1,
            timeLimit: 30,
          },
          {
            text: "What is 7 × 8?",
            options: ["54", "56", "48", "64"],
            correctAnswerIndex: 1,
            timeLimit: 30,
          },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown logic
  useEffect(() => {
    if (gameState === "countdown" && countdown > 0) {
      const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === "countdown" && countdown === 0) {
      // Start the game - notify server to begin
      if (socket) {
        socket.emit("start-game", roomCode.toUpperCase());
      }
      // Host stays on this page, just change visual state
      setGameState("playing");
    }
  }, [gameState, countdown, roomCode, socket]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = () => {
    if (players.length < 1) {
      setError("Need at least 1 player to start");
      setTimeout(() => setError(""), 3000);
      return;
    }

    if (socket) {
      socket.emit("game-starting", roomCode.toUpperCase());
    }

    setGameState("countdown");
  };

  const playAgain = () => {
    // Reset room state
    if (socket) {
      socket.emit("reset-room", roomCode.toUpperCase());
    }

    // Reset scores
    const resetPlayers = players.map((p) => ({ ...p, score: 0 }));
    setPlayers(resetPlayers);
    setGameState("waiting");
    setCountdown(3);
  };

  const getRandomAvatar = (name: string, index: number) => {
    const colors = [
      "#FF3355",
      "#2684FF",
      "#FFCC00",
      "#66E366",
      "#8854C0",
      "#FF6B35",
    ];
    const color = colors[index % colors.length];
    const initial = name.charAt(0).toUpperCase();

    return (
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
        style={{ backgroundColor: color }}
      >
        {initial}
      </div>
    );
  };

  // Sort players by score for game over screen
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Medal styles for top 3
  const getMedalStyle = (rank: number) => {
    switch (rank) {
      case 0: // Gold
        return {
          bg: "from-[#FFD700] to-[#FFA500]",
          border: "border-[#FFD700]",
          shadow: "shadow-yellow-500/50",
          icon: "🥇",
          label: "1st",
        };
      case 1: // Silver
        return {
          bg: "from-[#C0C0C0] to-[#808080]",
          border: "border-[#C0C0C0]",
          shadow: "shadow-gray-400/50",
          icon: "🥈",
          label: "2nd",
        };
      case 2: // Bronze
        return {
          bg: "from-[#CD7F32] to-[#8B4513]",
          border: "border-[#CD7F32]",
          shadow: "shadow-orange-600/50",
          icon: "🥉",
          label: "3rd",
        };
      default:
        return {
          bg: "from-white/10 to-white/5",
          border: "border-white/10",
          shadow: "",
          icon: rank + 1,
          label: `${rank + 1}th`,
        };
    }
  };

  // Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-16 h-16 text-[#FF6B35] animate-spin mb-6" />
        <h1 className="text-3xl font-black text-white">Loading Room...</h1>
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

  // Playing screen - Host watches the game
  if (gameState === "playing") {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="glass-card border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF3355] to-[#FF6B35] flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white">Game in Progress</h1>
                  <p className="text-sm text-[#B8B8D1]">Watch players answer questions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#B8B8D1] uppercase tracking-wide">Room</p>
                <p className="text-3xl font-black text-white pin-display">{roomCode}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <div className="glass-card rounded-3xl p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#66E366] to-[#4BC44B] flex items-center justify-center animate-pulse">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              Game is Live!
            </h2>
            <p className="text-xl text-[#B8B8D1] mb-8">
              Players are answering questions in real-time
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="glass-card rounded-2xl p-4">
                <p className="text-3xl font-black text-white">{players.length}</p>
                <p className="text-sm text-[#B8B8D1]">Active Players</p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <p className="text-3xl font-black text-[#FF6B35]">{players.filter(p => p.name !== 'Host').length}</p>
                <p className="text-sm text-[#B8B8D1]">Real Players</p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <p className="text-3xl font-black text-[#FFCC00]">{quiz?.questions?.length || 0}</p>
                <p className="text-sm text-[#B8B8D1]">Questions</p>
              </div>
              <div className="glass-card rounded-2xl p-4">
                <p className="text-3xl font-black text-[#66E366]">Live</p>
                <p className="text-sm text-[#B8B8D1]">Status</p>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-black text-white mb-4 flex items-center justify-center gap-2">
                <Users className="w-5 h-5 text-[#FF6B35]" />
                Players in Game
              </h3>
              <div className="flex flex-wrap justify-center gap-2">
                {players.filter(p => p.name !== 'Host').map((player, index) => (
                  <div
                    key={player.id}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-sm"
                  >
                    {player.name}: {player.score.toLocaleString()} pts
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-8 text-sm text-[#6B7280]">
              The game will automatically end when all questions are answered
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Game Over Scoreboard Screen
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
                          ? `bg-gradient-to-br ${style.bg} text-white shadow-lg ${style.shadow}`
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

        {/* Play Again Button */}
        <div className="max-w-md mx-auto w-full mb-8">
          <button
            onClick={playAgain}
            className="w-full py-5 bg-gradient-to-r from-[#66E366] to-[#4BC44B] text-white text-2xl font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[1.01] transition-all duration-200 flex items-center justify-center gap-3"
          >
            <RotateCcw className="w-8 h-8" />
            PLAY AGAIN
          </button>
        </div>

        {/* Footer */}
        <footer className="text-center text-[#6B7280] text-sm">
          <p>Room: {roomCode.toUpperCase()}</p>
        </footer>
      </div>
    );
  }

  // Waiting/Lobby Screen
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.href = "/"}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-[#FFCC00]" />
                  Game Lobby
                </h1>
                <p className="text-sm text-[#B8B8D1]">Waiting for players...</p>
              </div>
            </div>

            {/* Room Code Display */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-[#B8B8D1] uppercase tracking-wide font-bold">
                  Game PIN
                </p>
                <p className="text-3xl font-black text-white pin-display">
                  {roomCode}
                </p>
              </div>
              <button
                onClick={copyToClipboard}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
              >
                {copied ? (
                  <Check className="w-6 h-6 text-[#66E366]" />
                ) : (
                  <Copy className="w-6 h-6 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6 text-white" />
                ) : (
                  <Volume2 className="w-6 h-6 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl glass-card border-l-4 border-[#FF3355] bg-red-500/10 animate-[slideInUp_0.3s_ease-out]">
            <p className="text-red-400 font-semibold">{error}</p>
          </div>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2684FF] to-[#1E6AD4] flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{players.length}</p>
              <p className="text-xs text-[#B8B8D1] font-bold uppercase tracking-wide">
                Players
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#66E366] to-[#4BC44B] flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">
                {quiz?.questions?.length || 0}
              </p>
              <p className="text-xs text-[#B8B8D1] font-bold uppercase tracking-wide">
                Questions
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFCC00] to-[#FFAA00] flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">30s</p>
              <p className="text-xs text-[#B8B8D1] font-bold uppercase tracking-wide">
                Per Question
              </p>
            </div>
          </div>
        </div>

        {/* Players Grid */}
        <div className="glass-card rounded-3xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-[#66E366]" />
              Players Joined
            </h2>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#66E366] animate-pulse" />
              <span className="text-sm text-[#B8B8D1]">
                {players.length}/20 players
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {players.length > 0 ? (
              players.map((player, index) => (
                <div
                  key={player.id}
                  className="glass-card rounded-2xl p-4 text-center card-hover animate-[slideInUp_0.3s_ease-out]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {getRandomAvatar(player.name, index)}
                  <p className="mt-2 text-sm font-bold text-white truncate">
                    {player.name}
                  </p>
                  <p className="text-xs text-[#6B7280]">Joined just now</p>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-[#6B7280]">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No players yet</p>
                <p className="text-sm">Share the game PIN to invite players</p>
              </div>
            )}

            {/* Empty slots */}
            {players.length > 0 &&
              Array.from({ length: Math.max(0, 6 - players.length) }).map(
                (_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-4 text-center opacity-50"
                  >
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center">
                      <MoreHorizontal className="w-6 h-6 text-white/30" />
                    </div>
                    <p className="mt-2 text-sm text-white/30">Waiting...</p>
                  </div>
                )
              )}
          </div>
        </div>

        {/* Quiz Info */}
        {quiz && (
          <div className="glass-card rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-black text-white mb-2">Quiz: {quiz.title}</h3>
            <p className="text-sm text-[#B8B8D1]">
              {quiz.questions.length} questions • 30 seconds per question
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={startGame}
            disabled={players.length < 1}
            className="flex-1 py-5 bg-gradient-to-r from-[#FF3355] to-[#FF6B35] text-white text-2xl font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <Play className="w-8 h-8" />
            START GAME
            <Zap className="w-8 h-8" />
          </button>
        </div>

        {players.length < 1 && (
          <p className="text-center text-[#B8B8D1] mt-4 text-sm">
            Need at least 1 player to start
          </p>
        )}
      </main>
    </div>
  );
}
