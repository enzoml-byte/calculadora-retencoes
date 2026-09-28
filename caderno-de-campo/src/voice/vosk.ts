import { registerStopper, stopOthers, unregisterStopper } from './coordinator'

const VOSK_LIB_URL = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.8/dist/vosk.js'
const VOSK_MODEL_URL =
  'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-pt-0.3.tar.gz'
const VOSK_DB_NAME = 'cadernoDeCampoVoskCache'
const VOSK_DB_STORE = 'models'
const VOSK_MODEL_KEY = 'vosk-model-small-pt-0.3'

interface RecognizerLike {
  on(evt: string, cb: (message: { result?: { text?: string } }) => void): void
  acceptWaveform(buffer: AudioBuffer): void
  remove(): void
}

interface VoskModel {
  KaldiRecognizer: new () => RecognizerLike
}

declare global {
  interface Window {
    Vosk?: { createModel(url: string): Promise<VoskModel> }
  }
}

let model: VoskModel | null = null
let loadingPromise: Promise<VoskModel> | null = null

export function voskSupported(): boolean {
  const nav = navigator as unknown as { mediaDevices?: { getUserMedia?: unknown } }
  const w = window as unknown as { AudioContext?: unknown; webkitAudioContext?: unknown }
  return Boolean(
    nav.mediaDevices &&
      nav.mediaDevices.getUserMedia &&
      (w.AudioContext || w.webkitAudioContext) &&
      window.indexedDB &&
      window.fetch,
  )
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(VOSK_DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(VOSK_DB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbGetModel(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await idbOpen()
    return await new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(VOSK_DB_STORE, 'readonly')
      const req = tx.objectStore(VOSK_DB_STORE).get(key)
      req.onsuccess = () => resolve((req.result as ArrayBuffer) || null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

async function idbSetModel(key: string, value: ArrayBuffer): Promise<void> {
  try {
    const db = await idbOpen()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(VOSK_DB_STORE, 'readwrite')
      tx.objectStore(VOSK_DB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch {}
}

function loadLibrary(): Promise<NonNullable<Window['Vosk']>> {
  return new Promise((resolve, reject) => {
    if (window.Vosk) {
      resolve(window.Vosk)
      return
    }
    const s = document.createElement('script')
    s.src = VOSK_LIB_URL
    s.onload = () => {
      if (window.Vosk) resolve(window.Vosk)
      else reject(new Error('A biblioteca de transcrição não carregou corretamente.'))
    }
    s.onerror = () =>
      reject(
        new Error(
          'Não consegui carregar a biblioteca de transcrição offline. Verifique sua internet (isso só é necessário na primeira vez).',
        ),
      )
    document.head.appendChild(s)
  })
}

async function fetchModelBytes(
  url: string,
  onProgress: (received: number, total: number) => void,
): Promise<ArrayBuffer> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error('Não consegui baixar o modelo de voz (HTTP ' + resp.status + ').')
  const total = parseInt(resp.headers.get('Content-Length') || '0', 10)
  if (!resp.body || !resp.body.getReader) return resp.arrayBuffer()
  const reader = resp.body.getReader()
  const chunks: Uint8Array[] = []
  let received = 0
  for (;;) {
    const step = await reader.read()
    if (step.done) break
    chunks.push(step.value)
    received += step.value.length
    onProgress(received, total)
  }
  const all = new Uint8Array(received)
  let offset = 0
  for (const c of chunks) {
    all.set(c, offset)
    offset += c.length
  }
  return all.buffer
}

async function ensureModel(
  onProgress: (received: number, total: number) => void,
): Promise<VoskModel> {
  if (model) return model
  if (loadingPromise) return loadingPromise
  loadingPromise = (async () => {
    const Vosk = await loadLibrary()
    const cached = await idbGetModel(VOSK_MODEL_KEY)
    let buffer: ArrayBuffer
    if (cached) {
      buffer = cached
    } else {
      buffer = await fetchModelBytes(VOSK_MODEL_URL, onProgress)
      await idbSetModel(VOSK_MODEL_KEY, buffer)
    }
    const blobUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/gzip' }))
    return Vosk.createModel(blobUrl)
  })()
  try {
    model = await loadingPromise
    return model
  } finally {
    loadingPromise = null
  }
}

export interface VoskHandlers {
  onText: (text: string) => void
  onError: (message: string) => void
  onStatus: (message: string) => void
}

export async function startVosk(handlers: VoskHandlers): Promise<() => void> {
  stopOthers('vosk')
  const mbLabel = (n: number) => (n / (1024 * 1024)).toFixed(1) + ' MB'
  const mdl = await ensureModel((received, total) => {
    if (total) {
      const pct = Math.round((received / total) * 100)
      handlers.onStatus(
        `Baixando modelo de voz offline (só na 1ª vez)… ${pct}% (${mbLabel(received)})`,
      )
    } else {
      handlers.onStatus(`Baixando modelo de voz offline (só na 1ª vez)… ${mbLabel(received)}`)
    }
  })
  handlers.onStatus('Ligando o microfone…')
  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  })
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const audioCtx = new AC()
    const recognizer = new mdl.KaldiRecognizer()
    recognizer.on('result', (message) => {
      const text = ((message.result && message.result.text) || '').trim()
      if (text) handlers.onText(text)
    })
    const processor = audioCtx.createScriptProcessor(4096, 1, 1)
    processor.onaudioprocess = (event) => {
      try {
        recognizer.acceptWaveform(event.inputBuffer)
      } catch {}
    }
    const source = audioCtx.createMediaStreamSource(stream)
    const gain = audioCtx.createGain()
    gain.gain.value = 0
    source.connect(processor)
    processor.connect(gain)
    gain.connect(audioCtx.destination)

    const stop = () => {
      unregisterStopper('vosk')
      try {
        processor.disconnect()
      } catch {}
      try {
        source.disconnect()
      } catch {}
      try {
        gain.disconnect()
      } catch {}
      try {
        void audioCtx.close()
      } catch {}
      try {
        stream.getTracks().forEach((t) => t.stop())
      } catch {}
      try {
        recognizer.remove()
      } catch {}
    }
    registerStopper('vosk', stop)
    return stop
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop())
    throw err
  }
}
