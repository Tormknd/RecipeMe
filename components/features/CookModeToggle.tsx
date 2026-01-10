'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Sun, Lock } from 'lucide-react'

export function CookModeToggle() {
  const [isActive, setIsActive] = useState(false)
  const wakeLock = useRef<WakeLockSentinel | null>(null)

  const requestLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLock.current = await navigator.wakeLock.request('screen')
        setIsActive(true)
        
        wakeLock.current.addEventListener('release', () => {
          console.log('Wake Lock released')
          setIsActive(false)
        })
      } else {
        console.warn('Wake Lock API not supported')
      }
    } catch (err) {
      console.error('Wake Lock request failed:', err)
      setIsActive(false)
    }
  }

  const releaseLock = async () => {
    if (wakeLock.current) {
      await wakeLock.current.release()
      wakeLock.current = null
      setIsActive(false)
    }
  }

  const toggle = async () => {
    if (isActive) {
      await releaseLock()
    } else {
      await requestLock()
    }
  }

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isActive && !wakeLock.current) {
        await requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      releaseLock()
    }
  }, [isActive])

  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
    return null
  }

  return (
    <Button 
      variant={isActive ? "default" : "outline"} 
      size="sm" 
      onClick={toggle}
      className={`gap-2 transition-all ${isActive ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' : ''}`}
    >
      {isActive ? <Lock className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      {isActive ? 'Cook Mode ON' : 'Cook Mode'}
    </Button>
  )
}

