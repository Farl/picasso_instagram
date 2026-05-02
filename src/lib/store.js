/**
 * Reactive collection store.
 *
 * When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set:
 *   → Supabase (Postgres + Realtime) — multi-user, persistent.
 *
 * Otherwise:
 *   → localStorage + BroadcastChannel — single-device fallback for local dev.
 */

import { supabase, isSupabaseConfigured } from './supabase.js'

// ---- Local user identity (always localStorage, no auth server needed) ----

const USER_KEY = 'picasso_local_user'

export function getLocalUser() {
  try {
    const stored = localStorage.getItem(USER_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const user = { username: 'user_' + Math.random().toString(36).slice(2, 8) }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function setLocalUsername(username) {
  const user = { username: username.trim() }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

// ---- Collection factory ----

const registry = new Map()

function makeSupabaseCollection(name) {
  let snapshot = []
  const listeners = new Set()

  function notify() { listeners.forEach(fn => fn()) }

  // Initial fetch
  supabase
    .from(name)
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      snapshot = data || []
      notify()
    })

  // Realtime subscription
  supabase
    .channel(`${name}_realtime`)
    .on('postgres_changes', { event: '*', schema: 'public', table: name }, (payload) => {
      if (payload.eventType === 'INSERT') {
        // Avoid duplicates (optimistic insert already added it)
        if (!snapshot.find(x => x.id === payload.new.id)) {
          snapshot = [payload.new, ...snapshot]
        }
      } else if (payload.eventType === 'DELETE') {
        snapshot = snapshot.filter(x => x.id !== payload.old.id)
      } else if (payload.eventType === 'UPDATE') {
        snapshot = snapshot.map(x => x.id === payload.new.id ? payload.new : x)
      }
      notify()
    })
    .subscribe()

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getList() {
      return snapshot
    },
    async create(data) {
      const user = getLocalUser()
      const row = { ...data, username: user.username }
      // Optimistic update
      const optimistic = { id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }
      snapshot = [optimistic, ...snapshot]
      notify()

      const { data: record, error } = await supabase.from(name).insert(row).select().single()
      if (error) {
        // Roll back optimistic
        snapshot = snapshot.filter(x => x.id !== optimistic.id)
        notify()
        throw error
      }
      // Replace optimistic with real record
      snapshot = snapshot.map(x => x.id === optimistic.id ? record : x)
      notify()
      return record
    },
    async delete(id) {
      snapshot = snapshot.filter(x => x.id !== id)
      notify()
      const { error } = await supabase.from(name).delete().eq('id', id)
      if (error) throw error
    },
  }
}

function makeLocalCollection(name) {
  const KEY = `picasso_col_${name}`

  let snapshot = (() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') }
    catch { return [] }
  })()

  const listeners = new Set()

  let bc = null
  try { bc = new BroadcastChannel(KEY) } catch {}
  if (bc) {
    bc.addEventListener('message', () => {
      try { snapshot = JSON.parse(localStorage.getItem(KEY) || '[]') } catch { snapshot = [] }
      listeners.forEach(fn => fn())
    })
  }
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    try { snapshot = JSON.parse(e.newValue || '[]') } catch { snapshot = [] }
    listeners.forEach(fn => fn())
  })

  function persist() {
    localStorage.setItem(KEY, JSON.stringify(snapshot))
    bc?.postMessage('update')
    listeners.forEach(fn => fn())
  }

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getList() { return snapshot },
    async create(data) {
      const user = getLocalUser()
      const item = { id: crypto.randomUUID(), username: user.username, created_at: new Date().toISOString(), ...data }
      snapshot = [item, ...snapshot]
      persist()
      return item
    },
    async delete(id) {
      snapshot = snapshot.filter(x => x.id !== id)
      persist()
    },
  }
}

function collection(name) {
  if (registry.has(name)) return registry.get(name)
  const col = isSupabaseConfigured ? makeSupabaseCollection(name) : makeLocalCollection(name)
  registry.set(name, col)
  return col
}

export const room = { collection }

