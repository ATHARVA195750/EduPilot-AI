import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, Minus, Send, User, X } from 'lucide-react';

/**
 * Reusable AI chat panel (extracted from the StudentChat interaction pattern).
 * Stays mounted while `open` toggles visibility so conversation history persists
 * for the current session. `send` must resolve to the assistant reply text.
 */
export default function AIChat({ open, onClose, title, subtitle, welcome, suggestions = [], send }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (open && !seededRef.current) {
      seededRef.current = true;
      setMessages([{ role: 'assistant', content: welcome }]);
    }
  }, [open, welcome]);

  // Focus the input when the panel opens; hand focus back to the launcher button
  // once it has closed (this runs after commit, so the trigger is back in the DOM).
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      inputRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      requestAnimationFrame(() => document.getElementById('edupilot-copilot-trigger')?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, open]);

  const sendMessage = async (textToSend) => {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const reply = await send(text);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: err?.message
            ? `⚠️ ${err.message}`
            : '⚠️ Unable to reach the EduPilot AI service. Please check your connection and try again.',
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (event) => {
    event?.preventDefault();
    sendMessage();
  };

  if (!open) return null;

  const showSuggestions = suggestions.length > 0 && messages.length <= 1 && !loading;

  return (
    <div
      role="dialog"
      aria-label={title}
      className="fixed bottom-4 right-4 z-50 flex h-[min(560px,calc(100vh-6rem))] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/80 sm:bottom-6 sm:right-6"
    >
      <div className="flex items-center justify-between border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-600/20 text-blue-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Minimize copilot"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Close copilot"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div role="log" aria-live="polite" aria-relevant="additions" className="flex-1 space-y-3.5 overflow-y-auto p-4 text-sm">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                msg.role === 'user'
                  ? 'rounded-br-none bg-blue-600 text-white'
                  : msg.isError
                    ? 'rounded-bl-none border border-rose-500/40 bg-rose-500/10 text-rose-200'
                    : 'rounded-bl-none border border-slate-800 bg-slate-900 text-slate-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
            <span>EduPilot is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      {showSuggestions && (
        <div className="flex flex-wrap gap-2 border-t border-slate-800 px-3 py-2.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.label}
              type="button"
              onClick={() => {
                if (suggestion.prefill) {
                  // Open-ended starter prompts fill the input so the user can
                  // complete the sentence before sending.
                  setInput(suggestion.prompt);
                  requestAnimationFrame(() => inputRef.current?.focus());
                } else {
                  sendMessage(suggestion.prompt);
                }
              }}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:border-blue-500 hover:bg-slate-800 hover:text-white"
            >
              {suggestion.icon} {suggestion.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-slate-800 p-3">
        <label htmlFor="edupilot-copilot-input" className="sr-only">
          Ask EduPilot Copilot
        </label>
        <textarea
          id="edupilot-copilot-input"
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask about fees, attendance, students…"
          className="min-h-[42px] max-h-28 flex-1 resize-none rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder-slate-500 focus:border-blue-500"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={loading || !input.trim()}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );
}
