export { DfxManager } from "./DfxManager";

interface Env {
  DFX_MANAGER: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.DFX_MANAGER.idFromName("singleton");
    const stub = env.DFX_MANAGER.get(id);
    return stub.fetch(request);
  },
};
