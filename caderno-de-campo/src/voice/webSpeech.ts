interface SpeechRecognitionResultItem {
  isFinal: boolean
  0: { transcript: string }
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultItem }
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface RecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

type RecognitionCtor = new () => RecognitionLike

export function webSpeechSupported(): boolean {
  const w = window as unknown as Record<string, unknown>
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

export function startWebSpeech(handlers: {
  onText: (text: string) => void
  onError: (message: string) => void
  onEnd: () => void
}): () => void {
  const w = window as unknown as Record<string, unknown>
  const Ctor = (w.SpeechRecognition || w.webkitSpeechRecognition) as RecognitionCtor
  const rec = new Ctor()
  rec.lang = 'pt-BR'
  rec.continuous = true
  rec.interimResults = false
  rec.onresult = (event) => {
    let appended = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) appended += event.results[i][0].transcript
    }
    appended = appended.trim()
    if (appended) handlers.onText(appended)
  }
  rec.onerror = (event) => {
    let msg = 'Não consegui usar o microfone.'
    if (event.error === 'not-allowed' || event.error === 'service-not-allowed')
      msg = 'Permissão de microfone negada pelo navegador.'
    else if (event.error === 'no-speech') msg = 'Nenhuma fala detectada.'
    else if (event.error === 'network')
      msg = 'Sem conexão com o serviço de reconhecimento de voz (precisa de internet).'
    handlers.onError(msg)
  }
  rec.onend = handlers.onEnd
  rec.start()
  return () => {
    try {
      rec.stop()
    } catch {}
  }
}
