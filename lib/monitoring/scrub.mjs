// Shared by the browser, the Next.js server, the Netlify scheduled function and
// the Supabase Edge Function. Plain ESM so every runtime can import it unbuilt.
// Nothing here may log or keep the values it removes.

const EMAIL=/[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]+/g;
const JWT=/\b[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g;
const BEARER=/\b(Bearer|Basic|apikey)\s+[A-Za-z0-9._~+/=-]{8,}/gi;
const UUID=/\b(?:sb_|g_)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const SECRET=/\b(?:pkce_)?[A-Za-z0-9_-]*[0-9a-f]{32,}[A-Za-z0-9_-]*\b/gi;
const QUERY=/\?[^\s"'<>)]*/g;
const QUERY_IN_TEXT=/\?[^\s"'<>)]+/g;
const FRAGMENT=/#[^\s"'<>)]*/g;

/** Removes the query string and fragment from a URL or path. @param {unknown} value @returns {string} */
export function scrubUrl(value){
  if(typeof value!=='string')return '';
  return value.replace(QUERY,'').replace(FRAGMENT,'').slice(0,500);
}

/** Redacts emails, tokens, identifiers and query strings inside free text. @param {unknown} value @returns {string} */
export function scrubText(value){
  if(typeof value!=='string')return '';
  return value.slice(0,2000)
    .replace(EMAIL,'[email]')
    .replace(BEARER,'$1 [token]')
    .replace(JWT,'[token]')
    .replace(UUID,'[id]')
    .replace(SECRET,'[token]')
    .replace(QUERY_IN_TEXT,'?[query]');
}

const allowedContexts=['browser','os','runtime','trace'];
const allowedBreadcrumbs=['navigation','fetch','xhr','http'];

/** @param {any} crumb @returns {any|null} */
export function scrubBreadcrumb(crumb){
  if(!crumb||!allowedBreadcrumbs.includes(crumb.category))return null;
  const data=crumb.data||{},kept={};
  if(typeof data.method==='string')kept.method=data.method.slice(0,10);
  if(typeof data.status_code==='number')kept.status_code=data.status_code;
  for(const key of ['url','from','to'])if(typeof data[key]==='string')kept[key]=scrubUrl(data[key]);
  return {type:crumb.type,category:crumb.category,level:crumb.level,timestamp:crumb.timestamp,data:kept};
}

/**
 * Allowlist-based scrub of a Sentry event. Player nicknames cannot be pattern
 * matched, so every free-form container that could carry one (user, extra,
 * request bodies, headers, cookies, console and DOM breadcrumbs, local
 * variables) is removed instead of filtered.
 * @param {any} event @returns {any}
 */
export function scrubEvent(event){
  if(!event||typeof event!=='object')return event;
  delete event.user;
  delete event.extra;
  delete event.server_name;
  delete event.modules;
  if(event.request){
    const request={};
    if(typeof event.request.url==='string')request.url=scrubUrl(event.request.url);
    if(typeof event.request.method==='string')request.method=event.request.method.slice(0,10);
    event.request=request;
  }
  if(event.contexts){
    const contexts={};
    for(const name of allowedContexts)if(event.contexts[name])contexts[name]=event.contexts[name];
    event.contexts=contexts;
  }
  if(typeof event.message==='string')event.message=scrubText(event.message);
  if(event.logentry)event.logentry={message:scrubText(event.logentry.message)};
  if(typeof event.transaction==='string')event.transaction=scrubUrl(event.transaction);
  for(const item of event.exception?.values||[]){
    if(typeof item.value==='string')item.value=scrubText(item.value);
    if(item.mechanism?.data)delete item.mechanism.data;
    for(const frame of item.stacktrace?.frames||[]){
      delete frame.vars;
      for(const key of ['filename','abs_path'])if(typeof frame[key]==='string')frame[key]=scrubUrl(frame[key]);
    }
  }
  const crumbs=Array.isArray(event.breadcrumbs)?event.breadcrumbs:event.breadcrumbs?.values;
  if(crumbs)event.breadcrumbs=crumbs.map(scrubBreadcrumb).filter(Boolean);
  if(event.tags&&typeof event.tags==='object'&&!Array.isArray(event.tags)){
    for(const key of Object.keys(event.tags))if(typeof event.tags[key]==='string')event.tags[key]=scrubText(event.tags[key]).slice(0,200);
  }
  return event;
}
