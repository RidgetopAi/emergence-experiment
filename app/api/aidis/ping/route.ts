import { NextRequest, NextResponse } from 'next/server';
import type { EmergenceApiResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const aidisUrl = process.env.AIDIS_API_URL || 'http://localhost:8080';

    const response = await fetch(`${aidisUrl}/mcp/tools/aidis_ping`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
      // Short timeout for ping
      signal: AbortSignal.timeout(3000)
    });

    const connected = response.ok;

    const apiResponse: EmergenceApiResponse<{ connected: boolean }> = {
      success: true,
      data: { connected },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiResponse);
  } catch (error) {
    console.warn('AIDIS ping failed:', error);

    const apiResponse: EmergenceApiResponse<{ connected: boolean }> = {
      success: true,
      data: { connected: false },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(apiResponse);
  }
}