export interface PitchSessionTokenRequest {
  sessionId: string;
  userId: string;
  userName: string;
}

export interface PitchSessionTokenResponse {
  token: string;
  roomName: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5231';

export const pitchSessionService = {
  async generateToken(request: PitchSessionTokenRequest): Promise<PitchSessionTokenResponse> {
    const response = await fetch(`${API_BASE_URL}/api/PitchSession/generate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate pitch session token: ${response.statusText}`);
    }

    return await response.json();
  }
};
