// Native Web APIs keep the game backend independent of Next.js and Sites.
export class NextRequest extends Request {
  get nextUrl() { return new URL(this.url); }
}
export const NextResponse = {json: (value: unknown, init?: ResponseInit) => Response.json(value, init)};
