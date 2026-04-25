import { useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { RefreshCw } from 'lucide-react'

const qc = new QueryClient()

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-0">
      <span className="text-xs text-zinc-500 w-40 shrink-0">{label}</span>
      <span className={`text-sm text-zinc-200 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

function Inner() {
  const { data: caps, refetch: refetchCaps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => fetch('/api/capabilities').then(r => r.json()),
    refetchInterval: 15_000,
  })
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => fetch('/api/health').then(r => r.json()),
    refetchInterval: 10_000,
  })
  const { data: ver } = useQuery({
    queryKey: ['version'],
    queryFn: () => fetch('/api/version').then(r => r.json()),
    refetchInterval: 30_000,
  })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Status</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Backend health and configuration</p>
        </div>
        <button onClick={() => refetchCaps()} className="text-zinc-500 hover:text-zinc-300 transition-colors">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 mb-4">
        <Row label="API health"       value={health?.status ?? 'checking...'} />
        <Row label="goose available"  value={caps?.goose_available ? 'yes' : 'no'} />
        <Row label="goose binary"     value={caps?.goose_bin || 'not found'} mono />
        <Row label="goose version"    value={ver?.raw || '—'} mono />
        <Row label="data dir"         value={caps?.data_dir || '—'} mono />
        <Row label="backend port"     value={String(caps?.backend_port ?? 10948)} mono />
        <Row label="frontend port"    value={String(caps?.frontend_port ?? 10949)} mono />
        <Row label="prefab apps"      value={caps?.prefab_apps ? 'enabled' : 'disabled'} />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4">
        <Row label="MCP endpoint"    value="http://localhost:10948/mcp" mono />
        <Row label="REST base"       value="http://localhost:10948/api" mono />
        <Row label="Webapp"          value="http://localhost:10949" mono />
      </div>
    </motion.div>
  )
}

export default function StatusPage() {
  return <QueryClientProvider client={qc}><Inner /></QueryClientProvider>
}
