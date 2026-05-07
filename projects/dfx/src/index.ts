export { DfxManager } from './DfxManager'

export interface Env {
  DFX_MANAGER: DurableObjectNamespace
  ALGOD_SERVER: string
  ALGOD_PORT: string
  ALGOD_TOKEN: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.DFX_MANAGER.idFromName('singleton')
    const stub = env.DFX_MANAGER.get(id)
    return stub.fetch(request)
  },
}
