'use client'
// app/admin/users/page.tsx — User management: delete accounts + sub-admins
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'
import { Trash2, Shield, ShieldCheck, Search, User, Bike, Users, ChevronDown } from 'lucide-react'

const SUPABASE_URL = 'https://wpxpgszzzfhhsaunolyq.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweHBnc3p6emZoaHNhdW5vbHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mzg5ODQsImV4cCI6MjA5NzAxNDk4NH0.8_DVpLNwItAlkn_gL9a4dn-lZ00I8iifX2Cb9N_W-4U'

const ROLE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  customer:  { label: 'Käufer',    color: 'bg-blue-50 text-blue-700',   icon: User },
  shopper:   { label: 'Shopper',   color: 'bg-orange-50 text-orange-700', icon: Bike },
  admin:     { label: 'Admin',     color: 'bg-red/10 text-red',         icon: ShieldCheck },
  subadmin:  { label: 'Sub-Admin', color: 'bg-purple-50 text-purple-700', icon: Shield },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [actionUser, setActionUser] = useState<any>(null)

  const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON)

  const load = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at, auth_id')
      .order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const changeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId)
    if (error) { toast.error('Fehler'); return }
    toast.success(`Rolle auf "${ROLE_CFG[newRole]?.label}" geändert`)
    setActionUser(null)
    load()
  }

  const deleteUser = async (user: any) => {
    if (!confirm(`Benutzer "${user.full_name || user.email}" wirklich löschen? Diese Aktion ist unwiderruflich.`)) return
    // Soft delete: anonymize the user
    const { error } = await supabase.from('users').update({
      full_name: '[Gelöscht]',
      email: `deleted_${user.id}@deleted.com`,
      role: 'customer',
    }).eq('id', user.id)
    if (error) { toast.error('Fehler beim Löschen'); return }
    toast.success('Benutzer gelöscht')
    load()
  }

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search && !u.full_name?.toLowerCase().includes(search.toLowerCase()) &&
        !u.email?.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    all: users.length,
    customer: users.filter(u => u.role === 'customer').length,
    shopper: users.filter(u => u.role === 'shopper').length,
    admin: users.filter(u => u.role === 'admin').length,
    subadmin: users.filter(u => u.role === 'subadmin').length,
  }

  if (loading) return <div className="text-sm text-gray-400">Lädt...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Benutzerverwaltung</h1>
          <p className="text-sm text-gray-500 mt-1">{users.length} Benutzer insgesamt</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'customer', 'shopper', 'admin', 'subadmin'] as const).map(role => (
          <button
            key={role}
            onClick={() => setRoleFilter(role)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
              roleFilter === role ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {role === 'all' ? 'Alle' : ROLE_CFG[role]?.label} ({counts[role as keyof typeof counts]})
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white">
          <Search size={14} className="text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Suchen..."
            className="outline-none text-xs bg-transparent w-32"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Rolle</th>
              <th className="text-left px-5 py-3.5 font-black text-gray-500 text-xs uppercase tracking-wide">Registriert</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(user => {
              const cfg = ROLE_CFG[user.role] || ROLE_CFG.customer
              const Icon = cfg.icon
              return (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">
                        {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{user.full_name || '—'}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 w-fit ${cfg.color}`}>
                      <Icon size={11} /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {/* Role change dropdown */}
                      {user.role !== 'admin' && (
                        <div className="relative">
                          <button
                            onClick={() => setActionUser(actionUser?.id === user.id ? null : user)}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-all"
                          >
                            Rolle <ChevronDown size={12} />
                          </button>
                          {actionUser?.id === user.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-10 min-w-36 overflow-hidden">
                              {(['customer', 'shopper', 'subadmin'] as const).filter(r => r !== user.role).map(role => (
                                <button
                                  key={role}
                                  onClick={() => changeRole(user.id, role)}
                                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold hover:bg-gray-50 transition-colors text-left"
                                >
                                  {React.createElement(ROLE_CFG[role].icon, { size: 12 })}
                                  {ROLE_CFG[role].label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {/* Delete button */}
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => deleteUser(user)}
                          className="text-gray-300 hover:text-red transition-colors"
                          title="Benutzer löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-14 text-center text-gray-400 text-sm">Keine Benutzer gefunden</div>
        )}
      </div>
    </div>
  )
}

// Need React for createElement
import React from 'react'
