import { NextResponse } from 'next/server';
import { rooms } from '../../../lib/store';

export async function POST(request: Request) {
  try {
    const { quizId } = await request.json();
    
    // Generate a random 6-character room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Store the room
    rooms.set(roomCode, {
      quizId,
      status: 'waiting',
      players: [],
      currentQuestion: 0
    });
    
    return NextResponse.json({ roomCode }, { status: 201 });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}