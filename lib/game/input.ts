// Space/Enter belong to native controls. Only puzzle text shortcuts are handled.
export function isPuzzleKey(key: string, kind: string, modifiers = false) {
  return !modifiers && kind !== 'mcq' &&
    (/^\p{L}$/u.test(key) || key === 'Backspace' || key === 'Delete');
}
