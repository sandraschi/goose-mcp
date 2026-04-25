import { useMutation, useQueryClient, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Play } from 'lucide-react'

const qc = new QueryClient()

function Inner() {
  const queryClient = useQueryClient()
  const [recipePath, setRecipePath] = useState('')
  const [result, setResult] = useState<any>(null)

  const run = useMutation({
    mutationFn: (body: object) =>
      fetch('/api/recipes/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json()),
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Recipes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Run goose YAML recipe files</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-3">
        <label className="text-sm text-zinc-400">Recipe path (absolute)</label>
        <input
          value={recipePath}
          onChange={e => setRecipePath(e.target.value)}
          placeholder="D:\Dev\recipes\my-task.yaml"
          className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
        />
        <button
          onClick={() => run.mutate({ recipe_path: recipePath })}
          disabled={!recipePath.trim() || run.isPending}
          className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 text-sm font-medium rounded-md transition-colors"
        >
          <Play size={14} /> {run.isPending ? 'Starting...' : 'Run Recipe'}
        </button>
      </div>

      {result && (
        <div className="mt-4 bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
          {result.error ? (
            <p className="text-sm text-red-400">{result.error}</p>
          ) : (
            <>
              <p className="text-sm text-green-400">Session started: {result.id}</p>
              <p className="text-xs text-zinc-500">Check the Sessions page for output.</p>
            </>
          )}
        </div>
      )}

      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h2 className="text-sm font-medium text-zinc-300 mb-2">About recipes</h2>
        <p className="text-sm text-zinc-500">
          Recipes are YAML files that encode a goose workflow — prompts, extensions, parameters.
          See the <a href="https://goose-docs.ai/docs/guides/recipes/session-recipes" target="_blank"
            className="text-amber-400 hover:underline">goose docs</a> for the recipe format.
        </p>
        <pre className="mt-3 text-xs bg-zinc-950 border border-zinc-800 rounded p-3 text-zinc-400 font-mono">
{`version: 1.0
title: Fleet health check
description: Scan goose-mcp data dir
steps:
  - text: List files in D:\\Dev\\repos\\goose-mcp\\data
    extensions: [developer]`}
        </pre>
      </div>
    </motion.div>
  )
}

export default function RecipesPage() {
  return <QueryClientProvider client={qc}><Inner /></QueryClientProvider>
}
