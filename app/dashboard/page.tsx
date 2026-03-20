"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Save,
  Play,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [hostName, setHostName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("hostName") || "";
    }
    return "";
  });

  const [quizId, setQuizId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [questions, setQuestions] = useState<
    Array<{
      text: string;
      options: string[];
      correctAnswerIndex: number;
      timeLimit: number;
    }>
  >([
    {
      text: "",
      options: ["", "", "", ""],
      correctAnswerIndex: 0,
      timeLimit: 30,
    },
  ]);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isStartingRoom, setIsStartingRoom] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleHostNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHostName(value);
    if (typeof window !== "undefined") {
      localStorage.setItem("hostName", value);
    }
  };

  const handleQuizTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuizTitle(e.target.value);
  };

  const handleQuestionTextChange = (
    index: number,
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      newQuestions[index] = {
        ...newQuestions[index],
        text: e.target.value,
      };
      return newQuestions;
    });
  };

  const handleOptionChange = (
    questionIndex: number,
    optionIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        options: newQuestions[questionIndex].options.map((opt, i) =>
          i === optionIndex ? e.target.value : opt
        ),
      };
      return newQuestions;
    });
  };

  const handleCorrectAnswerChange = (
    questionIndex: number,
    optionIndex: number
  ) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        correctAnswerIndex: optionIndex,
      };
      return newQuestions;
    });
  };

  const handleTimeLimitChange = (
    questionIndex: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setQuestions((prevQuestions) => {
      const newQuestions = [...prevQuestions];
      newQuestions[questionIndex] = {
        ...newQuestions[questionIndex],
        timeLimit: parseInt(e.target.value) || 30,
      };
      return newQuestions;
    });
  };

  const addQuestion = () => {
    setQuestions((prevQuestions) => {
      const newQuestions = [
        ...prevQuestions,
        {
          text: "",
          options: ["", "", "", ""],
          correctAnswerIndex: 0,
          timeLimit: 30,
        },
      ];
      setTimeout(() => setCurrentQuestionIndex(newQuestions.length - 1), 0);
      return newQuestions;
    });
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      setSaveMessage("You need at least one question");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }
    setQuestions((prevQuestions) => {
      const newQuestions = prevQuestions.filter((_, i) => i !== index);
      if (currentQuestionIndex >= newQuestions.length) {
        setCurrentQuestionIndex(newQuestions.length - 1);
      }
      return newQuestions;
    });
  };

  const goToPreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextQuestion = () => {
    setCurrentQuestionIndex((prev) =>
      Math.min(questions.length - 1, prev + 1)
    );
  };

  const handleSaveQuiz = async () => {
    if (!hostName.trim()) {
      setSaveMessage("Please enter your name");
      return;
    }

    if (!quizTitle.trim()) {
      setSaveMessage("Please enter a quiz title");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setSaveMessage(`Question ${i + 1} must have text`);
        return;
      }
      if (q.options.some((opt) => !opt.trim())) {
        setSaveMessage(`Question ${i + 1} must have all 4 options filled`);
        return;
      }
    }

    setIsSaving(true);
    setSaveMessage("Saving quiz...");

    try {
      const quizData = {
        title: quizTitle,
        questions: questions.map((q) => ({
          text: q.text,
          options: q.options,
          correctAnswerIndex: q.correctAnswerIndex,
          timeLimit: q.timeLimit,
        })),
      };

      const response = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quizData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setQuizId(result.quizId);
      setIsSaving(false);
      setSaveMessage("Quiz saved successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      console.error("Error saving quiz:", error);
      setIsSaving(false);
      setSaveMessage("Error saving quiz. Please try again.");
    }
  };

  const handleStartRoom = async () => {
    if (!quizId) {
      setSaveMessage("Please save the quiz first");
      return;
    }

    setIsStartingRoom(true);
    setSaveMessage("Starting room...");

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quizId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      router.push(`/room/${result.roomCode}`);
    } catch (error) {
      console.error("Error starting room:", error);
      setIsStartingRoom(false);
      setSaveMessage("Error starting room. Please try again.");
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answerColors = [
    { bg: "from-[#FF3355] to-[#CC2944]", border: "#FF3355", icon: "▲" },
    { bg: "from-[#2684FF] to-[#1E6AD4]", border: "#2684FF", icon: "◆" },
    { bg: "from-[#FFCC00] to-[#CC9900]", border: "#FFCC00", icon: "●" },
    { bg: "from-[#66E366] to-[#4BC44B]", border: "#66E366", icon: "■" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="glass-card border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/")}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-[#FF6B35]" />
                  Create Quiz
                </h1>
                <p className="text-sm text-[#B8B8D1]">
                  Design your perfect quiz game
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={addQuestion}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Add Question
              </button>
              <button
                onClick={handleSaveQuiz}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#FF6B35] to-[#FF8E53] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? "Saving..." : "Save Quiz"}
              </button>
              <button
                onClick={handleStartRoom}
                disabled={!quizId || isStartingRoom}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-[#66E366] to-[#4BC44B] text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-5 h-5" />
                {isStartingRoom ? "Starting..." : "Start Game"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Messages */}
        {saveMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl glass-card border-l-4 ${
              saveMessage.includes("Error")
                ? "border-[#FF3355] bg-red-500/10"
                : saveMessage.includes("Saving") ||
                  saveMessage.includes("Starting")
                ? "border-[#2684FF] bg-blue-500/10"
                : "border-[#66E366] bg-green-500/10"
            } animate-[slideInUp_0.3s_ease-out]`}
          >
            <div className="flex items-center gap-3">
              {saveMessage.includes("Error") ? (
                <AlertCircle className="w-5 h-5 text-[#FF3355]" />
              ) : saveMessage.includes("success") ? (
                <CheckCircle2 className="w-5 h-5 text-[#66E366]" />
              ) : (
                <div className="w-5 h-5 border-2 border-[#2684FF] border-t-transparent rounded-full animate-spin" />
              )}
              <p
                className={`font-semibold ${
                  saveMessage.includes("Error")
                    ? "text-red-400"
                    : saveMessage.includes("success")
                    ? "text-green-400"
                    : "text-[#2684FF]"
                }`}
              >
                {saveMessage}
              </p>
            </div>
          </div>
        )}

        {/* Host Name Section */}
        <div className="glass-card rounded-3xl p-6 mb-6 card-hover">
          <h2 className="text-lg font-black text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#FFCC00]" />
            Host Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-[#B8B8D1] mb-2 uppercase tracking-wide">
                Your Name (Host)
              </label>
              <input
                type="text"
                value={hostName}
                onChange={handleHostNameChange}
                placeholder="Enter your name"
                className="w-full px-6 py-3 text-lg font-bold input-kahoot"
              />
              <p className="text-xs text-[#6B7280] mt-2">
                Your name will be saved for future games
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#B8B8D1] mb-2 uppercase tracking-wide">
                Quiz Title
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={handleQuizTitleChange}
                placeholder="Enter an exciting quiz title"
                className="w-full px-6 py-3 text-lg font-bold input-kahoot"
              />
            </div>
          </div>
        </div>

        {/* Questions Card */}
        <div className="glass-card rounded-3xl p-6 card-hover">
          {/* Question Navigation */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2684FF] to-[#1E6AD4] flex items-center justify-center text-white text-sm">
                {currentQuestionIndex + 1}
              </span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousQuestion}
                disabled={currentQuestionIndex === 0}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <span className="px-4 py-1 rounded-full bg-white/5 text-white font-mono text-sm">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
              <button
                onClick={goToNextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Question Form */}
          <div className="space-y-6">
            {/* Question Text */}
            <div>
              <label className="block text-sm font-bold text-[#B8B8D1] mb-2 uppercase tracking-wide">
                Question Text
              </label>
              <textarea
                value={currentQuestion.text}
                onChange={(e) =>
                  handleQuestionTextChange(currentQuestionIndex, e)
                }
                rows={3}
                placeholder="Enter your question here..."
                className="w-full px-6 py-4 text-lg input-kahoot resize-none"
              />
            </div>

            {/* Answer Options */}
            <div>
              <label className="block text-sm font-bold text-[#B8B8D1] mb-4 uppercase tracking-wide">
                Answer Options (Select the correct answer)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    onClick={() =>
                      handleCorrectAnswerChange(currentQuestionIndex, optIndex)
                    }
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all duration-300 btn-answer ${
                      currentQuestion.correctAnswerIndex === optIndex
                        ? "ring-4 ring-white/30"
                        : ""
                    }`}
                    style={{
                      background: `linear-gradient(145deg, ${
                        optIndex === 0
                          ? "#FF3355, #CC2944"
                          : optIndex === 1
                          ? "#2684FF, #1E6AD4"
                          : optIndex === 2
                          ? "#FFCC00, #CC9900"
                          : "#66E366, #4BC44B"
                      })`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-white/80">
                        {answerColors[optIndex].icon}
                      </span>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          handleOptionChange(
                            currentQuestionIndex,
                            optIndex,
                            e
                          )
                        }
                        onClick={(e) => e.stopPropagation()}
                        placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                        className="flex-1 bg-transparent text-white placeholder-white/50 font-bold text-lg border-none focus:outline-none"
                      />
                      {currentQuestion.correctAnswerIndex === optIndex && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Time Limit */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-[#B8B8D1] uppercase tracking-wide flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#FFCC00]" />
                  Time Limit
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="5"
                    max="120"
                    value={currentQuestion.timeLimit}
                    onChange={(e) =>
                      handleTimeLimitChange(currentQuestionIndex, e)
                    }
                    className="w-32 accent-[#FF6B35]"
                  />
                  <span className="px-4 py-2 rounded-xl bg-white/5 text-white font-mono font-bold">
                    {currentQuestion.timeLimit}s
                  </span>
                </div>
              </div>

              <button
                onClick={() => removeQuestion(currentQuestionIndex)}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Question
              </button>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="mt-8 glass-card rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-[#B8B8D1]">Progress</span>
            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF6B35] to-[#FFCC00] rounded-full transition-all duration-500"
                style={{
                  width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-bold text-white">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
