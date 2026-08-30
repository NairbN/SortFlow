"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
const RECONNECT_DELAY_MS = 2000;

/**
 * Connects directly to the FastAPI backend's WebSocket (not proxied through
 * the Next.js server - Vercel's serverless functions can't hold a
 * persistent connection). The backend only ever sends a content-free
 * "changed" signal, never order/pallet data, so this connection doesn't
 * need the BACKEND_API_KEY that gates the REST API - refresh() re-fetches
 * through the existing authenticated server-side path.
 */
export function RealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    if (!WS_URL) return;

    let socket: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;
    let stopped = false;

    function connect() {
      socket = new WebSocket(WS_URL!);
      socket.onmessage = () => router.refresh();
      socket.onclose = () => {
        if (!stopped) reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
    }

    connect();

    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [router]);

  return null;
}
