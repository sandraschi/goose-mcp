import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Bot } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string }

const OLLAMA_DEFAULT = 'http://localhost:11434'

async function detectOllama(): Promise<string | null> {
  try {
    const r = await fetch(`${OLLAMA_DEFAULT}/api/tags`, { signal: AbortSignal.timeout(2000) })
    if (r.ok) return OLLAMA_DEFAULT
  } catch { /* not running */ }
  return null
}

async function ollamaChat(base: string, model: string, messages: Message[]): Promise<string> {
  const r = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    }),
  })
  if (!r.ok) throw new Error(`Ollama error ${r.status}`)
  const data = await r.json()
  return data.message?.content ?? '(empty response)'
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState('qwen3.5:27b')
  const [ollamaUrl, setOllamaUrl] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    detectOllama().then(url => { setOllamaUrl(url); setChecking(false) })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    if (!input.trim() || loading || !ollamaUrl) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await ollamaChat(ollamaUrl, model, next)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (err: any) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full p-6">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold">Chat</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Local Ollama — zero cost</p>
        </div>
        <div className="flex items-center gap-2">
          {checking ? (
            <span className="text-xs text-zinc-500">Detecting Ollama...</span>
          ) : ollamaUrl ? (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Ollama: {ollamaUrl}</span>
          ) : (
            <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">
              Ollama not detected on :11434
            </span>
          )}
          <input
            value={model} onChange={e => setModel(e.target.value)}
            placeholder="model name"
            className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500 w-40 font-mono"
          />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <Bot size={36} />
            <p className="text-sm">Chat with a local Ollama model</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap
              ${m.role === 'user'
                ? 'bg-amber-500/20 text-amber-100'
                : 'bg-zinc-800 text-zinc-200'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 px-4 py-2.5 rounded-xl text-sm text-zinc-500 animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={ollamaUrl ? 'Message... (Enter to send)' : 'Start Ollama to enable chat'}
          disabled={!ollamaUrl || loading}
          rows={2}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-amber-500 disabled:opacity-40"
        />
        <button
          onClick={send}
          disabled={!ollamaUrl || !input.trim() || loading}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-lg transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  )
}
