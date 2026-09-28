import { useCallback, useEffect, useRef, useState } from 'react'
import { startVosk, voskSupported } from '../voice/vosk'
import { useToasts } from './useToasts'

const STATUS_ID = 'vosk-status'

export function useVosk(onText: (text: string) => void) {
  const { push, upsert, remove } = useToasts()
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const stopRef = useRef<(() => void) | null>(null)
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const stop = useCallback(() => {
    stopRef.current?.()
    stopRef.current = null
    setRecording(false)
  }, [])

  const toggle = useCallback(() => {
    if (busy) return
    if (stopRef.current) {
      stop()
      return
    }
    setBusy(true)
    upsert(STATUS_ID, 'Preparando transcrição offline…')
    startVosk({
      onText: (t) => onTextRef.current(t),
      onError: (msg) => push(msg),
      onStatus: (msg) => upsert(STATUS_ID, msg),
    })
      .then((stopper) => {
        remove(STATUS_ID)
        stopRef.current = stopper
        setRecording(true)
      })
      .catch((err: unknown) => {
        remove(STATUS_ID)
        let msg = 'Não consegui iniciar a transcrição offline.'
        if (err instanceof Error && err.name === 'NotAllowedError')
          msg = 'Permissão de microfone negada.'
        else if (err instanceof Error && err.message) msg = err.message
        push(msg)
        stopRef.current = null
        setRecording(false)
      })
      .finally(() => setBusy(false))
  }, [busy, push, remove, stop, upsert])

  useEffect(() => {
    return () => {
      stopRef.current?.()
    }
  }, [])

  return { supported: voskSupported(), recording, busy, toggle }
}
