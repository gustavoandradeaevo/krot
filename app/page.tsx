"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import {
  Gamepad2,
  Sparkles,
  Users,
  Zap,
  Trophy,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    socket.on("connect", () => {
      console.log("Connected to server");
    });

    socket.on("join-error", (message: string) => {
      setError(message);
      setIsJoining(false);
    });

    return () => {
      socket.off("connect");
      socket.off("join-error");
    };
  }, [socket]);

  const handleJoinGame = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roomCode.trim() || !playerName.trim()) {
      setError("Please enter both room code and your name");
      return;
    }

    if (roomCode.trim().length !== 6) {
      setError("Room code must be 6 characters");
      return;
    }

    setIsJoining(true);

    // Emit join-room event
    if (socket) {
      socket.emit("join-room", {
        roomCode: roomCode.toUpperCase(),
        playerName: playerName.trim(),
      });

      // Wait a moment then redirect
      setTimeout(() => {
        router.push(
          `/play/${roomCode.toUpperCase()}?name=${encodeURIComponent(
            playerName.trim()
          )}`
        );
      }, 500);
    }
  };

  const handleCreateGame = () => {
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Main Logo Section */}
      <div className="text-center mb-12 animate-[bounce-in_0.6s_ease-out]">
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex flex-col">
            <h1 className="text-6xl md:text-8xl font-black text-white tracking-tight">
              <span className="text-[#FF3355]">K</span>
              <span className="text-[#FA3275]">-</span>
              <span className="text-[#2684FF]">R</span>
              <span className="text-[#FFCC00]">U</span>
              <span className="text-[#66E366]">T</span>
            </h1>
            <p className="text-xl text-[#B8B8D1] font-semibold mt-2">
              Qualquer similaridade com o Kahoot é coincidência!
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-8 p-2 bg-white/5 rounded-2xl backdrop-blur-sm">
        <button
          onClick={() => setActiveTab("join")}
          className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            activeTab === "join"
              ? "bg-gradient-to-r from-[#FF6B35] to-[#FF8E53] text-white shadow-lg scale-105"
              : "text-[#B8B8D1] hover:text-white hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Join Game
          </div>
        </button>
        <button
          onClick={() => setActiveTab("create")}
          className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
            activeTab === "create"
              ? "bg-gradient-to-r from-[#2684FF] to-[#1E6AD4] text-white shadow-lg scale-105"
              : "text-[#B8B8D1] hover:text-white hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Create Game
          </div>
        </button>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md glass-card rounded-3xl p-8 animate-[slideInUp_0.6s_ease-out_0.2s_both]">
        {activeTab === "join" ? (
          <form onSubmit={handleJoinGame} className="space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-semibold">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-[#B8B8D1] mb-2 uppercase tracking-wide">
                Game PIN
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit PIN"
                maxLength={6}
                disabled={isJoining}
                className="w-full px-6 py-4 text-3xl font-black text-center tracking-[0.3em] input-kahoot uppercase placeholder:text-2xl placeholder:tracking-normal disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#B8B8D1] mb-2 uppercase tracking-wide">
                Your Nickname
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter nickname"
                maxLength={20}
                disabled={isJoining}
                className="w-full px-6 py-4 text-xl font-bold text-center input-kahoot placeholder:text-lg placeholder:font-normal disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isJoining || !roomCode.trim() || !playerName.trim()}
              className="w-full py-4 bg-gradient-to-r from-[#FF3355] to-[#FF6B35] text-white text-xl font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  LET&apos;S GO!
                  <Zap className="w-6 h-6" />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#2684FF] to-[#1E6AD4] flex items-center justify-center">
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Create Your Own Quiz!
              </h2>
              <p className="text-[#B8B8D1] mb-6">
                Design custom quizzes with timers, multiple choice questions, and
                compete with friends!
              </p>
            </div>

            <button
              onClick={handleCreateGame}
              className="w-full py-4 bg-gradient-to-r from-[#2684FF] to-[#1E6AD4] text-white text-xl font-black rounded-2xl shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
            >
              CREATE QUIZ
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      {/* Features */}
      <div className="mt-12 grid grid-cols-3 gap-6 max-w-2xl">
        {[
          { icon: Zap, label: "Fast", desc: "Quick games" },
          { icon: Users, label: "Multiplayer", desc: "Play with friends" },
          { icon: Trophy, label: "Compete", desc: "Win prizes" },
        ].map((feature, index) => (
          <div
            key={index}
            className="text-center animate-[slideInUp_0.6s_ease-out_0.4s_both]"
            style={{ animationDelay: `${0.4 + index * 0.1}s` }}
          >
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 flex items-center justify-center">
              <feature.icon className="w-7 h-7 text-[#FF6B35]" />
            </div>
            <p className="font-bold text-white">{feature.label}</p>
            <p className="text-sm text-[#6B7280]">{feature.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-[#6B7280] text-sm">
        <p>Tá em beta</p>
      </footer>
    </div>
  );
}
