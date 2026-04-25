import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RefreshCw, Puzzle } from 'lucide-react'

const qc = new QueryClient()

function Inner() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['extensions'],
    queryFn: () => fetch('/api/extensions').then(r => r.json()),
    staleTime: 20_000,
  })

  const extensions = data?.extensions ?? []

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Extensions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Active goose extensions from config</p>
        </div>
        <button onClick={() => refetch()} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      {isLoading && <p className="text-sm text-zinc-600">Loading...</p>}

      {extensions.length === 0 && !isLoading && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
          <Puzzle size={32} className="mx-auto mb-3 text-zinc-700" />
          <p className="text-sm text-zinc-500">No extensions found in goose config.</p>
          <p className="text-xs text-zinc-600 mt-1">
            Browse <a href="https://goose-docs.ai/extensions" target="_blank" className="text-amber-400 hover:underline">
              goose extensions
            </a> to add MCP servers and tools.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {extensions.map((e: any, i: number) => (
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-3">
            <Puzzle size={14} className="text-amber-400 shrink-0" />
            <span className="text-sm text-zinc-200">{e.name ?? JSON.stringify(e)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default function ExtensionsPage() {
  return <QueryClientProvider client={qc}><Inner /></QueryClientProvider>
}
