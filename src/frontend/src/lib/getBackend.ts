import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

let _backend: backendInterface | null = null;

export async function getBackend(): Promise<backendInterface> {
  if (!_backend) {
    _backend = await createActorWithConfig();
  }
  return _backend;
}
