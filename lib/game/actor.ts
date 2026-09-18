import {AsyncLocalStorage} from 'node:async_hooks';
export type Actor = {id: string; name: string; signed: boolean; authUserId?: string};
export const actorContext = new AsyncLocalStorage<Actor>();
export async function identity(): Promise<Actor> {
  const actor = actorContext.getStore();
  if (!actor) throw new Error('Authenticated backend context is missing.');
  return actor;
}
