import { NextResponse } from 'next/server';
import { AccessToken, VideoGrant } from 'livekit-server-sdk';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

// Read credentials server-side (NOT prefixed with NEXT_PUBLIC_)
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://spark2scake-m21msxah.livekit.cloud';

export const revalidate = 0;

export async function POST(_req: Request) {
  try {
    if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is not defined');
    if (!API_KEY)     throw new Error('LIVEKIT_API_KEY is not defined');
    if (!API_SECRET)  throw new Error('LIVEKIT_API_SECRET is not defined');

    const participantName     = 'Founder';
    const participantIdentity = `user_${Math.floor(Math.random() * 10000)}`;
    const roomName            = `pitch-room-session_${Math.floor(Math.random() * 10000)}`;

    // 1. Fire-and-forget: wake up the Python LiveKit AI Worker (do NOT await — this takes 60s!)
    //    We intentionally skip awaiting so the token is returned immediately.
    const pythonApiUrl = process.env.PYTHON_API_URL || 'https://spark2scale-ai-api-server.azurewebsites.net';
    fetch(`${pythonApiUrl}/api/v1/pitch-analyzer/start`, { method: 'POST' })
      .then(() => console.log('[Token Route] Python AI worker pinged successfully'))
      .catch((e) => console.error('[Token Route] Failed to ping Python AI worker:', e));

    // 2. Generate the LiveKit JWT directly (same approach as the working standalone UI)
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity: participantIdentity,
      name: participantName,
      ttl: '1h',
    });

    const grant: VideoGrant = {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };
    at.addGrant(grant);

    const participantToken = await at.toJwt();

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantName,
      participantToken,
    };

    const headers = new Headers({ 'Cache-Control': 'no-store' });
    return NextResponse.json(data, { headers });

  } catch (error) {
    if (error instanceof Error) {
      console.error('[Token Route] Error:', error.message);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}