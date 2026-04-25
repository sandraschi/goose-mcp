import { useQuery } from '@tanstack/react-query'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Terminal, BookOpen, Cpu, Puzzle, CheckCircle, XCircle, Clock } from 'lucide-react'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } })

function StatCard({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${ok === false ? 'text-red-400' : ok === true ? 'text-green-400' : 'text-zinc-100'}`}>
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-600 mt-1 truncate">{sub}</div>}
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium
      ${ok ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'}`}>
      {ok ? <CheckCircle size={11} /> : <XCircle size={11} />}
      {label}
    </span>
  )
}

function Inner() {
  const { data: caps } = useQuery({
    queryKey: ['capabilities'],
    queryFn: () => fetch('/api/capabilities').then(r => r.json()),
    refetchInterval: 15_000,
  })
  const { data: ver } = useQuery({
    queryKey: ['version'],
    queryFn: () => fetch('/api/version').then(r => r.json()),
    refetchInterval: 30_000,
  })
  const { data: sessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => fetch('/api/sessions?limit=50').then(r => r.json()),
    refetchInterval: 5_000,
  })

  const sessionList = sessions?.sessions ?? []
  const running   = sessionList.filter((s: any) => s.status === 'running').length
  const completed = sessionList.filter((s: any) => s.status === 'completed').length
  const failed    = sessionList.filter((s: any) => s.status === 'failed').length
  const recent    = sessionList.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-5xl"
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">goose-mcp fleet integration</p>
      </div>

      {/* Status row */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatusPill ok={caps?.goose_available ?? false} label="goose binary" />
        <StatusPill ok={ver?.available ?? false} label={ver?.raw ?? 'checking...'} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Running" value={String(running)} ok={running > 0 ? undefined : undefined} />
        <StatCard label="Completed" value={String(completed)} ok={completed > 0 ? true : undefined} />
        <StatCard label="Failed" value={String(failed)} ok={failed > 0 ? false : undefined} />
        <StatCard label="Total Sessions" value={String(sessionList.length)} />
      </div>

      {/* Goose binary path */}
      {caps?.goose_bin && (
        <div className="mb-6 p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-zinc-400 font-mono">
          bin: {caps.goose_bin}
        </div>
      )}

      {/* Recent sessions */}
      <div>
        <h2 className="text-sm font-medium text-zinc-400 mb-3">Recent Sessions</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-600">No sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  s.status === 'running' ? 'bg-amber-400 animate-pulse' :
                  s.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span className="text-xs font-mono text-zinc-500">{s.id}</span>
                <span className="text-sm text-zinc-300 flex-1 truncate">{s.prompt}</span>
                <span className="text-xs text-zinc-600 flex items-center gap-1">
                  <Clock size={10} /> {s.started_at?.slice(11, 19)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  return (
    <QueryClientProvider client={qc}>
      <Inner />
    </QueryClientProvider>
  )
}
