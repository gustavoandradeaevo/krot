import { NextResponse } from 'next/server';
import { quizzes } from '../../../lib/store';

export async function POST(request: Request) {
  try {
    const { title, questions } = await request.json();
    
    // Generate a unique ID for the quiz
    const quizId = Math.random().toString(36).substr(2, 9);
    
    // Store the quiz
    quizzes.set(quizId, {
      id: quizId,
      title,
      questions
    });
    
    return NextResponse.json({ quizId }, { status: 201 });
  } catch (error) {
    console.error('Error saving quiz:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz' },
      { status: 500 }
    );
  }
}