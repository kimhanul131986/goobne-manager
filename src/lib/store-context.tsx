'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface StoreInfo {
  id: string
  name: string
  theme: 'dark' | 'red'
}

interface StoreCtx {
  store: StoreInfo | null
  stores: StoreInfo[]
  switchStore: (s: StoreInfo) => void
}

const Ctx = createContext<StoreCtx>({ store: null, stores: [], switchStore: () => {} })

export const useStore = () => useContext(Ctx)

export function StoreProvider({
  children,
  stores,
}: {
  children: ReactNode
  stores: StoreInfo[]
}) {
  const [store, setStore] = useState<StoreInfo | null>(null)

  useEffect(() => {
    if (stores.length === 0) return
    try {
      const saved = localStorage.getItem('goobne_store')
      if (saved) {
        const parsed = JSON.parse(saved)
        const found = stores.find((s) => s.id === parsed.id)
        if (found) { setStore(found); return }
      }
    } catch {}
    setStore(stores[0])
  }, [stores])

  function switchStore(s: StoreInfo) {
    setStore(s)
    localStorage.setItem('goobne_store', JSON.stringify(s))
  }

  return <Ctx.Provider value={{ store, stores, switchStore }}>{children}</Ctx.Provider>
}
