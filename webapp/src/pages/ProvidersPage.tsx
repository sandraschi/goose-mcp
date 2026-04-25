import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RefreshCw, Cpu } from 'lucide-react'

const qc = new QueryClient()

function Inner() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['providers'],
    queryFn: () => fetch('/api/providers').then(r => r.json()),
    staleTime: 20_000,
  })

  const providers = data?.providers ?? []

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Providers</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Configured LLM providers from goose config</p>
        </div>
        <button onClick={() => refetch()} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoading && <p className="text-sm text-zinc-600">Loading...</p>}

      {providers.length === 0 && !isLoading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
          <Cpu size={32} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">No providers found in goose config.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Run <code className="font-mono text-amber-400">goose configure</code> to set up a provider.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {providers.map((p: any, i: number) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            {p.error ? (
              <p className="text-sm text-red-400">{p.error}</p>
            ) : p.note ? (
              <p className="text-sm text-zinc-500">{p.note}</p>
            ) : (
              <div className="flex items-center gap-3">
                <Cpu size={14} className="text-amber-400 shrink-0" />
                <span className="text-sm text-zinc-200 font-medium">{p.name}</span>
                {p.config_path && (
                  <span className="text-xs text-zinc-600 font-mono ml-auto">{p.config_path}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <p className="text-xs text-zinc-500">
          Provider config is read from <code className="font-mono text-amber-400">~/.config/goose/config.yaml</code>.
          For Ollama: set provider to <code className="font-mono text-zinc-300">ollama</code> and model to
          e.g. <code className="font-mono text-zinc-300">qwen3.5:27b</code> (free, local).
          For OpenRouter: use an API key and model like <code className="font-mono text-zinc-300">deepseek/deepseek-v4</code>.
        </p>
      </div>
    </motion.div>
  )
}

export default function ProvidersPage() {
  return <QueryClientProvider client={qc}><Inner /></QueryClientProvider>
}
