import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { CopyButton } from "./CopyButton";

type ChatMessage = {
  id: string;
  projectId: string;
  sender: string;
  text: string;
  ts: number;
};

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function ChatPanel({
  projectId,
  wallet,
  peer,
}: {
  projectId: string;
  wallet: string;
  peer?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const roomLabel = useMemo(() => `project:${projectId}`, [projectId]);

  useEffect(() => {
    const socket = io(API_URL, { transports: ["polling", "websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("chat:join", { projectId, wallet });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:history", (history: ChatMessage[]) => {
      setMessages(history ?? []);
    });
    socket.on("chat:message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.disconnect();
    };
  }, [projectId, wallet]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat:message", { projectId, wallet, text });
    setInput("");
  };

  return (
    <div className="border rounded-2xl bg-white border-neutral-200/80 shadow-sm p-6 md:p-7">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-display font-bold text-lg text-neutral-900">Chat</h4>
          <p className="text-xs text-neutral-500">
            {connected ? "Connected" : "Connecting…"} · Room {roomLabel}
          </p>
        </div>
        {peer && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="font-mono">{peer.slice(0, 6)}…{peer.slice(-4)}</span>
            <CopyButton text={peer} label="Copy" />
          </div>
        )}
      </div>

      <div className="h-72 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50/70 p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-500">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          const mine = m.sender === wallet;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                mine ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200"
              }`}>
                <p className="break-words">{m.text}</p>
                <div className={`mt-1 text-[11px] ${mine ? "text-neutral-300" : "text-neutral-400"}`}>
                  {new Date(m.ts).toLocaleTimeString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="input-field flex-1"
          placeholder="Write a message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage();
          }}
        />
        <button className="btn-primary px-5" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
