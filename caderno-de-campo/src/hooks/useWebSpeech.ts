import { useCallback, useEffect, useRef, useState } from 'react'
import { registerStopper, stopOthers, unregisterStopper } from '../voice/coordinator'
import { startWebSpeech, webSpeechSupported } from '../voice/webSpeech'
import { useToasts } from './useToasts'

export function useWebSpeech(onText: (text: string) => void) {
  const { push } = useToasts()
  const [recording, setRecording] = useState(false)
  const stopFnRef = useRef<(() => void) | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const finish = useCallback(() => {
    stopFnRef.current = null
    unregisterStopper('webspeech')
    setRecording(false)
  }, [])

  const toggle = useCallback(() => {
    if (stopFnRef.current) {
      const fn = stopFnRef.current
      finish()
      fn()
      return
    }
    stopOthers('webspeech')
    const baseStop = startWebSpeech({
      onText: (t) => onTextRef.current(t),
      onError: (msg) => push(msg),
      onEnd: finish,
    })
    stopFnRef.current = baseStop
    registerStopper('webspeech', baseStop)
    setRecording(true)
  }, [finish, push])

  useEffect(() => {
    return () => {
      stopFnRef.current?.()
      unregisterStopper('webspeech')
    }
  }, [])

  return { supported: webSpeechSupported(), recording, toggle }
}
