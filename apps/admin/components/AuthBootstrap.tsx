'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth'

export function AuthBootstrap() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return null
}
