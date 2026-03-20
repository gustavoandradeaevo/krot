import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "QuizGame - Fun Learning Made Awesome",
  description: "Create, play, and learn with interactive quizzes. A fun and engaging quiz game for everyone!",
  keywords: ["quiz", "learning", "education", "game", "interactive"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <div className="animated-bg"></div>
        {children}
      </body>
    </html>
  );
}
