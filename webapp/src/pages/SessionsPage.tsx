import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Play, RefreshCw } from 'lucide-react'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 5_000 } } })

const STATUS_COLOR: Record<string, string> = {
  running:   'text-amber-400 bg-amber-400/10',
  completed: 'text-green-400 bg-green-400/10',
  failed:    'text-red-400 bg-red-400/10',
}

function Inner() {
  const queryClient = useQueryClient()
  const [prompt, setPrompt]   = useState('')
  const [provider, setProvider] = useState('')
  const [model, setModel]     = useState('')
  const [selected, setSelected] = useState<any>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions?limit=50').then(r => r.json()),
    refetchInterval: 3_000,
  })

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['session', selected?.id],
    queryFn: () => fetch(`/api/sessions/${selected.id}`).then(r => r.json()),
    enabled: !!selected?.id,
    refetchInterval: selected?.status === 'running' ? 2_000 : false,
  })

  const start = useMutation({
    mutationFn: (body: object) =>
      fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: () => {
      setPrompt('')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const sessions = data?.sessions ?? []

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Start goose tasks and inspect output</p>
        </div>
        <button onClick={() => refetch()} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Start form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-6 space-y-3">
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Enter a prompt for goose..."
          rows={3}
          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-amber-500"
        />
        <div className="flex gap-3 flex-wrap">
          <input
            value={provider} onChange={e => setProvider(e.target.value)}
            placeholder="Provider (e.g. ollama)"
            className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500 w-44"
          />
          <input
            value={model} onChange={e => setModel(e.target.value)}
            placeholder="Model (e.g. qwen3.5:27b)"
            className="bg-zinc-950 border border-zinc-700 rounded-md px-3 py-1.5 text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-amber-500 w-52"
          />
          <button
            onClick={() => start.mutate({ prompt, provider: provider || undefined, model: model || undefined })}
            disabled={!prompt.trim() || start.isPending}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-sm font-medium rounded-md transition-colors"
          >
            <Play size={14} /> {start.isPending ? 'Starting...' : 'Run'}
          </button>
        </div>
        {start.data?.error && (
          <p className="text-xs text-red-400">{start.data.error}</p>
        )}
      </div>

      <div className="flex gap-4">
        {/* Session list */}
        <div className="flex-1 space-y-1.5 min-w-0">
          {isLoading && <p className="text-sm text-zinc-600">Loading...</p>}
          {sessions.length === 0 && !isLoading && (
            <p className="text-sm text-zinc-600">No sessions yet.</p>
          )}
          {sessions.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors
                ${selected?.id === s.id
                  ? 'border-amber-500/50 bg-amber-500/5'
                  : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}
            >
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[s.status] ?? 'text-zinc-400 bg-zinc-800'}`}>
                {s.status}
              </span>
              <span className="text-xs font-mono text-zinc-600">{s.id}</span>
              <span className="text-sm text-zinc-300 truncate flex-1">{s.prompt}</span>
              <span className="text-xs text-zinc-600 shrink-0">{s.started_at?.slice(11, 19)}</span>
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-80 shrink-0 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-400">{selected.id}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLOR[detail?.status ?? selected.status] ?? ''}`}>
                {detail?.status ?? selected.status}
              </span>
            </div>
            <p className="text-sm text-zinc-300">{detail?.prompt ?? selected.prompt}</p>
            {detail?.provider && <p className="text-xs text-zinc-500">provider: {detail.provider} / {detail.model}</p>}
            {detail?.output && (
              <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded p-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-zinc-400 font-mono">
                {detail.output.slice(-3000)}
              </pre>
            )}
            {detail?.exit_code != null && (
              <p className="text-xs text-zinc-500">exit code: {detail.exit_code}</p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function SessionsPage() {
  return <QueryClientProvider client={qc}><Inner /></QueryClientProvider>
}
