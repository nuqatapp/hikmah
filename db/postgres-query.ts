// Translates only application-owned queries. Values remain protocol parameters.
export function postgresQuery(source: string) {
  const ignore = /^INSERT OR IGNORE\b/i.test(source);
  let sql = source.replace(/^INSERT OR IGNORE\b/i, 'INSERT');
  let parameter = 0;
  sql = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\b[a-zA-Z_][a-zA-Z_0-9]*\b|\?/g, token => {
    if (token === '?') return '$' + (++parameter);
    if (token.toLowerCase() === 'user') return '"user"';
    return token;
  });
  if (ignore) sql += ' ON CONFLICT DO NOTHING';
  return sql;
}
