import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Terminal, BookOpen, Cpu, Puzzle,
  Wrench, MessageSquare, Activity, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

import Dashboard from './pages/Dashboard'
import SessionsPage from './pages/SessionsPage'
import RecipesPage from './pages/RecipesPage'
import ProvidersPage from './pages/ProvidersPage'
import ExtensionsPage from './pages/ExtensionsPage'
import ToolsPage from './pages/ToolsPage'
import ChatPage from './pages/ChatPage'
import StatusPage from './pages/StatusPage'

const NAV = [
  { to: '/',            label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/sessions',    label: 'Sessions',    icon: Terminal },
  { to: '/recipes',     label: 'Recipes',     icon: BookOpen },
  { to: '/providers',   label: 'Providers',   icon: Cpu },
  { to: '/extensions',  label: 'Extensions',  icon: Puzzle },
  { to: '/tools',       label: 'Tools',       icon: Wrench },
  { to: '/chat',        label: 'Chat',        icon: MessageSquare },
  { to: '/status',      label: 'Status',      icon: Activity },
]

export default function App() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">

        {/* Sidebar */}
        <motion.aside
          animate={{ width: collapsed ? 56 : 220 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col bg-zinc-900 border-r border-zinc-800 shrink-0 overflow-hidden"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-3 py-4 border-b border-zinc-800">
            <span className="text-2xl">🪿</span>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="font-semibold text-amber-400 text-sm tracking-wide whitespace-nowrap"
              >
                goose-mcp
              </motion.span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 py-3 space-y-0.5 px-1.5 overflow-y-auto">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                )}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="whitespace-nowrap"
                  >
                    {label}
                  </motion.span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center justify-center py-3 border-t border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </motion.aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/"           element={<Dashboard />} />
              <Route path="/sessions"   element={<SessionsPage />} />
              <Route path="/recipes"    element={<RecipesPage />} />
              <Route path="/providers"  element={<ProvidersPage />} />
              <Route path="/extensions" element={<ExtensionsPage />} />
              <Route path="/tools"      element={<ToolsPage />} />
              <Route path="/chat"       element={<ChatPage />} />
              <Route path="/status"     element={<StatusPage />} />
            </Routes>
          </AnimatePresence>
        </main>
      </div>
    </BrowserRouter>
  )
}
