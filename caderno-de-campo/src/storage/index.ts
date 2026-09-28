import type { StorageAdapter, AdapterConfig } from './types'
import { LocalStorageAdapter } from './localStorageAdapter'
import { ApiAdapter } from './apiAdapter'

let adapterInstance: StorageAdapter | null = null

export function createAdapter(config: AdapterConfig): StorageAdapter {
  switch (config.kind) {
    case 'localStorage':
      return new LocalStorageAdapter()
    case 'api':
      return new ApiAdapter(config)
    default:
      throw new Error(`Adapter desconhecido: ${(config as AdapterConfig).kind}`)
  }
}

export function getAdapter(): StorageAdapter {
  if (!adapterInstance) {
    adapterInstance = createAdapter({ kind: 'localStorage' })
  }
  return adapterInstance
}

export function setAdapter(adapter: StorageAdapter): void {
  adapterInstance = adapter
}

export async function initializeStorage(config?: AdapterConfig): Promise<StorageAdapter> {
  const adapter = config ? createAdapter(config) : getAdapter()
  await adapter.init()
  adapterInstance = adapter
  return adapter
}