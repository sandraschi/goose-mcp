import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Bot, Download, Eraser, User, Loader2 } from 'lucide-react'

const STORAGE_KEY = 'goose-mcp-chat-history'
const PERSONALITY_KEY = 'goose-mcp-chat-personality'

interface Message { role: 'user' | 'assistant'; content: string }
type Personality = { id: string; label: string; prompt: string }

const PERSONALITIES: Personality[] = [
  { id: 'agent-op', label: 'Agent Operator', prompt: 'You are a Goose AI agent operator. Help with task planning, agent orchestration, execution monitoring, and workflow automation.' },
  { id: 'task-planner', label: 'Task Planner', prompt: 'You are a task planning specialist. Focus on breaking down complex goals into executable steps, dependency tracking, and progress management.' },
  { id: 'summarizer', label: 'Quick Summarizer', prompt: 'You are a concise assistant. Provide brief, focused answers with bullet points.' },
  { id: 'custom', label: 'Custom', prompt: '' },
]

const EXAMPLE_GROUPS: Record<string, string[]> = {
  'Tasks': ['Plan a multi-step data processing pipeline', 'Break down a code migration into tasks', 'Create a task dependency graph for a release'],
  'Agents': ['List available agents and their capabilities', 'Show agent execution log', 'Configure a new agent for web scraping'],
  'Config': ['Show current Goose configuration', 'Update agent timeout settings', 'List available tools and MCP servers'],
}

const OLLAMA_DEFAULT = 'http://localhost:11434'

function loadHistory(): Message[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

function saveHistory(messages: Message[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); } catch {}
}

function loadPersonality(): string {
  try { return localStorage.getItem(PERSONALITY_KEY) || 'agent-op'; } catch { return 'agent-op'; }
}

async function detectOllama(): Promise<string | null> {
  try {
    const r = await fetch(`${OLLAMA_DEFAULT}/api/tags`, { signal: AbortSignal.timeout(2000) })
    if (r.ok) return OLLAMA_DEFAULT
  } catch { /* not running */ }
  return null
}

async function ollamaChat(base: string, model: string, messages: Message[], personality: Personality): Promise<string> {
  const systemPrompt = personality.id === 'custom'
    ? (localStorage.getItem('goose-mcp-custom-prompt') || 'You are a helpful AI assistant.')
    : `${personality.prompt}\n\nYou are Goose MCP, a Goose AI agent management server for task planning and execution.`
  const r = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages.map(m => ({ role: m.role, content: m.content }))],
      stream: false,
    }),
  })
  if (!r.ok) throw new Error(`Ollama error ${r.status}`)
  const data = await r.json()
  return data.message?.content ?? '(empty response)'
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(loadHistory)
  const [input, setInput] = useState('')
  const [model, setModel] = useState('qwen3.5:27b')
  const [ollamaUrl, setOllamaUrl] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [personalityId, setPersonalityId] = useState(loadPersonality)
  const bottomRef = useRef<HTMLDivElement>(null)

  const personality = PERSONALITIES.find(p => p.id === personalityId) || PERSONALITIES[0]

  useEffect(() => {
    detectOllama().then(url => { setOllamaUrl(url); setChecking(false) })
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => { saveHistory(messages) }, [messages])

  useEffect(() => { localStorage.setItem(PERSONALITY_KEY, personalityId) }, [personalityId])

  const send = useCallback(async () => {
    if (!input.trim() || loading || !ollamaUrl) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await ollamaChat(ollamaUrl, model, next, personality)
      setMessages(m => [...m, { role: 'assistant', content: reply }])
    } catch (err: any) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, ollamaUrl, messages, model, personality])

  const handleExport = useCallback(() => {
    const lines = messages.map(m => {
      const ts = new Date().toISOString()
      return `[${ts}] ${m.role === 'user' ? 'You' : 'Assistant'}: ${m.content}`
    }).join('\n')
    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `goose-mcp-chat-${Date.now()}.txt`; a.click()
    URL.revokeObjectURL(url)
  }, [messages])

  const handleClear = useCallback(() => {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full p-6" data-testid="chat-page">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-3" data-testid="chat-controls">
        <div>
          <h1 className="text-xl font-semibold">Chat</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Local Ollama — zero cost</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-400 bg-amber-950/30 px-2 py-0.5 rounded font-medium">skill:goose-operator</span>
          {checking ? (
            <span className="text-xs text-zinc-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Detecting Ollama...</span>
          ) : ollamaUrl ? (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Ollama: {ollamaUrl}
            </span>
          ) : (
            <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Ollama not detected
            </span>
          )}
          <select
            data-testid="personality-select"
            value={personalityId}
            onChange={e => setPersonalityId(e.target.value)}
            className="bg-zinc-800 text-zinc-100 border border-zinc-600 rounded px-2 py-1 text-xs"
          >
            {PERSONALITIES.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button onClick={handleExport} disabled={messages.length === 0} data-testid="chat-export" title="Export chat" className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-30">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={handleClear} disabled={messages.length === 0} data-testid="chat-clear" title="Clear chat" className="p-1.5 rounded text-zinc-400 hover:text-white disabled:opacity-30">
            <Eraser className="w-4 h-4" />
          </button>
          <input
            value={model} onChange={e => setModel(e.target.value)}
            placeholder="model name"
            className="bg-zinc-950 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500 w-40 font-mono"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0" data-testid="chat-messages">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
            <Bot size={36} />
            <p className="text-sm">Chat with a local Ollama model</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className="flex gap-2 max-w-[80%]">
              {m.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full bg-amber-900/20 flex items-center justify-center border border-amber-800 shrink-0 mt-1">
                  <Bot className="h-3.5 w-3.5 text-amber-400" />
                </div>
              )}
              <div>
                <span className={`text-xs ${m.role === 'user' ? 'text-amber-300' : 'text-amber-400'} block mb-0.5`}>
                  {m.role === 'user' ? 'You' : 'Goose AI'}
                </span>
                <div className={`px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap
                  ${m.role === 'user'
                    ? 'bg-amber-500/20 text-amber-100'
                    : 'bg-zinc-800 text-zinc-200'}`}>
                  {m.content}
                </div>
              </div>
              {m.role === 'user' && (
                <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center border border-zinc-600 shrink-0 mt-1">
                  <User className="h-3.5 w-3.5 text-zinc-300" />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-full bg-amber-900/20 flex items-center justify-center border border-amber-800">
                <Bot className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="bg-zinc-800 px-4 py-2.5 rounded-xl text-sm text-zinc-500 animate-pulse flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex flex-wrap gap-2 mb-3" data-testid="example-prompts">
        {Object.entries(EXAMPLE_GROUPS).map(([group, prompts]) => (
          <div key={group} className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-zinc-500 mr-1">{group}:</span>
            {prompts.map(p => (
              <button
                key={p}
                onClick={() => setInput(p)}
                className="text-xs px-2.5 py-1 rounded-full border border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <textarea
          data-testid="chat-input"
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
          data-testid="chat-send"
        >
          <Send size={16} />
        </button>
      </div>
    </motion.div>
  )
}
