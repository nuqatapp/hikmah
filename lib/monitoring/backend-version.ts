// The game backend reports its release in X-Hikmah-Backend-Version. Every
// surface records the last value it saw so error reports can be tagged with it.
// No monitoring SDK is imported here: this file is also loaded by Node tests.
type Listener=(version:string)=>void;
let current='unknown';
const listeners=new Set<Listener>();
export function noteBackendVersion(value:string|null|undefined){
  if(!value||!/^[A-Za-z0-9._-]{1,60}$/.test(value)||value===current)return;
  current=value;
  for(const listener of listeners){try{listener(value)}catch{}}
}
export function onBackendVersion(listener:Listener){listeners.add(listener);listener(current)}
export const lastBackendVersion=()=>current;
