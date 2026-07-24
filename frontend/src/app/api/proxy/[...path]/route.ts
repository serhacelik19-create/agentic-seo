import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5001'
).replace(/\/$/, '');

async function proxyRequest(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetPath = path.join('/');
  const searchParams = req.nextUrl.searchParams.toString();
  const targetUrl = `${BACKEND_URL}/api/${targetPath}${searchParams ? `?${searchParams}` : ''}`;

  const headers = new Headers(req.headers);
  // Remove host header to avoid host mismatch on target backend
  headers.delete('host');

  // Inject server-side secret ADMIN_API_KEY securely from server environment!
  const adminKey = process.env.ADMIN_API_KEY || process.env.NEXT_PUBLIC_API_KEY;
  if (adminKey) {
    headers.set('x-api-key', adminKey);
  }

  // Handle EventSource / SSE endpoint streaming
  if (targetPath === 'progress') {
    try {
      const backendRes = await fetch(targetUrl, {
        method: req.method,
        headers,
        cache: 'no-store',
      });

      return new Response(backendRes.body, {
        status: backendRes.status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
        },
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'EventSource proxy failed';
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }
  }

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD' ? await req.blob() : undefined;

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const data = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);

    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Backend connection error';
    console.error(`[API Proxy Error] Failed to proxy to ${targetUrl}:`, errorMessage);
    return NextResponse.json(
      { error: 'Backend Connection Failed', details: errorMessage },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
