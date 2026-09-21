var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// backend/index.ts
import { env as env2 } from "node:process";

// db/raw.ts
import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "node:process";

// db/postgres-query.ts
function postgresQuery(source) {
  const ignore = /^INSERT OR IGNORE\b/i.test(source);
  let sql = source.replace(/^INSERT OR IGNORE\b/i, "INSERT");
  let parameter = 0;
  sql = sql.replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\b[a-zA-Z_][a-zA-Z_0-9]*\b|\?/g, (token) => {
    if (token === "?") return "$" + ++parameter;
    if (token.toLowerCase() === "user") return '"user"';
    return token;
  });
  if (ignore) sql += " ON CONFLICT DO NOTHING";
  return sql;
}

// db/raw.ts
var context = new AsyncLocalStorage();
var effects = new AsyncLocalStorage();
var numeric = { to: 0, from: [20, 1700], serialize: (x) => String(x), parse: (x) => {
  const value = Number(x);
  if (!Number.isSafeInteger(value)) throw new Error("Database number is outside the supported range.");
  return value;
} };
function createConnection() {
  if (!env.SUPABASE_DB_URL) throw new Error("Database connection is not configured.");
  return postgres(env.SUPABASE_DB_URL, { prepare: false, max: 1, idle_timeout: 10, connect_timeout: 10, types: { numeric } });
}
async function withDatabase(sql, work) {
  for (let attempt = 0; ; attempt++) {
    const pending = { commit: [], rollback: [] };
    try {
      const result = await sql.begin("isolation level serializable", async (tx) => {
        await tx.unsafe("SET LOCAL ROLE hikmah_server");
        await tx.unsafe("SET LOCAL search_path = hikmah, pg_catalog");
        await tx.unsafe("SET LOCAL statement_timeout = '10s'");
        return effects.run(pending, () => context.run(tx, work));
      });
      for (const cleanup of pending.commit) {
        try {
          await cleanup();
        } catch {
          console.error("Avatar cleanup needs retry.");
        }
      }
      return result;
    } catch (error2) {
      for (const cleanup of pending.rollback) {
        try {
          await cleanup();
        } catch {
          console.error("Uncommitted avatar cleanup needs retry.");
        }
      }
      if (!["40001", "40P01"].includes(error2?.code) || attempt >= 3) throw error2;
    }
  }
}
var Statement = class _Statement {
  constructor(query, args = []) {
    this.query = query;
    this.args = args;
  }
  bind(...args) {
    return new _Statement(this.query, args);
  }
  async all() {
    const tx = context.getStore();
    if (!tx) throw new Error("A game transaction is required.");
    const rows = await tx.unsafe(postgresQuery(this.query), this.args);
    return { results: Array.from(rows), meta: { changes: rows.count } };
  }
  async first() {
    return (await this.all()).results[0] || null;
  }
  async run() {
    return this.all();
  }
};
function database() {
  return {
    prepare: (query) => new Statement(query),
    batch: async (statements) => {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      return results;
    }
  };
}
function bucket() {
  const base = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Avatar storage is unavailable.");
  const headers = { Authorization: "Bearer " + key, apikey: key };
  const url = (path) => base + "/storage/v1/object/hikmah-avatars/" + path;
  const remove = async (path) => {
    const response = await fetch(base + "/storage/v1/object/hikmah-avatars", { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: [path] }) });
    if (!response.ok && response.status !== 404) throw new Error("Avatar deletion failed.");
  };
  return {
    async get(path) {
      const response = await fetch(url(path), { headers });
      if (response.status === 404 || response.status === 400) return null;
      if (!response.ok) throw new Error("Avatar download failed.");
      return { body: response.body, httpMetadata: { contentType: response.headers.get("content-type") || "image/png" } };
    },
    async put(path, bytes, options) {
      const response = await fetch(url(path), { method: "POST", headers: { ...headers, "Content-Type": options.httpMetadata.contentType }, body: bytes });
      if (!response.ok) throw new Error("Avatar upload failed.");
      effects.getStore()?.rollback.push(() => remove(path));
    },
    async delete(path) {
      const pending = effects.getStore();
      if (pending) pending.commit.push(() => remove(path));
      else await remove(path);
    }
  };
}

// lib/game/actor.ts
import { AsyncLocalStorage as AsyncLocalStorage2 } from "node:async_hooks";
var actorContext = new AsyncLocalStorage2();
async function identity() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("Authenticated backend context is missing.");
  return actor;
}

// backend/http.ts
var NextRequest = class extends Request {
  get nextUrl() {
    return new URL(this.url);
  }
};
var NextResponse = { json: (value, init2) => Response.json(value, init2) };

// backend/game-route.ts
var game_route_exports = {};
__export(game_route_exports, {
  GET: () => GET,
  POST: () => POST,
  dynamic: () => dynamic
});

// lib/game/seed.json
var seed_default = [
  {
    id: "mcq-0",
    kind: "mcq",
    locale: "en",
    prompt: 'What does the proverb "A bird in the hand is worth two in the bush" mean?',
    choices: [
      "It is better to have something certain than risk it for more",
      "Birds are valuable",
      "You should catch birds",
      "Hunting is difficult"
    ],
    answer: "0",
    explanation: "This proverb teaches the value of certainty over speculation.",
    clues: []
  },
  {
    id: "mcq-1",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the meaning of "Actions speak louder than words"?',
    choices: [
      "What you do matters more than what you say",
      "Speaking is less important",
      "Actions are noisy",
      "Words are quiet"
    ],
    answer: "0",
    explanation: "This proverb emphasizes the importance of deeds over promises.",
    clues: []
  },
  {
    id: "mcq-2",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "The early bird catches the worm" teach us?',
    choices: [
      "Those who act quickly get advantages",
      "Birds eat worms",
      "Waking up early is healthy",
      "Worms come out early"
    ],
    answer: "0",
    explanation: "This proverb encourages promptness and initiative.",
    clues: []
  },
  {
    id: "mcq-3",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the lesson of "Do not count your chickens before they hatch"?',
    choices: [
      "Do not plan based on uncertain outcomes",
      "Chickens need counting",
      "Eggs are fragile",
      "Farming is difficult"
    ],
    answer: "0",
    explanation: "This warns against premature assumptions.",
    clues: []
  },
  {
    id: "mcq-4",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "When in Rome, do as the Romans do" suggest?',
    choices: [
      "Adapt to local customs",
      "Rome is beautiful",
      "Romans are wise",
      "Travel is educational"
    ],
    answer: "0",
    explanation: "This proverb advises adapting to local practices.",
    clues: []
  },
  {
    id: "mcq-5",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the meaning of "A journey of a thousand miles begins with a single step"?',
    choices: [
      "Great achievements start with small actions",
      "Walking is good exercise",
      "Long journeys are tiring",
      "Steps should be counted"
    ],
    answer: "0",
    explanation: "This encourages taking initiative despite daunting tasks.",
    clues: []
  },
  {
    id: "mcq-6",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "The pen is mightier than the sword" mean?',
    choices: [
      "Writing and ideas are more powerful than violence",
      "Pens are weapons",
      "Swords are outdated",
      "Writers are warriors"
    ],
    answer: "0",
    explanation: "This emphasizes the power of communication over force.",
    clues: []
  },
  {
    id: "mcq-7",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the lesson of "Honesty is the best policy"?',
    choices: [
      "Being truthful is the wisest approach",
      "Policies must be honest",
      "Honesty is a rule",
      "Lying is a policy"
    ],
    answer: "0",
    explanation: "This proverb advocates for truthfulness in all dealings.",
    clues: []
  },
  {
    id: "mcq-8",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "Time heals all wounds" suggest?',
    choices: [
      "Emotional pain lessens over time",
      "Time is a doctor",
      "Wounds need time",
      "Healing takes patience"
    ],
    answer: "0",
    explanation: "This offers comfort that pain will diminish with time.",
    clues: []
  },
  {
    id: "mcq-9",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the meaning of "Knowledge is power"?',
    choices: [
      "Education and learning give you advantages",
      "Power comes from books",
      "Knowledge is physical",
      "Powerful people are smart"
    ],
    answer: "0",
    explanation: "This emphasizes the value of education and learning.",
    clues: []
  },
  {
    id: "mcq-10",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "Practice makes perfect" teach?',
    choices: [
      "Repeated effort leads to mastery",
      "Perfection is possible",
      "Practice is easy",
      "Perfect things need no practice"
    ],
    answer: "0",
    explanation: "This encourages persistent effort for improvement.",
    clues: []
  },
  {
    id: "mcq-11",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the lesson of "Where there is a will, there is a way"?',
    choices: [
      "Determination helps overcome obstacles",
      "Wills are legal documents",
      "Ways are paths",
      "Obstacles are permanent"
    ],
    answer: "0",
    explanation: "This emphasizes the power of determination.",
    clues: []
  },
  {
    id: "mcq-12",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "Two heads are better than one" suggest?',
    choices: [
      "Collaboration improves problem-solving",
      "People need two heads",
      "One head is insufficient",
      "Heads should be counted"
    ],
    answer: "0",
    explanation: "This proverb values teamwork and collaboration.",
    clues: []
  },
  {
    id: "mcq-13",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the meaning of "Better late than never"?',
    choices: [
      "Doing something delayed is better than not at all",
      "Lateness is acceptable",
      "Never is worse",
      "Time is flexible"
    ],
    answer: "0",
    explanation: "This encourages completing tasks even if delayed.",
    clues: []
  },
  {
    id: "mcq-14",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "Every cloud has a silver lining" mean?',
    choices: [
      "There is something positive in every difficulty",
      "Clouds are silver",
      "Weather affects mood",
      "Silver is valuable"
    ],
    answer: "0",
    explanation: "This offers optimism during difficult times.",
    clues: []
  },
  {
    id: "mcq-15",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the lesson of "You reap what you sow"?',
    choices: [
      "Your actions have consequences",
      "Farming requires planning",
      "Seeds grow into plants",
      "Reaping is harvesting"
    ],
    answer: "0",
    explanation: "This teaches that our actions determine our outcomes.",
    clues: []
  },
  {
    id: "mcq-16",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "Patience is a virtue" teach us?',
    choices: [
      "Being patient is a valuable quality",
      "Virtues are patient",
      "Waiting is good",
      "Time moves slowly"
    ],
    answer: "0",
    explanation: "This proverb values the ability to wait calmly.",
    clues: []
  },
  {
    id: "mcq-17",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the meaning of "Look before you leap"?',
    choices: [
      "Think carefully before acting",
      "Leaping requires looking",
      "Eyes help jumping",
      "Actions need vision"
    ],
    answer: "0",
    explanation: "This advises caution and forethought before action.",
    clues: []
  },
  {
    id: "mcq-18",
    kind: "mcq",
    locale: "en",
    prompt: 'What does "Fortune favors the bold" suggest?',
    choices: [
      "Taking risks can lead to success",
      "Bold people are lucky",
      "Fortune is random",
      "Timidity is safe"
    ],
    answer: "0",
    explanation: "This encourages courage and taking calculated risks.",
    clues: []
  },
  {
    id: "mcq-19",
    kind: "mcq",
    locale: "en",
    prompt: 'What is the lesson of "Do not judge a book by its cover"?',
    choices: [
      "Appearances can be deceiving",
      "Books need covers",
      "Covers are important",
      "Judging is necessary"
    ],
    answer: "0",
    explanation: "This teaches us not to make assumptions based on appearances.",
    clues: []
  },
  {
    id: "mcq-20",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 \u0627\u0644\u0645\u062B\u0644 "\u0627\u0644\u0639\u0644\u0645 \u0646\u0648\u0631"\u061F',
    choices: [
      "\u0627\u0644\u0645\u0639\u0631\u0641\u0629 \u062A\u0636\u064A\u0621 \u0627\u0644\u0637\u0631\u064A\u0642 \u0648\u062A\u0631\u0634\u062F \u0627\u0644\u0625\u0646\u0633\u0627\u0646",
      "\u0627\u0644\u0646\u0648\u0631 \u064A\u0623\u062A\u064A \u0645\u0646 \u0627\u0644\u0643\u062A\u0628",
      "\u0627\u0644\u0639\u0644\u0645\u0627\u0621 \u064A\u062D\u0645\u0644\u0648\u0646 \u0645\u0635\u0627\u0628\u064A\u062D",
      "\u0627\u0644\u0642\u0631\u0627\u0621\u0629 \u062A\u062D\u0633\u0646 \u0627\u0644\u0628\u0635\u0631"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0624\u0643\u062F \u0639\u0644\u0649 \u0623\u0647\u0645\u064A\u0629 \u0627\u0644\u0639\u0644\u0645 \u0641\u064A \u062D\u064A\u0627\u0629 \u0627\u0644\u0625\u0646\u0633\u0627\u0646.",
    clues: []
  },
  {
    id: "mcq-21",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062F\u0631\u0633 \u0627\u0644\u0645\u0633\u062A\u0641\u0627\u062F \u0645\u0646 "\u0645\u0646 \u062C\u062F \u0648\u062C\u062F"\u061F',
    choices: [
      "\u0627\u0644\u0627\u062C\u062A\u0647\u0627\u062F \u064A\u0624\u062F\u064A \u0625\u0644\u0649 \u0627\u0644\u0646\u062C\u0627\u062D",
      "\u0627\u0644\u062C\u062F \u0634\u062E\u0635 \u0645\u0647\u0645",
      "\u0627\u0644\u0648\u062C\u0648\u062F \u064A\u062A\u0637\u0644\u0628 \u062C\u0647\u062F\u0627\u064B",
      "\u0627\u0644\u062C\u0647\u062F \u0633\u0647\u0644"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u062C\u0627\u062F \u0648\u0627\u0644\u0645\u062B\u0627\u0628\u0631\u0629.",
    clues: []
  },
  {
    id: "mcq-22",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0627\u0644\u0635\u0628\u0631 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0641\u0631\u062C"\u061F',
    choices: [
      "\u0627\u0644\u062A\u062D\u0644\u064A \u0628\u0627\u0644\u0635\u0628\u0631 \u064A\u0624\u062F\u064A \u0625\u0644\u0649 \u062D\u0644 \u0627\u0644\u0645\u0634\u0627\u0643\u0644",
      "\u0627\u0644\u0645\u0641\u0627\u062A\u064A\u062D \u062A\u0641\u062A\u062D \u0627\u0644\u0623\u0628\u0648\u0627\u0628",
      "\u0627\u0644\u0641\u0631\u062C \u064A\u062D\u062A\u0627\u062C \u0645\u0641\u062A\u0627\u062D\u0627\u064B",
      "\u0627\u0644\u0635\u0628\u0631 \u0635\u0639\u0628"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0634\u062C\u0639 \u0639\u0644\u0649 \u0627\u0644\u0635\u0628\u0631 \u0639\u0646\u062F \u0627\u0644\u0634\u062F\u0627\u0626\u062F.",
    clues: []
  },
  {
    id: "mcq-23",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062D\u0643\u0645\u0629 \u0645\u0646 "\u0641\u064A \u0627\u0644\u062A\u0623\u0646\u064A \u0627\u0644\u0633\u0644\u0627\u0645\u0629"\u061F',
    choices: [
      "\u0627\u0644\u062A\u0645\u0647\u0644 \u064A\u062C\u0646\u0628\u0643 \u0627\u0644\u0623\u062E\u0637\u0627\u0621",
      "\u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u062A\u062D\u062A\u0627\u062C \u0648\u0642\u062A\u0627\u064B",
      "\u0627\u0644\u0639\u062C\u0644\u0629 \u062C\u064A\u062F\u0629",
      "\u0627\u0644\u062A\u0623\u0646\u064A \u0628\u0637\u064A\u0621"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0646\u0635\u062D \u0628\u0627\u0644\u062A\u0631\u0648\u064A \u0642\u0628\u0644 \u0627\u062A\u062E\u0627\u0630 \u0627\u0644\u0642\u0631\u0627\u0631\u0627\u062A.",
    clues: []
  },
  {
    id: "mcq-24",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0627\u0644\u064A\u062F \u0627\u0644\u0648\u0627\u062D\u062F\u0629 \u0644\u0627 \u062A\u0635\u0641\u0642"\u061F',
    choices: [
      "\u0627\u0644\u062A\u0639\u0627\u0648\u0646 \u0636\u0631\u0648\u0631\u064A \u0644\u0644\u0646\u062C\u0627\u062D",
      "\u0627\u0644\u062A\u0635\u0641\u064A\u0642 \u064A\u062D\u062A\u0627\u062C \u064A\u062F\u064A\u0646",
      "\u0627\u0644\u064A\u062F \u0627\u0644\u0648\u0627\u062D\u062F\u0629 \u0636\u0639\u064A\u0641\u0629",
      "\u0627\u0644\u0623\u0635\u0648\u0627\u062A \u062A\u062D\u062A\u0627\u062C \u0623\u064A\u0627\u062F\u064A"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0624\u0643\u062F \u0639\u0644\u0649 \u0623\u0647\u0645\u064A\u0629 \u0627\u0644\u0639\u0645\u0644 \u0627\u0644\u062C\u0645\u0627\u0639\u064A.",
    clues: []
  },
  {
    id: "mcq-25",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062F\u0631\u0633 \u0645\u0646 "\u062F\u0631\u0647\u0645 \u0648\u0642\u0627\u064A\u0629 \u062E\u064A\u0631 \u0645\u0646 \u0642\u0646\u0637\u0627\u0631 \u0639\u0644\u0627\u062C"\u061F',
    choices: [
      "\u0627\u0644\u0648\u0642\u0627\u064A\u0629 \u0623\u0641\u0636\u0644 \u0645\u0646 \u0627\u0644\u0639\u0644\u0627\u062C",
      "\u0627\u0644\u062F\u0631\u0627\u0647\u0645 \u0645\u0647\u0645\u0629",
      "\u0627\u0644\u0639\u0644\u0627\u062C \u0645\u0643\u0644\u0641",
      "\u0627\u0644\u0642\u0646\u0627\u0637\u064A\u0631 \u062B\u0642\u064A\u0644\u0629"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0627\u0644\u062D\u0630\u0631 \u0648\u0627\u0644\u0627\u062D\u062A\u064A\u0627\u0637.",
    clues: []
  },
  {
    id: "mcq-26",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0627\u0644\u0635\u062F\u064A\u0642 \u0648\u0642\u062A \u0627\u0644\u0636\u064A\u0642"\u061F',
    choices: [
      "\u0627\u0644\u0635\u062F\u064A\u0642 \u0627\u0644\u062D\u0642\u064A\u0642\u064A \u064A\u0638\u0647\u0631 \u0639\u0646\u062F \u0627\u0644\u062D\u0627\u062C\u0629",
      "\u0627\u0644\u0636\u064A\u0642 \u064A\u062D\u062A\u0627\u062C \u0623\u0635\u062F\u0642\u0627\u0621",
      "\u0627\u0644\u0623\u0648\u0642\u0627\u062A \u0635\u0639\u0628\u0629",
      "\u0627\u0644\u0635\u062F\u0627\u0642\u0629 \u0633\u0647\u0644\u0629"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0628\u064A\u0646 \u0642\u064A\u0645\u0629 \u0627\u0644\u0635\u062F\u0627\u0642\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629.",
    clues: []
  },
  {
    id: "mcq-27",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062D\u0643\u0645\u0629 \u0645\u0646 "\u0642\u0644 \u062E\u064A\u0631\u0627\u064B \u0623\u0648 \u0627\u0635\u0645\u062A"\u061F',
    choices: [
      "\u0625\u0630\u0627 \u0644\u0645 \u064A\u0643\u0646 \u0643\u0644\u0627\u0645\u0643 \u0645\u0641\u064A\u062F\u0627\u064B \u0641\u0627\u0644\u0635\u0645\u062A \u0623\u0641\u0636\u0644",
      "\u0627\u0644\u0635\u0645\u062A \u0630\u0647\u0628",
      "\u0627\u0644\u0643\u0644\u0627\u0645 \u0635\u0639\u0628",
      "\u0627\u0644\u062E\u064A\u0631 \u0641\u064A \u0627\u0644\u0643\u0644\u0627\u0645"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0646\u0635\u062D \u0628\u0627\u0644\u062A\u0641\u0643\u064A\u0631 \u0642\u0628\u0644 \u0627\u0644\u0643\u0644\u0627\u0645.",
    clues: []
  },
  {
    id: "mcq-28",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0645\u0646 \u0637\u0644\u0628 \u0627\u0644\u0639\u0644\u0627 \u0633\u0647\u0631 \u0627\u0644\u0644\u064A\u0627\u0644\u064A"\u061F',
    choices: [
      "\u062A\u062D\u0642\u064A\u0642 \u0627\u0644\u0623\u0647\u062F\u0627\u0641 \u064A\u062A\u0637\u0644\u0628 \u062C\u0647\u062F\u0627\u064B \u0648\u062A\u0636\u062D\u064A\u0629",
      "\u0627\u0644\u0644\u064A\u0644 \u0644\u0644\u0646\u0648\u0645 \u0641\u0642\u0637",
      "\u0627\u0644\u0639\u0644\u0627 \u0628\u0639\u064A\u062F",
      "\u0627\u0644\u0633\u0647\u0631 \u0635\u062D\u064A"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0627\u0644\u0627\u062C\u062A\u0647\u0627\u062F \u0644\u062A\u062D\u0642\u064A\u0642 \u0627\u0644\u0637\u0645\u0648\u062D\u0627\u062A.",
    clues: []
  },
  {
    id: "mcq-29",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062F\u0631\u0633 \u0645\u0646 "\u0644\u0627 \u062A\u0624\u062C\u0644 \u0639\u0645\u0644 \u0627\u0644\u064A\u0648\u0645 \u0625\u0644\u0649 \u0627\u0644\u063A\u062F"\u061F',
    choices: [
      "\u0625\u0646\u062C\u0627\u0632 \u0627\u0644\u0645\u0647\u0627\u0645 \u0641\u0648\u0631\u0627\u064B \u0623\u0641\u0636\u0644 \u0645\u0646 \u062A\u0623\u062E\u064A\u0631\u0647\u0627",
      "\u0627\u0644\u063A\u062F \u063A\u064A\u0631 \u0645\u0636\u0645\u0648\u0646",
      "\u0627\u0644\u064A\u0648\u0645 \u0645\u0632\u062F\u062D\u0645",
      "\u0627\u0644\u062A\u0623\u062C\u064A\u0644 \u0645\u0631\u064A\u062D"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0639\u062F\u0645 \u0627\u0644\u0645\u0645\u0627\u0637\u0644\u0629.",
    clues: []
  },
  {
    id: "mcq-30",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0631\u0628 \u0623\u062E \u0644\u0643 \u0644\u0645 \u062A\u0644\u062F\u0647 \u0623\u0645\u0643"\u061F',
    choices: [
      "\u0627\u0644\u0635\u062F\u0627\u0642\u0629 \u0627\u0644\u062D\u0642\u064A\u0642\u064A\u0629 \u062A\u0639\u0627\u062F\u0644 \u0627\u0644\u0623\u062E\u0648\u0629",
      "\u0627\u0644\u0623\u062E\u0648\u0629 \u0645\u0646 \u0627\u0644\u0623\u0645 \u0641\u0642\u0637",
      "\u0627\u0644\u0623\u0635\u062F\u0642\u0627\u0621 \u0643\u062B\u064A\u0631\u0648\u0646",
      "\u0627\u0644\u0648\u0644\u0627\u062F\u0629 \u062A\u062D\u062F\u062F \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062A"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0631\u0641\u0639 \u0645\u0646 \u0642\u064A\u0645\u0629 \u0627\u0644\u0635\u062F\u0627\u0642\u0629.",
    clues: []
  },
  {
    id: "mcq-31",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062D\u0643\u0645\u0629 \u0645\u0646 "\u0625\u0630\u0627 \u0647\u0628\u062A \u0631\u064A\u0627\u062D\u0643 \u0641\u0627\u063A\u062A\u0646\u0645\u0647\u0627"\u061F',
    choices: [
      "\u0627\u063A\u062A\u0646\u0645 \u0627\u0644\u0641\u0631\u0635 \u0639\u0646\u062F\u0645\u0627 \u062A\u0623\u062A\u064A",
      "\u0627\u0644\u0631\u064A\u0627\u062D \u0642\u0648\u064A\u0629",
      "\u0627\u0644\u0641\u0631\u0635 \u0646\u0627\u062F\u0631\u0629",
      "\u0627\u0644\u0627\u063A\u062A\u0646\u0627\u0645 \u0635\u0639\u0628"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0627\u0633\u062A\u063A\u0644\u0627\u0644 \u0627\u0644\u0641\u0631\u0635.",
    clues: []
  },
  {
    id: "mcq-32",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0627\u0644\u0639\u0642\u0644 \u0627\u0644\u0633\u0644\u064A\u0645 \u0641\u064A \u0627\u0644\u062C\u0633\u0645 \u0627\u0644\u0633\u0644\u064A\u0645"\u061F',
    choices: [
      "\u0635\u062D\u0629 \u0627\u0644\u062C\u0633\u062F \u062A\u0631\u062A\u0628\u0637 \u0628\u0635\u062D\u0629 \u0627\u0644\u0639\u0642\u0644",
      "\u0627\u0644\u0639\u0642\u0644 \u064A\u062D\u062A\u0627\u062C \u062C\u0633\u0645\u0627\u064B",
      "\u0627\u0644\u062C\u0633\u0645 \u064A\u062D\u062A\u0627\u062C \u0639\u0642\u0644\u0627\u064B",
      "\u0627\u0644\u0633\u0644\u0627\u0645\u0629 \u0645\u0647\u0645\u0629"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0624\u0643\u062F \u0639\u0644\u0649 \u0627\u0644\u062A\u0631\u0627\u0628\u0637 \u0628\u064A\u0646 \u0627\u0644\u0635\u062D\u0629 \u0627\u0644\u062C\u0633\u062F\u064A\u0629 \u0648\u0627\u0644\u0639\u0642\u0644\u064A\u0629.",
    clues: []
  },
  {
    id: "mcq-33",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062F\u0631\u0633 \u0645\u0646 "\u062E\u064A\u0631 \u0627\u0644\u0643\u0644\u0627\u0645 \u0645\u0627 \u0642\u0644 \u0648\u062F\u0644"\u061F',
    choices: [
      "\u0627\u0644\u0625\u064A\u062C\u0627\u0632 \u0641\u064A \u0627\u0644\u0643\u0644\u0627\u0645 \u0645\u0639 \u0627\u0644\u0648\u0636\u0648\u062D \u0623\u0641\u0636\u0644",
      "\u0627\u0644\u0643\u0644\u0627\u0645 \u0627\u0644\u0643\u062B\u064A\u0631 \u062C\u064A\u062F",
      "\u0627\u0644\u062F\u0644\u0627\u0644\u0629 \u062A\u062D\u062A\u0627\u062C \u0643\u0644\u0627\u0645\u0627\u064B",
      "\u0627\u0644\u0642\u0644\u0629 \u0636\u0639\u0641"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0627\u0644\u0627\u062E\u062A\u0635\u0627\u0631 \u0648\u0627\u0644\u0648\u0636\u0648\u062D.",
    clues: []
  },
  {
    id: "mcq-34",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0627\u0644\u062D\u0627\u062C\u0629 \u0623\u0645 \u0627\u0644\u0627\u062E\u062A\u0631\u0627\u0639"\u061F',
    choices: [
      "\u0627\u0644\u0636\u0631\u0648\u0631\u0629 \u062A\u062F\u0641\u0639 \u0627\u0644\u0625\u0646\u0633\u0627\u0646 \u0644\u0644\u0625\u0628\u062F\u0627\u0639",
      "\u0627\u0644\u0623\u0645\u0647\u0627\u062A \u062A\u062E\u062A\u0631\u0639",
      "\u0627\u0644\u0627\u062E\u062A\u0631\u0627\u0639\u0627\u062A \u0636\u0631\u0648\u0631\u064A\u0629",
      "\u0627\u0644\u062D\u0627\u062C\u0627\u062A \u0643\u062B\u064A\u0631\u0629"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0628\u064A\u0646 \u0643\u064A\u0641 \u0623\u0646 \u0627\u0644\u062D\u0627\u062C\u0629 \u062A\u0648\u0644\u062F \u0627\u0644\u062D\u0644\u0648\u0644.",
    clues: []
  },
  {
    id: "mcq-35",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062D\u0643\u0645\u0629 \u0645\u0646 "\u0645\u0646 \u0634\u0628 \u0639\u0644\u0649 \u0634\u064A\u0621 \u0634\u0627\u0628 \u0639\u0644\u064A\u0647"\u061F',
    choices: [
      "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0633\u0628\u0629 \u0641\u064A \u0627\u0644\u0635\u063A\u0631 \u062A\u0633\u062A\u0645\u0631",
      "\u0627\u0644\u0634\u064A\u0628 \u064A\u0623\u062A\u064A \u0645\u0628\u0643\u0631\u0627\u064B",
      "\u0627\u0644\u0634\u0628\u0627\u0628 \u0633\u0631\u064A\u0639",
      "\u0627\u0644\u0639\u0627\u062F\u0627\u062A \u0633\u0647\u0644\u0629"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0624\u0643\u062F \u0639\u0644\u0649 \u0623\u0647\u0645\u064A\u0629 \u0627\u0644\u062A\u0631\u0628\u064A\u0629 \u0627\u0644\u0645\u0628\u0643\u0631\u0629.",
    clues: []
  },
  {
    id: "mcq-36",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0645\u0627 \u062D\u0643 \u062C\u0644\u062F\u0643 \u0645\u062B\u0644 \u0638\u0641\u0631\u0643"\u061F',
    choices: [
      "\u0623\u0646\u062A \u0623\u0642\u062F\u0631 \u0639\u0644\u0649 \u062D\u0644 \u0645\u0634\u0627\u0643\u0644\u0643 \u0628\u0646\u0641\u0633\u0643",
      "\u0627\u0644\u062C\u0644\u062F \u064A\u062D\u062A\u0627\u062C \u0639\u0646\u0627\u064A\u0629",
      "\u0627\u0644\u0623\u0638\u0627\u0641\u0631 \u0645\u0641\u064A\u062F\u0629",
      "\u0627\u0644\u062D\u0643\u0629 \u0645\u0632\u0639\u062C\u0629"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u0627\u0644\u0627\u0639\u062A\u0645\u0627\u062F \u0639\u0644\u0649 \u0627\u0644\u0646\u0641\u0633.",
    clues: []
  },
  {
    id: "mcq-37",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062F\u0631\u0633 \u0645\u0646 "\u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u064A\u0639\u0644\u0645 \u0627\u0644\u0634\u0637\u0627\u0631"\u061F',
    choices: [
      "\u0627\u0644\u0645\u0645\u0627\u0631\u0633\u0629 \u0627\u0644\u0645\u062A\u0643\u0631\u0631\u0629 \u062A\u0624\u062F\u064A \u0644\u0644\u0625\u062A\u0642\u0627\u0646",
      "\u0627\u0644\u0634\u0637\u0627\u0631 \u0623\u0630\u0643\u064A\u0627\u0621",
      "\u0627\u0644\u062A\u0643\u0631\u0627\u0631 \u0645\u0645\u0644",
      "\u0627\u0644\u062A\u0639\u0644\u0645 \u0633\u0647\u0644"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u0624\u0643\u062F \u0639\u0644\u0649 \u0623\u0647\u0645\u064A\u0629 \u0627\u0644\u062A\u062F\u0631\u064A\u0628 \u0648\u0627\u0644\u0645\u0645\u0627\u0631\u0633\u0629.",
    clues: []
  },
  {
    id: "mcq-38",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0645\u0639\u0646\u0649 "\u0627\u062A\u0642 \u0634\u0631 \u0645\u0646 \u0623\u062D\u0633\u0646\u062A \u0625\u0644\u064A\u0647"\u061F',
    choices: [
      "\u0627\u062D\u0630\u0631 \u0645\u0645\u0646 \u062A\u0641\u0636\u0644\u062A \u0639\u0644\u064A\u0647 \u0641\u0642\u062F \u064A\u0633\u064A\u0621 \u0625\u0644\u064A\u0643",
      "\u0627\u0644\u0625\u062D\u0633\u0627\u0646 \u062E\u0637\u064A\u0631",
      "\u0627\u0644\u0634\u0631 \u0645\u0648\u062C\u0648\u062F",
      "\u0627\u0644\u062D\u0630\u0631 \u0648\u0627\u062C\u0628"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u0630\u0631 \u0645\u0646 \u062C\u062D\u0648\u062F \u0628\u0639\u0636 \u0627\u0644\u0646\u0627\u0633.",
    clues: []
  },
  {
    id: "mcq-39",
    kind: "mcq",
    locale: "ar",
    prompt: '\u0645\u0627 \u0627\u0644\u062D\u0643\u0645\u0629 \u0645\u0646 "\u0627\u0644\u0648\u0642\u062A \u0643\u0627\u0644\u0633\u064A\u0641 \u0625\u0646 \u0644\u0645 \u062A\u0642\u0637\u0639\u0647 \u0642\u0637\u0639\u0643"\u061F',
    choices: [
      "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0648\u0642\u062A \u0636\u0631\u0648\u0631\u064A\u0629 \u0648\u0625\u0644\u0627 \u0636\u0627\u0639",
      "\u0627\u0644\u0633\u064A\u0648\u0641 \u062D\u0627\u062F\u0629",
      "\u0627\u0644\u0648\u0642\u062A \u0633\u0631\u064A\u0639",
      "\u0627\u0644\u0642\u0637\u0639 \u0635\u0639\u0628"
    ],
    answer: "0",
    explanation: "\u0647\u0630\u0627 \u0627\u0644\u0645\u062B\u0644 \u064A\u062D\u062B \u0639\u0644\u0649 \u062D\u0633\u0646 \u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0648\u0642\u062A.",
    clues: []
  },
  {
    id: "letters-0",
    kind: "letters",
    locale: "en",
    prompt: "A journey of a thousand miles begins with a single step.",
    answer: "single",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-1",
    kind: "letters",
    locale: "en",
    prompt: "Better late than never.",
    answer: "never",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-2",
    kind: "letters",
    locale: "en",
    prompt: "Actions speak louder than words.",
    answer: "Actions",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-3",
    kind: "letters",
    locale: "en",
    prompt: "Every cloud has a silver lining.",
    answer: "silver",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-4",
    kind: "letters",
    locale: "en",
    prompt: "Don't count your chickens before they hatch.",
    answer: "chickens",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-5",
    kind: "letters",
    locale: "en",
    prompt: "Practice makes perfect.",
    answer: "perfect",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-6",
    kind: "letters",
    locale: "ar",
    prompt: "\u0627\u0644\u0635\u0628\u0631 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0641\u0631\u062C",
    answer: "\u0627\u0644\u0641\u0631\u062C",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-7",
    kind: "letters",
    locale: "ar",
    prompt: "\u064A\u062F \u0648\u0627\u062D\u062F\u0629 \u0644\u0627 \u062A\u0635\u0641\u0642",
    answer: "\u062A\u0635\u0641\u0642",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-8",
    kind: "letters",
    locale: "ar",
    prompt: "\u0645\u0646 \u062C\u062F \u0648\u062C\u062F \u0648\u0645\u0646 \u0632\u0631\u0639 \u062D\u0635\u062F",
    answer: "\u062D\u0635\u062F",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-9",
    kind: "letters",
    locale: "ar",
    prompt: "\u0627\u0644\u0648\u0642\u062A \u0643\u0627\u0644\u0633\u064A\u0641 \u0625\u0646 \u0644\u0645 \u062A\u0642\u0637\u0639\u0647 \u0642\u0637\u0639\u0643",
    answer: "\u0627\u0644\u0633\u064A\u0641",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-10",
    kind: "letters",
    locale: "ar",
    prompt: "\u062F\u0631\u0647\u0645 \u0648\u0642\u0627\u064A\u0629 \u062E\u064A\u0631 \u0645\u0646 \u0642\u0646\u0637\u0627\u0631 \u0639\u0644\u0627\u062C",
    answer: "\u0648\u0642\u0627\u064A\u0629",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-11",
    kind: "letters",
    locale: "ar",
    prompt: "\u0639\u0644\u0649 \u0642\u062F\u0631 \u0623\u0647\u0644 \u0627\u0644\u0639\u0632\u0645 \u062A\u0623\u062A\u064A \u0627\u0644\u0639\u0632\u0627\u0626\u0645",
    answer: "\u0627\u0644\u0639\u0632\u0645",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "cryptogram-0",
    kind: "cryptogram",
    locale: "en",
    prompt: "THINK CLEARLY AND ACT BRAVELY",
    answer: "THINK CLEARLY AND ACT BRAVELY",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "THINK",
        hint: "Use your mind"
      },
      {
        word: "CLEARLY",
        hint: "Without confusion"
      },
      {
        word: "AND",
        hint: "Connector"
      },
      {
        word: "ACT",
        hint: "Take action"
      },
      {
        word: "BRAVELY",
        hint: "With courage"
      }
    ]
  },
  {
    id: "cryptogram-1",
    kind: "cryptogram",
    locale: "en",
    prompt: "START SMALL AND DREAM BIG",
    answer: "START SMALL AND DREAM BIG",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "START",
        hint: "Begin"
      },
      {
        word: "SMALL",
        hint: "Not large"
      },
      {
        word: "AND",
        hint: "Connector"
      },
      {
        word: "DREAM",
        hint: "Imagine"
      },
      {
        word: "BIG",
        hint: "Large or ambitious"
      }
    ]
  },
  {
    id: "cryptogram-2",
    kind: "cryptogram",
    locale: "en",
    prompt: "DARE GREATLY AND SEE WHAT UNFOLDS",
    answer: "DARE GREATLY AND SEE WHAT UNFOLDS",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "DARE",
        hint: "Take a risk"
      },
      {
        word: "GREATLY",
        hint: "In a big way"
      },
      {
        word: "AND",
        hint: "Connector"
      },
      {
        word: "SEE",
        hint: "Observe"
      },
      {
        word: "WHAT",
        hint: "Question word"
      },
      {
        word: "UNFOLDS",
        hint: "Slowly reveals"
      }
    ]
  },
  {
    id: "cryptogram-3",
    kind: "cryptogram",
    locale: "en",
    prompt: "SILENCE IS GOLDEN",
    answer: "SILENCE IS GOLDEN",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "SILENCE",
        hint: "No sound"
      },
      {
        word: "IS",
        hint: "Equals"
      },
      {
        word: "GOLDEN",
        hint: "Precious metal color"
      }
    ]
  },
  {
    id: "cryptogram-4",
    kind: "cryptogram",
    locale: "en",
    prompt: "KNOWLEDGE IS POWER",
    answer: "KNOWLEDGE IS POWER",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "KNOWLEDGE",
        hint: "What you learn"
      },
      {
        word: "IS",
        hint: "Equals"
      },
      {
        word: "POWER",
        hint: "Strength or control"
      }
    ]
  },
  {
    id: "cryptogram-5",
    kind: "cryptogram",
    locale: "en",
    prompt: "PATIENCE IS A VIRTUE",
    answer: "PATIENCE IS A VIRTUE",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "PATIENCE",
        hint: "Waiting calmly"
      },
      {
        word: "IS",
        hint: "Equals"
      },
      {
        word: "A",
        hint: "Article"
      },
      {
        word: "VIRTUE",
        hint: "Good quality"
      }
    ]
  },
  {
    id: "cryptogram-6",
    kind: "cryptogram",
    locale: "en",
    prompt: "LOVE CONQUERS ALL",
    answer: "LOVE CONQUERS ALL",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "LOVE",
        hint: "Deep affection"
      },
      {
        word: "CONQUERS",
        hint: "Defeats or wins over"
      },
      {
        word: "ALL",
        hint: "Everything"
      }
    ]
  },
  {
    id: "cryptogram-7",
    kind: "cryptogram",
    locale: "en",
    prompt: "TIME HEALS ALL WOUNDS",
    answer: "TIME HEALS ALL WOUNDS",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "TIME",
        hint: "Clock measures this"
      },
      {
        word: "HEALS",
        hint: "Makes better"
      },
      {
        word: "ALL",
        hint: "Every one"
      },
      {
        word: "WOUNDS",
        hint: "Injuries"
      }
    ]
  },
  {
    id: "cryptogram-8",
    kind: "cryptogram",
    locale: "en",
    prompt: "FORTUNE FAVORS THE BOLD",
    answer: "FORTUNE FAVORS THE BOLD",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "FORTUNE",
        hint: "Luck or wealth"
      },
      {
        word: "FAVORS",
        hint: "Supports"
      },
      {
        word: "THE",
        hint: "Article"
      },
      {
        word: "BOLD",
        hint: "Courageous"
      }
    ]
  },
  {
    id: "cryptogram-9",
    kind: "cryptogram",
    locale: "en",
    prompt: "WISDOM BEGINS IN WONDER",
    answer: "WISDOM BEGINS IN WONDER",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "WISDOM",
        hint: "Deep understanding"
      },
      {
        word: "BEGINS",
        hint: "Starts"
      },
      {
        word: "IN",
        hint: "Inside"
      },
      {
        word: "WONDER",
        hint: "Amazement or curiosity"
      }
    ]
  },
  {
    id: "cryptogram-10",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0641\u0643\u0631 \u0628\u0648\u0636\u0648\u062D \u0648\u062A\u0635\u0631\u0641 \u0628\u0634\u062C\u0627\u0639\u0629",
    answer: "\u0641\u0643\u0631 \u0628\u0648\u0636\u0648\u062D \u0648\u062A\u0635\u0631\u0641 \u0628\u0634\u062C\u0627\u0639\u0629",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0641\u0643\u0631",
        hint: "\u0627\u0633\u062A\u062E\u062F\u0645 \u0639\u0642\u0644\u0643"
      },
      {
        word: "\u0628\u0648\u0636\u0648\u062D",
        hint: "\u0628\u062F\u0648\u0646 \u063A\u0645\u0648\u0636"
      },
      {
        word: "\u0648\u062A\u0635\u0631\u0641",
        hint: "\u0642\u0645 \u0628\u0627\u0644\u0641\u0639\u0644"
      },
      {
        word: "\u0628\u0634\u062C\u0627\u0639\u0629",
        hint: "\u0628\u062F\u0648\u0646 \u062E\u0648\u0641"
      }
    ]
  },
  {
    id: "cryptogram-11",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0628\u062F\u0623 \u0635\u063A\u064A\u0631\u0627 \u0648\u0627\u062D\u0644\u0645 \u0643\u0628\u064A\u0631\u0627",
    answer: "\u0627\u0628\u062F\u0623 \u0635\u063A\u064A\u0631\u0627 \u0648\u0627\u062D\u0644\u0645 \u0643\u0628\u064A\u0631\u0627",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0628\u062F\u0623",
        hint: "\u0623\u0648\u0644 \u062E\u0637\u0648\u0629"
      },
      {
        word: "\u0635\u063A\u064A\u0631\u0627",
        hint: "\u063A\u064A\u0631 \u0643\u0628\u064A\u0631"
      },
      {
        word: "\u0648\u0627\u062D\u0644\u0645",
        hint: "\u062A\u062E\u064A\u0644 \u0627\u0644\u0645\u0633\u062A\u0642\u0628\u0644"
      },
      {
        word: "\u0643\u0628\u064A\u0631\u0627",
        hint: "\u0628\u0637\u0645\u0648\u062D \u0639\u0627\u0644"
      }
    ]
  },
  {
    id: "cryptogram-12",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0633\u062A\u0645\u0639 \u0623\u0643\u062B\u0631 \u0648\u062A\u0643\u0644\u0645 \u0623\u0642\u0644",
    answer: "\u0627\u0633\u062A\u0645\u0639 \u0623\u0643\u062B\u0631 \u0648\u062A\u0643\u0644\u0645 \u0623\u0642\u0644",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0633\u062A\u0645\u0639",
        hint: "\u0627\u0646\u062A\u0628\u0647 \u0644\u0645\u0627 \u064A\u0642\u0627\u0644"
      },
      {
        word: "\u0623\u0643\u062B\u0631",
        hint: "\u0643\u0645\u064A\u0629 \u0623\u0643\u0628\u0631"
      },
      {
        word: "\u0648\u062A\u0643\u0644\u0645",
        hint: "\u0627\u0633\u062A\u062E\u062F\u0645 \u0635\u0648\u062A\u0643"
      },
      {
        word: "\u0623\u0642\u0644",
        hint: "\u0643\u0645\u064A\u0629 \u0623\u0642\u0644"
      }
    ]
  },
  {
    id: "cryptogram-13",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0644\u0639\u0644\u0645 \u0646\u0648\u0631",
    answer: "\u0627\u0644\u0639\u0644\u0645 \u0646\u0648\u0631",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0644\u0639\u0644\u0645",
        hint: "\u0627\u0644\u0645\u0639\u0631\u0641\u0629"
      },
      {
        word: "\u0646\u0648\u0631",
        hint: "\u0636\u0648\u0621"
      }
    ]
  },
  {
    id: "cryptogram-14",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0644\u0635\u0628\u0631 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0641\u0631\u062C",
    answer: "\u0627\u0644\u0635\u0628\u0631 \u0645\u0641\u062A\u0627\u062D \u0627\u0644\u0641\u0631\u062C",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0644\u0635\u0628\u0631",
        hint: "\u0627\u0644\u062A\u062D\u0645\u0644"
      },
      {
        word: "\u0645\u0641\u062A\u0627\u062D",
        hint: "\u0645\u0627 \u064A\u0641\u062A\u062D"
      },
      {
        word: "\u0627\u0644\u0641\u0631\u062C",
        hint: "\u0627\u0644\u0646\u062C\u0627\u0629"
      }
    ]
  },
  {
    id: "cryptogram-15",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0645\u0646 \u062C\u062F \u0648\u062C\u062F",
    answer: "\u0645\u0646 \u062C\u062F \u0648\u062C\u062F",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0645\u0646",
        hint: "\u0627\u0644\u0630\u064A"
      },
      {
        word: "\u062C\u062F",
        hint: "\u0627\u062C\u062A\u0647\u062F"
      },
      {
        word: "\u0648\u062C\u062F",
        hint: "\u062D\u0635\u0644"
      }
    ]
  },
  {
    id: "cryptogram-16",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0644\u0648\u0642\u062A \u0643\u0627\u0644\u0633\u064A\u0641",
    answer: "\u0627\u0644\u0648\u0642\u062A \u0643\u0627\u0644\u0633\u064A\u0641",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0644\u0648\u0642\u062A",
        hint: "\u0627\u0644\u0632\u0645\u0646"
      },
      {
        word: "\u0643\u0627\u0644\u0633\u064A\u0641",
        hint: "\u0623\u062F\u0627\u0629 \u062D\u0627\u062F\u0629"
      }
    ]
  },
  {
    id: "cryptogram-17",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u062E\u064A\u0631 \u0627\u0644\u0643\u0644\u0627\u0645 \u0645\u0627 \u0642\u0644 \u0648\u062F\u0644",
    answer: "\u062E\u064A\u0631 \u0627\u0644\u0643\u0644\u0627\u0645 \u0645\u0627 \u0642\u0644 \u0648\u062F\u0644",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u062E\u064A\u0631",
        hint: "\u0627\u0644\u0623\u0641\u0636\u0644"
      },
      {
        word: "\u0627\u0644\u0643\u0644\u0627\u0645",
        hint: "\u0627\u0644\u062D\u062F\u064A\u062B"
      },
      {
        word: "\u0645\u0627",
        hint: "\u0627\u0644\u0630\u064A"
      },
      {
        word: "\u0642\u0644",
        hint: "\u0627\u0644\u0642\u0644\u064A\u0644"
      },
      {
        word: "\u0648\u062F\u0644",
        hint: "\u0623\u0641\u0627\u062F"
      }
    ]
  },
  {
    id: "cryptogram-18",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0644\u0635\u062F\u064A\u0642 \u0648\u0642\u062A \u0627\u0644\u0636\u064A\u0642",
    answer: "\u0627\u0644\u0635\u062F\u064A\u0642 \u0648\u0642\u062A \u0627\u0644\u0636\u064A\u0642",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0644\u0635\u062F\u064A\u0642",
        hint: "\u0627\u0644\u0631\u0641\u064A\u0642"
      },
      {
        word: "\u0648\u0642\u062A",
        hint: "\u062D\u064A\u0646"
      },
      {
        word: "\u0627\u0644\u0636\u064A\u0642",
        hint: "\u0627\u0644\u0634\u062F\u0629"
      }
    ]
  },
  {
    id: "cryptogram-19",
    kind: "cryptogram",
    locale: "ar",
    prompt: "\u0627\u0644\u0633\u0643\u0648\u062A \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0631\u0636\u0627",
    answer: "\u0627\u0644\u0633\u0643\u0648\u062A \u0639\u0644\u0627\u0645\u0629 \u0627\u0644\u0631\u0636\u0627",
    choices: [],
    explanation: "",
    clues: [
      {
        word: "\u0627\u0644\u0633\u0643\u0648\u062A",
        hint: "\u0627\u0644\u0635\u0645\u062A"
      },
      {
        word: "\u0639\u0644\u0627\u0645\u0629",
        hint: "\u062F\u0644\u064A\u0644"
      },
      {
        word: "\u0627\u0644\u0631\u0636\u0627",
        hint: "\u0627\u0644\u0642\u0628\u0648\u0644"
      }
    ]
  },
  {
    id: "letters-extra-0",
    kind: "letters",
    locale: "en",
    prompt: "Knowledge is power.",
    answer: "power",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-1",
    kind: "letters",
    locale: "en",
    prompt: "Where there is a will, there is a way.",
    answer: "will",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-2",
    kind: "letters",
    locale: "en",
    prompt: "Honesty is the best policy.",
    answer: "Honesty",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-3",
    kind: "letters",
    locale: "en",
    prompt: "Look before you leap.",
    answer: "leap",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-4",
    kind: "letters",
    locale: "ar",
    prompt: "\u0627\u0644\u0639\u0644\u0645 \u0646\u0648\u0631",
    answer: "\u0646\u0648\u0631",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-5",
    kind: "letters",
    locale: "ar",
    prompt: "\u062E\u064A\u0631 \u0627\u0644\u0643\u0644\u0627\u0645 \u0645\u0627 \u0642\u0644 \u0648\u062F\u0644",
    answer: "\u0627\u0644\u0643\u0644\u0627\u0645",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-6",
    kind: "letters",
    locale: "ar",
    prompt: "\u0641\u064A \u0627\u0644\u062A\u0623\u0646\u064A \u0627\u0644\u0633\u0644\u0627\u0645\u0629",
    answer: "\u0627\u0644\u062A\u0623\u0646\u064A",
    choices: [],
    explanation: "",
    clues: []
  },
  {
    id: "letters-extra-7",
    kind: "letters",
    locale: "ar",
    prompt: "\u0645\u0646 \u0633\u0627\u0631 \u0639\u0644\u0649 \u0627\u0644\u062F\u0631\u0628 \u0648\u0635\u0644",
    answer: "\u0627\u0644\u062F\u0631\u0628",
    choices: [],
    explanation: "",
    clues: []
  }
];

// lib/game/rules.ts
var ROUND_SECONDS = { mcq: 45, letters: 90, cryptogram: 180 };
function normalize(v) {
  return v.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "\u0627").replace(/ى/g, "\u064A").toUpperCase().trim();
}
function reward(ms) {
  const s = ms / 1e3;
  return 2 + (s <= 5 ? 5 : s <= 10 ? 3 : s <= 20 ? 2 : 1);
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function snapshot(c) {
  const s = JSON.parse(JSON.stringify(c));
  if (c.kind === "mcq") {
    const order = shuffle(c.choices.map((_, i) => i));
    s.choices = order.map((i) => c.choices[i]);
    s.answer = String(order.indexOf(Number(c.answer)));
  }
  if (c.kind === "letters") s.bank = shuffle(Array.from(normalize(c.answer)));
  if (c.kind === "cryptogram") {
    const chars = Array.from(new Set(Array.from(normalize([c.prompt, ...c.clues.map((c2) => c2.word)].join(" "))).filter((c2) => /\p{L}/u.test(c2))));
    const nums = shuffle(chars.map((_, i) => i + 1));
    s.codes = Object.fromEntries(chars.map((c2, i) => [c2, nums[i]]));
  }
  return s;
}
function publicPuzzle(s) {
  const p = { id: s.id, kind: s.kind, locale: s.locale, prompt: s.prompt, choices: s.choices };
  if (s.kind === "letters") {
    const escaped = s.answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const edge = "[\\p{L}\\p{M}\\p{N}]";
    const clitic = /[\u0600-\u06FF]/.test(s.answer) ? "([\u0648\u0641]?[\u0628\u0643\u0644]?)" : "()";
    const whole = s.prompt.replace(new RegExp("(?<!" + edge + ")" + clitic + escaped + "(?!" + edge + ")", "giu"), "$1_____");
    p.prompt = whole !== s.prompt ? whole : s.prompt.replace(new RegExp(escaped, "giu"), "_____");
    p.bank = s.bank;
    p.length = Array.from(normalize(s.answer)).length;
  }
  if (s.kind === "cryptogram") {
    const tokens = (v) => Array.from(normalize(v)).map((c) => s.codes?.[c] ? { code: s.codes[c] } : { code: null, symbol: c });
    p.prompt = "";
    p.tokens = tokens(s.prompt);
    p.clues = s.clues.map((c) => ({ hint: c.hint, tokens: tokens(c.word) }));
  }
  return p;
}
function checkAnswer(s, answer) {
  if (s.kind === "mcq") return Number.isInteger(answer) && String(answer) === s.answer;
  if (s.kind === "letters") return typeof answer === "string" && normalize(answer) === normalize(s.answer);
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) return false;
  const m = answer;
  return Array.from(normalize(s.prompt)).every((c) => !s.codes?.[c] || typeof m[s.codes[c]] === "string" && normalize(m[s.codes[c]]) === c);
}
function solution(s) {
  return s.kind === "mcq" ? s.choices[Number(s.answer)] : s.answer;
}

// lib/game/service.ts
var GameError = class extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
var now = () => Date.now();
var uid = () => crypto.randomUUID();
async function one(sql, ...args) {
  return database().prepare(sql).bind(...args).first();
}
async function many(sql, ...args) {
  return (await database().prepare(sql).bind(...args).all()).results;
}
async function run(sql, ...args) {
  return database().prepare(sql).bind(...args).run();
}
async function batch(stmts) {
  return database().batch(stmts.map(([q, a]) => database().prepare(q).bind(...a)));
}
async function init() {
  if (await one("SELECT value FROM site_settings WHERE key='seed_v1'")) return;
  const c = seed_default;
  for (let i = 0; i < c.length; i += 25) await batch(c.slice(i, i + 25).map((x) => ["INSERT OR IGNORE INTO content(id,kind,locale,prompt,answer,choices,clues,explanation) VALUES(?,?,?,?,?,?,?,?)", [x.id, x.kind, x.locale, x.prompt, x.answer, JSON.stringify(x.choices), JSON.stringify(x.clues), x.explanation]]));
  await run("INSERT OR IGNORE INTO site_settings(key,value) VALUES('seed_v1','1')");
}
async function ensureProfile(u) {
  if (!u.signed) return null;
  await batch([
    ["INSERT OR IGNORE INTO profiles(id,name,created_at) VALUES(?,?,?)", [u.id, u.name, now()]],
    ["INSERT OR IGNORE INTO wallet(id,user,amount,reason,created_at) VALUES(?,?,20,'Welcome',?)", ["welcome:" + u.id, u.id, now()]]
  ]);
  if (u.authUserId) await run("UPDATE profiles SET auth_user_id=? WHERE id=? AND auth_user_id IS NULL", u.authUserId, u.id);
  return profile(u.id);
}
async function isAdmin(id) {
  const a = await one("SELECT value FROM site_settings WHERE key='admin_user'");
  return a?.value === id;
}
async function profile(id) {
  const p = await one("SELECT * FROM profiles WHERE id=?", id);
  if (!p) return null;
  return { ...p, balance: (await one("SELECT COALESCE(SUM(amount),0) AS balance FROM wallet WHERE user=?", id)).balance, isAdmin: await isAdmin(id) };
}
async function requireAccount() {
  const u = await identity();
  if (!u.signed) throw new GameError("Sign in to continue.", 401);
  const p = await ensureProfile(u);
  if (p?.banned) throw new GameError("This account is suspended.", 403);
  return u;
}
async function requireAdmin() {
  const u = await requireAccount();
  if (!await isAdmin(u.id)) throw new GameError("Administrator access required.", 403);
  return u;
}
function contentRow(r) {
  return { ...r, choices: JSON.parse(r.choices), clues: JSON.parse(r.clues) };
}
async function createRoom(kind, locale, mode, u) {
  if (!["mcq", "letters", "cryptogram"].includes(kind) || !["en", "ar"].includes(locale)) throw new GameError("Choose a game and language.");
  if (mode === "multi" && !u.signed) throw new GameError("Sign in to play with friends.", 401);
  const active = await one("SELECT r.id FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=? AND m.left_at IS NULL AND r.mode=? AND r.status IN ('waiting','active') AND r.updated_at>? ORDER BY r.created_at DESC LIMIT 1", u.id, mode, now() - 36e5);
  if (active) throw new GameError("Finish or leave your current " + mode + " game first.");
  const total = mode === "multi" ? 5 : 10;
  const rows = await many("SELECT c.* FROM content c WHERE c.active=1 AND c.kind=? AND c.locale=? ORDER BY EXISTS(SELECT 1 FROM rounds rr JOIN attempts a ON a.round=rr.id WHERE rr.content_id=c.id AND a.user=?),random() LIMIT ?", kind, locale, u.id, total);
  if (rows.length < (mode === "multi" ? 5 : 1)) throw new GameError("Not enough puzzles in this language yet.");
  const id = uid(), code = uid().replace(/-/g, "").slice(0, 8).toUpperCase(), t = now();
  const q = [["INSERT INTO rooms(id,code,kind,locale,mode,host,status,round,total,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)", [id, code, kind, locale, mode, u.id, mode === "solo" ? "active" : "waiting", mode === "solo" ? 1 : 0, rows.length, t, t]], ["INSERT INTO members(room,user,joined_at,last_seen) VALUES(?,?,?,?)", [id, u.id, t, t]]];
  rows.forEach((c, i) => q.push(["INSERT INTO rounds(id,room,number,content_id,snapshot,started_at) VALUES(?,?,?,?,?,?)", [uid(), id, i + 1, c.id, JSON.stringify(snapshot(contentRow(c))), mode === "solo" && i === 0 ? t : null]]));
  await batch(q);
  return { id, code };
}
async function joinRoom(code, u) {
  if (!u.signed) throw new GameError("Sign in to join a room.", 401);
  const r = await one("SELECT * FROM rooms WHERE (code=? OR id=?) AND mode='multi'", code.toUpperCase(), code);
  if (!r) throw new GameError("Room not found.", 404);
  const member = await one("SELECT * FROM members WHERE room=? AND user=?", r.id, u.id);
  if (member && !member.left_at) return { id: r.id };
  if (r.status !== "waiting") throw new GameError("This match has already started.");
  await run("INSERT INTO members(room,user,joined_at,last_seen,left_at) SELECT ?,?,?,?,NULL WHERE (SELECT COUNT(*) FROM members WHERE room=? AND left_at IS NULL)<8 AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND status='waiting') ON CONFLICT(room,user) DO UPDATE SET left_at=NULL,last_seen=excluded.last_seen", r.id, u.id, now(), now(), r.id, r.id);
  const added = await one("SELECT * FROM members WHERE room=? AND user=? AND left_at IS NULL", r.id, u.id);
  if (!added) throw new GameError("Room is full.");
  return { id: r.id };
}
async function memberRoom(id, user) {
  const r = await one("SELECT r.* FROM rooms r JOIN members m ON m.room=r.id WHERE r.id=? AND m.user=? AND m.left_at IS NULL", id, user);
  if (!r) throw new GameError("Join this room to continue.", 403);
  return r;
}
async function startRoom(id, user) {
  const r = await memberRoom(id, user);
  if (r.host !== user) throw new GameError("Only the host can start the match.", 403);
  if ((await one("SELECT COUNT(*) AS n FROM members WHERE room=? AND left_at IS NULL", id)).n < 2) throw new GameError("At least two players are needed.");
  const t = now() + 3e3;
  await batch([["UPDATE rooms SET status='active',round=1,updated_at=? WHERE id=? AND status='waiting'", [now(), id]], ["UPDATE rounds SET started_at=? WHERE room=? AND number=1 AND started_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND status='active')", [t, id, id]]]);
}
async function leaveRoom(id, user) {
  const r = await memberRoom(id, user);
  await run("UPDATE members SET left_at=? WHERE room=? AND user=?", now(), id, user);
  const other = await one("SELECT user FROM members WHERE room=? AND left_at IS NULL ORDER BY joined_at LIMIT 1", id);
  if (!other) await run("UPDATE rooms SET status='abandoned',updated_at=? WHERE id=? AND status!='finished'", now(), id);
  else if (r.host === user) await run("UPDATE rooms SET host=? WHERE id=?", other.user, id);
}
async function advance(id, user, manual = false) {
  let r = await memberRoom(id, user);
  const t = now();
  await run("UPDATE members SET last_seen=? WHERE room=? AND user=?", t, id, user);
  await run("UPDATE rooms SET host=? WHERE id=? AND host!=? AND EXISTS(SELECT 1 FROM members WHERE room=? AND user=rooms.host AND (last_seen<? OR left_at IS NOT NULL))", user, id, user, id, t - 45e3);
  if (r.status !== "active") return;
  let rd = await one("SELECT * FROM rounds WHERE room=? AND number=?", id, r.round);
  if (!rd?.started_at) return;
  if (r.mode === "multi" && !rd.ended_at) {
    if (t >= rd.started_at + ROUND_SECONDS[r.kind] * 1e3) await run("UPDATE rounds SET ended_at=?,outcome='timeout' WHERE id=? AND ended_at IS NULL", t, rd.id);
    else if (r.kind === "mcq") await run("UPDATE rounds SET ended_at=?,outcome='no_correct' WHERE id=? AND ended_at IS NULL AND (SELECT COUNT(*) FROM attempts WHERE round=?)>=(SELECT COUNT(*) FROM members WHERE room=? AND left_at IS NULL)", t, rd.id, rd.id, id);
    rd = await one("SELECT * FROM rounds WHERE id=?", rd.id);
  }
  if (!rd.ended_at) return;
  if (r.mode === "solo" && !manual) return;
  if (r.mode === "multi" && t < rd.ended_at + 6e3) return;
  if (r.round >= r.total) {
    await run("UPDATE rooms SET status='finished',updated_at=? WHERE id=? AND round=? AND status='active'", t, id, r.round);
    return;
  }
  await batch([["UPDATE rooms SET round=round+1,updated_at=? WHERE id=? AND round=? AND status='active'", [t, id, r.round]], ["UPDATE rounds SET started_at=? WHERE room=? AND number=? AND started_at IS NULL AND EXISTS(SELECT 1 FROM rooms WHERE id=? AND round=?)", [t + (r.mode === "multi" ? 2e3 : 0), id, r.round + 1, id, r.round + 1]]]);
}
async function roomState(id, u) {
  await advance(id, u.id);
  const r = await memberRoom(id, u.id);
  const rd = await one("SELECT * FROM rounds WHERE room=? AND number=?", id, r.round);
  const players = await many("SELECT m.user,m.last_seen,m.left_at,COALESCE(p.name,'Guest') AS name,p.avatar,(SELECT COUNT(*) FROM rounds rr WHERE rr.room=m.room AND rr.winner=m.user) AS wins FROM members m LEFT JOIN profiles p ON p.id=m.user WHERE m.room=? ORDER BY wins DESC,m.joined_at", id);
  let round = null;
  if (rd) {
    const s = JSON.parse(rd.snapshot);
    const attempt = await one("SELECT correct FROM attempts WHERE round=? AND user=?", rd.id, u.id);
    round = { id: rd.id, number: rd.number, startedAt: rd.started_at, endedAt: rd.ended_at, winner: rd.winner, outcome: rd.outcome, puzzle: publicPuzzle(s), solution: rd.ended_at ? solution(s) : null, explanation: rd.ended_at ? s.explanation : null, submitted: !!attempt && r.kind === "mcq", deadline: r.mode === "multi" ? rd.started_at + ROUND_SECONDS[r.kind] * 1e3 : null };
  }
  return { room: { id: r.id, code: r.code, kind: r.kind, locale: r.locale, mode: r.mode, status: r.status, host: r.host, total: r.total }, round, players, serverTime: now(), me: u.id, profile: u.signed ? await profile(u.id) : null, history: await many("SELECT number,winner,outcome,ended_at FROM rounds WHERE room=? AND ended_at IS NOT NULL ORDER BY number", id) };
}
async function submit(id, roundId, answer, u, skip = false) {
  await advance(id, u.id);
  const r = await memberRoom(id, u.id);
  const rd = await one("SELECT * FROM rounds WHERE room=? AND number=?", id, r.round);
  if (!rd || rd.id !== roundId || r.status !== "active") throw new GameError("The round has changed.");
  if (rd.ended_at) return { correct: rd.winner === u.id, closed: true };
  const t = now();
  if (!rd.started_at || t < rd.started_at) throw new GameError("The round has not started yet.");
  if (skip && (r.mode !== "solo" || !u.signed)) throw new GameError("Skips are available in signed-in solo play.");
  const s = JSON.parse(rd.snapshot);
  if (r.kind === "mcq" && await one("SELECT id FROM attempts WHERE round=? AND user=?", rd.id, u.id)) throw new GameError("You have already answered this round.");
  if (skip) {
    const n = uid();
    await batch([["UPDATE rounds SET ended_at=?,outcome='skipped',nonce=? WHERE id=? AND ended_at IS NULL AND (SELECT COALESCE(SUM(amount),0) FROM wallet WHERE user=?)>=5", [t, n, rd.id, u.id]], ["INSERT OR IGNORE INTO wallet(id,user,amount,reason,created_at) SELECT ?,?,-5,'Skip',? WHERE EXISTS(SELECT 1 FROM rounds WHERE id=? AND nonce=?)", ["skip:" + rd.id, u.id, t, rd.id, n]]]);
    if ((await one("SELECT nonce FROM rounds WHERE id=?", rd.id)).nonce !== n) throw new GameError("You need 5 HR to skip.");
    return { skipped: true };
  }
  const correct = checkAnswer(s, answer), elapsed = t - rd.started_at, nonce = uid();
  if (!correct && r.kind !== "mcq") return { correct: false };
  if (correct) {
    const q2 = [["UPDATE rounds SET ended_at=?,winner=?,outcome='solved',nonce=? WHERE id=? AND ended_at IS NULL AND started_at<=? AND NOT EXISTS(SELECT 1 FROM attempts WHERE round=? AND user=?)", [t, u.id, nonce, rd.id, t, rd.id, u.id]], ["INSERT OR IGNORE INTO attempts(id,round,user,correct,answer,elapsed,created_at) SELECT ?,?,?,1,?,?,? WHERE EXISTS(SELECT 1 FROM rounds WHERE id=? AND nonce=?)", [uid(), rd.id, u.id, JSON.stringify(answer), elapsed, t, rd.id, nonce]]];
    if (u.signed) q2.push(["INSERT OR IGNORE INTO wallet(id,user,amount,reason,created_at) SELECT ?,?,?,'Correct answer',? WHERE EXISTS(SELECT 1 FROM rounds WHERE id=? AND nonce=?)", ["reward:" + rd.id, u.id, reward(elapsed), t, rd.id, nonce]]);
    await batch(q2);
    const won = (await one("SELECT winner FROM rounds WHERE id=?", rd.id))?.winner === u.id;
    return { correct: won, reward: won && u.signed ? reward(elapsed) : 0 };
  }
  const q = [["INSERT OR IGNORE INTO attempts(id,round,user,correct,answer,elapsed,created_at) SELECT ?,?,?,0,?,?,? WHERE EXISTS(SELECT 1 FROM rounds WHERE id=? AND ended_at IS NULL)", [uid(), rd.id, u.id, JSON.stringify(answer), elapsed, t, rd.id]]];
  if (r.mode === "solo") q.push(["UPDATE rounds SET ended_at=?,outcome='incorrect' WHERE id=? AND ended_at IS NULL", [t, rd.id]]);
  await batch(q);
  return { correct: false };
}
async function dashboard(u) {
  await init();
  const p = await ensureProfile(u);
  return { profile: p, signedIn: u.signed, stats: u.signed ? await one("SELECT COUNT(*) AS answered,COALESCE(SUM(correct),0) AS correct FROM attempts WHERE user=?", u.id) : null, active: u.signed ? await many("SELECT r.id,r.kind,r.mode,r.code FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=? AND m.left_at IS NULL AND r.status IN ('waiting','active') ORDER BY r.created_at DESC", u.id) : [], counts: await many("SELECT kind,locale,COUNT(*) AS n FROM content WHERE active=1 GROUP BY kind,locale") };
}

// backend/game-route.ts
var dynamic = "force-dynamic";
function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function error(e) {
  if (e instanceof GameError) return json({ error: e.message }, e.status);
  throw e;
}
async function GET(req) {
  try {
    await init();
    const q = req.nextUrl.searchParams, action = q.get("action") || "dashboard";
    const u = await identity();
    if (u.signed) await requireAccount();
    if (action === "dashboard") return json(await dashboard(u));
    if (action === "room") return json(await roomState(q.get("id") || "", u));
    if (action === "lobby") {
      await requireAccount();
      return json({ rooms: await many("SELECT r.id,r.code,r.kind,r.locale,r.created_at,COALESCE(p.name,'Player') AS host_name,(SELECT COUNT(*) FROM members m WHERE m.room=r.id AND m.left_at IS NULL) AS players FROM rooms r LEFT JOIN profiles p ON p.id=r.host WHERE r.mode='multi' AND r.status='waiting' AND r.updated_at>? ORDER BY r.created_at DESC LIMIT 30", Date.now() - 36e5) });
    }
    if (action === "leaderboard") {
      const week = q.get("period") !== "all";
      return json({ rows: await many("SELECT p.id,p.name,p.avatar,COUNT(*) AS solved,SUM(CASE r.kind WHEN 'mcq' THEN 10 WHEN 'letters' THEN 15 ELSE 20 END) AS points FROM attempts a JOIN rounds rr ON rr.id=a.round JOIN rooms r ON r.id=rr.room JOIN profiles p ON p.id=a.user WHERE a.correct=1 AND a.created_at>=? GROUP BY p.id ORDER BY points DESC,solved DESC,p.name LIMIT 50", week ? Date.now() - 6048e5 : 0) });
    }
    if (action === "profile") {
      const a = await requireAccount();
      return json({ profile: await profile(a.id), stats: await one("SELECT (SELECT COUNT(*) FROM attempts WHERE user=? AND correct=1) AS solved,(SELECT COUNT(*) FROM members WHERE user=?) AS games,(SELECT COUNT(*) FROM rooms r WHERE r.mode='multi' AND r.status='finished' AND (SELECT COUNT(*) FROM rounds WHERE room=r.id AND winner=?)>0 AND NOT EXISTS(SELECT 1 FROM members m WHERE m.room=r.id AND m.user!=? AND (SELECT COUNT(*) FROM rounds WHERE room=r.id AND winner=m.user)>=(SELECT COUNT(*) FROM rounds WHERE room=r.id AND winner=?))) AS wins", a.id, a.id, a.id, a.id, a.id), history: await many("SELECT r.id,r.kind,r.mode,r.status,r.created_at,COUNT(CASE WHEN rr.winner=? THEN 1 END) AS solved,r.total FROM rooms r JOIN members m ON m.room=r.id LEFT JOIN rounds rr ON rr.room=r.id WHERE m.user=? GROUP BY r.id,m.user ORDER BY r.created_at DESC LIMIT 30", a.id, a.id), wallet: await many("SELECT amount,reason,created_at FROM wallet WHERE user=? ORDER BY created_at DESC LIMIT 40", a.id) });
    }
    if (action === "admin") {
      await requireAdmin();
      return json({ content: await many("SELECT * FROM content ORDER BY kind,locale,id"), reports: await many("SELECT r.*,c.prompt FROM reports r LEFT JOIN content c ON c.id=r.content_id ORDER BY r.created_at DESC LIMIT 100"), users: await many("SELECT id,name,username,banned,created_at FROM profiles ORDER BY created_at DESC LIMIT 100") });
    }
    throw new GameError("Unknown request.", 404);
  } catch (e) {
    return error(e);
  }
}
async function POST(req) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) throw new GameError("Request origin is not allowed.", 403);
    if (Number(req.headers.get("content-length")) > 4e4) throw new GameError("Request is too large.");
    const b = await req.json();
    if (!b || typeof b !== "object" || typeof b.action !== "string") throw new GameError("Invalid request.");
    await init();
    const u = await identity();
    if (u.signed) await requireAccount();
    switch (b.action) {
      case "create":
        return json(await createRoom(b.kind, b.locale, b.mode === "multi" ? "multi" : "solo", u));
      case "join":
        return json(await joinRoom(String(b.code || ""), u));
      case "start":
        await startRoom(String(b.id), u.id);
        break;
      case "leave":
        await leaveRoom(String(b.id), u.id);
        break;
      case "answer":
        return json(await submit(String(b.id), String(b.roundId), b.answer, u));
      case "skip":
        return json(await submit(String(b.id), String(b.roundId), null, u, true));
      case "next":
        await advance(String(b.id), u.id, true);
        break;
      case "profile": {
        const a = await requireAccount();
        const name = String(b.name || "").trim(), username = String(b.username || "").trim().toLowerCase();
        if (name.length < 2 || name.length > 40) throw new GameError("Display name must be 2 to 40 characters.");
        if (username && !/^[a-z0-9_]{3,24}$/.test(username)) throw new GameError("Username needs 3 to 24 letters, numbers or underscores.");
        if (username && await one("SELECT id FROM profiles WHERE username=? AND id!=?", username, a.id)) throw new GameError("Username already used.");
        await run("UPDATE profiles SET name=?,username=?,country=?,city=?,age_group=?,locale=? WHERE id=?", name, username || null, String(b.country || "").slice(0, 80), String(b.city || "").slice(0, 80), String(b.age_group || "").slice(0, 30), b.locale === "ar" ? "ar" : "en", a.id);
        return json({ profile: await profile(a.id) });
      }
      case "report": {
        const a = await requireAccount();
        const message = String(b.message || "").trim();
        if (message.length < 5 || message.length > 1e3) throw new GameError("Describe the issue in 5 to 1,000 characters.");
        if (!await one("SELECT id FROM content WHERE id=?", b.contentId)) throw new GameError("Puzzle not found.");
        if (await one("SELECT id FROM reports WHERE user=? AND content_id=? AND created_at>?", a.id, b.contentId, Date.now() - 6e4)) throw new GameError("This report was already sent.");
        await run("INSERT INTO reports(id,user,content_id,message,created_at) VALUES(?,?,?,?,?)", crypto.randomUUID(), a.id, b.contentId, message, Date.now());
        break;
      }
      case "content": {
        await requireAdmin();
        const c = b.content;
        if (!c || !["mcq", "letters", "cryptogram"].includes(c.kind) || !["en", "ar"].includes(c.locale)) throw new GameError("Choose a valid game and language.");
        if (typeof c.prompt !== "string" || c.prompt.trim().length < 3 || c.prompt.length > 600) throw new GameError("Puzzle text must be 3 to 600 characters.");
        const choices = Array.isArray(c.choices) ? c.choices : [], clues = Array.isArray(c.clues) ? c.clues : [];
        if (choices.some((x) => typeof x !== "string" || !x.trim() || x.length > 300)) throw new GameError("Enter valid answer choices.");
        if (c.kind === "mcq" && (choices.length < 2 || choices.length > 4 || !Number.isInteger(Number(c.answer)) || Number(c.answer) < 0 || Number(c.answer) >= choices.length)) throw new GameError("Enter 2 to 4 choices and a valid correct-answer number.");
        if (c.kind === "letters" && (!c.answer || !c.prompt.toLowerCase().includes(String(c.answer).toLowerCase()) || /\s/.test(c.answer) || String(c.answer).length > 20)) throw new GameError("The missing answer must be one word present in the proverb.");
        if (c.kind === "cryptogram" && (clues.length < 1 || clues.length > 12 || clues.some((x) => !x.word || !x.hint || String(x.word).length > 40 || String(x.hint).length > 150))) throw new GameError("Add 1 to 12 valid word clues.");
        const id = c.id || crypto.randomUUID();
        await run("INSERT INTO content(id,kind,locale,prompt,answer,choices,clues,explanation,active) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET kind=excluded.kind,locale=excluded.locale,prompt=excluded.prompt,answer=excluded.answer,choices=excluded.choices,clues=excluded.clues,explanation=excluded.explanation,active=excluded.active", id, c.kind, c.locale, c.prompt.trim(), c.kind === "cryptogram" ? c.prompt.trim() : String(c.answer), JSON.stringify(choices), JSON.stringify(clues), String(c.explanation || "").slice(0, 1e3), c.active === 0 ? 0 : 1);
        return json({ id });
      }
      case "ban": {
        const admin = await requireAdmin();
        if (b.id === admin.id) throw new GameError("You cannot suspend your own account.");
        await run("UPDATE profiles SET banned=? WHERE id=?", b.banned ? 1 : 0, String(b.id));
        break;
      }
      case "archive":
        await requireAdmin();
        await run("UPDATE content SET active=? WHERE id=?", b.active ? 1 : 0, String(b.id));
        break;
      case "resolve":
        await requireAdmin();
        if (!["open", "reviewing", "resolved", "rejected"].includes(b.status)) throw new GameError("Invalid report status.");
        await run("UPDATE reports SET status=? WHERE id=?", b.status, String(b.id));
        break;
      case "delete": {
        const a = await requireAccount();
        if (b.confirm !== "DELETE") throw new GameError("Type DELETE to confirm.");
        const p = await profile(a.id);
        if (p?.avatar) await bucket().delete(p.avatar);
        const rooms = await many("SELECT r.id FROM rooms r JOIN members m ON m.room=r.id WHERE m.user=? AND m.left_at IS NULL", a.id);
        for (const r of rooms) await leaveRoom(r.id, a.id);
        await batch([["DELETE FROM attempts WHERE user=?", [a.id]], ["DELETE FROM wallet WHERE user=?", [a.id]], ["DELETE FROM reports WHERE user=?", [a.id]], ["UPDATE rounds SET winner=NULL WHERE winner=?", [a.id]], ["DELETE FROM members WHERE user=?", [a.id]], ["DELETE FROM profiles WHERE id=?", [a.id]]]);
        break;
      }
      default:
        throw new GameError("Unknown action.", 404);
    }
    return json({ ok: true });
  } catch (e) {
    return error(e);
  }
}

// backend/avatar-route.ts
var avatar_route_exports = {};
__export(avatar_route_exports, {
  GET: () => GET2,
  POST: () => POST2,
  dynamic: () => dynamic2
});
var dynamic2 = "force-dynamic";
async function GET2(req) {
  try {
    const key = req.nextUrl.searchParams.get("key");
    if (!key || !/^avatars\/[a-f0-9-]+\.(png|jpg|webp)$/.test(key)) return new Response("Not found", { status: 404 });
    const file = await bucket().get(key);
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(file.body, { headers: { "Content-Type": file.httpMetadata?.contentType || "image/png", "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" } });
  } catch (e) {
    throw e;
  }
}
async function POST2(req) {
  try {
    const origin = req.headers.get("origin");
    if (origin && origin !== req.nextUrl.origin) throw new GameError("Invalid request.", 403);
    const u = await requireAccount();
    if (Number(req.headers.get("content-length")) > 53e5) throw new GameError("Maximum image size is 5 MB.");
    const data = await req.formData(), f = data.get("avatar");
    if (!(f instanceof File) || f.size > 5 * 1024 * 1024) throw new GameError("Choose an image up to 5 MB.");
    const bytes = new Uint8Array(await f.arrayBuffer());
    let type = "", ext = "";
    if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) {
      type = "image/png";
      ext = "png";
    } else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) {
      type = "image/jpeg";
      ext = "jpg";
    } else if (new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP") {
      type = "image/webp";
      ext = "webp";
    } else throw new GameError("Use a PNG, JPEG or WebP image.");
    const key = "avatars/" + crypto.randomUUID() + "." + ext;
    await bucket().put(key, bytes, { httpMetadata: { contentType: type } });
    const p = await profile(u.id);
    await run("UPDATE profiles SET avatar=? WHERE id=?", key, u.id);
    if (p?.avatar) await bucket().delete(p.avatar);
    return NextResponse.json({ avatar: key });
  } catch (e) {
    if (!(e instanceof GameError)) throw e;
    return NextResponse.json({ error: e instanceof GameError ? e.message : "Could not upload the image." }, { status: e instanceof GameError ? e.status : 503 });
  }
}

// backend/index.ts
function validActor(value) {
  return value && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 200 && typeof value.name === "string" && value.name.length <= 200 && typeof value.signed === "boolean" && (value.signed ? !value.id.startsWith("g_") : /^g_[a-f0-9-]{36}$/.test(value.id)) && (value.authUserId === void 0 || value.signed && typeof value.authUserId === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value.authUserId) && value.id === "sb_" + value.authUserId);
}
async function handleBackend(request) {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405 });
  const token = request.headers.get("x-hikmah-server-token");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return Response.json({ error: "Unauthorized." }, { status: 401 });
  const sql = createConnection();
  try {
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))), (b) => b.toString(16).padStart(2, "0")).join("");
    const accepted = await sql`SELECT 1 FROM hikmah.server_credentials WHERE token_hash = ${hash} AND revoked_at IS NULL`;
    if (!accepted.length) return Response.json({ error: "Unauthorized." }, { status: 401 });
    const actorHeader = request.headers.get("x-hikmah-actor");
    let actor;
    try {
      actor = JSON.parse(decodeURIComponent(actorHeader || ""));
    } catch {
      return Response.json({ error: "Invalid identity." }, { status: 400 });
    }
    if (!validActor(actor)) return Response.json({ error: "Invalid identity." }, { status: 400 });
    if (actor.authUserId) {
      const linked = await sql`SELECT id FROM hikmah.profiles WHERE auth_user_id = ${actor.authUserId}`;
      if (linked.length) actor.id = linked[0].id;
    }
    const url = new URL(request.url);
    const resource = url.searchParams.get("resource");
    const method = url.searchParams.get("method");
    if (!["game", "avatar"].includes(resource || "") || !["GET", "POST"].includes(method || "")) return Response.json({ error: "Unknown request." }, { status: 404 });
    url.searchParams.delete("resource");
    url.searchParams.delete("method");
    const body = method === "POST" ? await request.arrayBuffer() : void 0;
    const limit = resource === "avatar" ? 53e5 : 4e4;
    if ((body?.byteLength || 0) > limit) return Response.json({ error: "Request is too large." }, { status: 413 });
    const handler = (resource === "game" ? game_route_exports : avatar_route_exports)[method];
    return await actorContext.run(actor, () => withDatabase(sql, () => {
      const headers = new Headers();
      if (body) {
        headers.set("content-type", request.headers.get("content-type") || "application/json");
        headers.set("content-length", String(body.byteLength));
      }
      return handler(new NextRequest(url, { method, headers, body }));
    }));
  } catch (error2) {
    console.error("Hikmah backend failure", { code: error2?.code || "backend_error", message: error2?.message });
    return Response.json({ error: "The game service is unavailable. Your last saved progress is safe. Try again." }, { status: 503 });
  } finally {
    await sql.end({ timeout: 1 });
  }
}
if (typeof Deno !== "undefined" && env2.SUPABASE_URL) Deno.serve(handleBackend);
export {
  handleBackend
};
