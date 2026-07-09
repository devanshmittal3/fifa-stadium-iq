import { useState, useEffect, useRef } from "react";

export function useZoneSocket(url) {
  const [zones, setZones] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    function connect() {
      console.log(`Connecting to WebSocket: ${url}`);
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connected.");
        setIsConnected(true);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setZones(data);
        } catch (err) {
          console.error("Failed to parse zone stream data:", err);
        }
      };

      socket.onclose = (event) => {
        console.log("WebSocket closed. Attempting reconnect in 3s...", event.reason);
        setIsConnected(false);
        socketRef.current = null;
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.error("WebSocket error:", err);
        socket.close();
      };
    }

    connect();

    return () => {
      if (socketRef.current) {
        // Clear close handler first so we don't trigger auto-reconnect on unmount
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url]);

  return { zones, isConnected };
}
