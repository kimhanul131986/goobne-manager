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
  initialStore,
}: {
  children: ReactNode
  stores: StoreInfo[]
  initialStore: StoreInfo | null
}) {
  // initialStore는 레이아웃에서 이미 결정된 값 → 첫 렌더부터 null이 아님
  const [store, setStore] = useState<StoreInfo | null>(initialStore)

  useEffect(() => {
    if (!store && initialStore) setStore(initialStore)
  }, [initialStore]) // eslint-disable-line react-hooks/exhaustive-deps

  function switchStore(s: StoreInfo) {
    setStore(s)
    localStorage.setItem('goobne_store', JSON.stringify(s))
  }

  return <Ctx.Provider value={{ store, stores, switchStore }}>{children}</Ctx.Provider>
}
