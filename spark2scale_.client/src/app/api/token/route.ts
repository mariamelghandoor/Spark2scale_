import { NextResponse } from 'next/server';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';
// Note: Make sure NEXT_PUBLIC_LIVEKIT_URL or LIVEKIT_URL is set in your .env.local
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL || 'wss://spark2scake-m21msxah.livekit.cloud';

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) {
      throw new Error('LIVEKIT_URL is not defined');
    }

    // In a real application, you would extract the user context (e.g. from session/cookies)
    // and pass the actual sessionId/userId to the backend.
    const participantName = 'Founder';
    const participantIdentity = `user_${Math.floor(Math.random() * 10000)}`;
    const sessionId = `session_${Math.floor(Math.random() * 10000)}`;

    // 1. Trigger the Python AI Worker to wake up / spawn (so it's ready to handle the LiveKit session)
    try {
      const pythonApiUrl = process.env.PYTHON_API_URL || 'https://spark2scale-ai-api-server.azurewebsites.net';
      await fetch(`${pythonApiUrl}/api/v1/pitch-analyzer/start`, {
        method: 'POST',
      });
      console.log('Successfully pinged the Python LiveKit Worker');
    } catch (e) {
      console.error('Failed to wake up the Python LiveKit Worker:', e);
      // We don't throw Error here because we don't want to block the token if the worker is already running or unresponsive.
    }

    // 2. Negotiate the Token with the .NET Backend
    const response = await fetch(`${API_BASE_URL}/api/PitchSession/generate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: sessionId,
        userId: participantIdentity,
        userName: participantName,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate token from backend. Status: ${response.status}`);
    }

    // The .NET backend returns { token, roomName } based on the anonymous object property names (default JSON casing behavior)
    const backendData = await response.json();
    const token = backendData.token || backendData.Token;
    const roomName = backendData.roomName || backendData.RoomName;

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName: roomName,
      participantName: participantName,
      participantToken: token,
    };
    
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}