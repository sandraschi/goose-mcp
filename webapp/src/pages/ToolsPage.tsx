import { motion } from 'framer-motion'
import { Wrench } from 'lucide-react'

const TOOLS = [
  { name: 'goose_version',          desc: 'Check goose binary version and availability.',      args: [] },
  { name: 'goose_session_start',    desc: 'Start a goose session with a text prompt.',         args: ['prompt', 'provider?', 'model?'] },
  { name: 'goose_session_status',   desc: 'Get status and output of a running session.',        args: ['session_id'] },
  { name: 'goose_session_list',     desc: 'List recent sessions with status summary.',          args: ['limit?'] },
  { name: 'goose_recipe_run',       desc: 'Run a goose recipe YAML file by path.',             args: ['recipe_path'] },
  { name: 'goose_providers_list',   desc: 'List configured providers from goose config.',       args: [] },
  { name: 'goose_extensions_list',  desc: 'List active extensions from goose config.',          args: [] },
  { name: 'show_sessions_card',     desc: 'Prefab UI: recent sessions card (app=True).',       args: [] },
  { name: 'show_goose_status_card', desc: 'Prefab UI: goose status summary card (app=True).',  args: [] },
]

export default function ToolsPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold">Tools</h1>
        <p className="text-sm text-zinc-500 mt-0.5">MCP tools exposed by this server</p>
      </div>

      <div className="space-y-2">
        {TOOLS.map(t => (
          <div key={t.name} className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
            <div className="flex items-start gap-3">
              <Wrench size={14} className="text-amber-400 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <code className="text-sm font-mono text-amber-300">{t.name}</code>
                  {t.args.map(a => (
                    <code key={a} className="text-xs font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {a}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-zinc-500 mt-1">{t.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
        <p className="text-xs text-zinc-500">
          MCP endpoint: <code className="font-mono text-amber-400">http://localhost:10948/mcp</code>
          &nbsp;— connect from Claude Desktop, goose, or any MCP client.
        </p>
      </div>
    </motion.div>
  )
}
