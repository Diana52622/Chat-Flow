"use client";
import { useState, useRef, useEffect } from "react";
import styles from "./Chat.module.css";

interface Message {
  from: "user" | "bot";
  text: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "Здравствуйте! Я помогу вам подобрать поездку. Опишите ваш запрос или ответьте на вопросы." },
  ]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((msgs) => [...msgs, { from: "user", text: userMsg }]);
    setInput("");
    inputRef.current?.focus();
    setLoading(true);
    try {
      const currentSessionId = sessionId || `frontend-session-${Math.floor(Math.random() * 1000000)}`;
      const res = await fetch("http://localhost:4000/api/dialog/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          sessionId: currentSessionId,
          languageCode: "ru"
        }),
      });
      const data = await res.json();
      setSessionId(currentSessionId);
      if (data.queryResult?.fulfillmentText) {
        setMessages((msgs) => [...msgs, { from: "bot", text: data.queryResult.fulfillmentText }]);
      }
    } catch {
      setMessages((msgs) => [...msgs, { from: "bot", text: "Ошибка соединения с сервером." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.chat}>
      <div className={styles.chat__messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={[
              styles.chat__message,
              msg.from === "user" ? styles["chat__message--user"] : styles["chat__message--bot"]
            ].join(" ")}
          >
            <span
              className={[
                styles.chat__bubble,
                msg.from === "user" ? styles["chat__bubble--user"] : styles["chat__bubble--bot"]
              ].join(" ")}
            >
              {msg.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className={styles.chat__form} onSubmit={sendMessage}>
        <input
          type="text"
          className={styles.chat__input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Введите сообщение..."
          autoFocus
          ref={inputRef}
        />
        <button
          type="submit"
          className={styles["chat__send-btn"]}
          disabled={loading || !input.trim()}
        >
          Отправить
        </button>
      </form>
    </div>
  );
}
