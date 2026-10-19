import { getPgPool } from "@padyna/db";

// Counting how often each datasource is cited used to be an UPDATE per knowledge
// search, all hitting the same hot rows. Increments are now summed in memory and
// written in one statement per chatbot every few seconds.
const FLUSH_INTERVAL_MS = 10_000;
const MAX_WEIGHT_PER_SOURCE = 3;

type Key = `${string}|${string}|${string}`;

export interface ReferenceIncrement {
  chatbotId: string;
  organizationId: string;
  datasourceId: string;
  increment: number;
}

const pending = new Map<Key, number>();
let timer: ReturnType<typeof setInterval> | null = null;

/** Adds one search's worth of references, capped per datasource like before. */
export function addReferenceIncrements(
  target: Map<Key, number>,
  chatbotId: string,
  organizationId: string,
  datasourceIds: string[],
) {
  const perSearch = new Map<string, number>();
  for (const datasourceId of datasourceIds) {
    perSearch.set(datasourceId, Math.min((perSearch.get(datasourceId) ?? 0) + 1, MAX_WEIGHT_PER_SOURCE));
  }

  for (const [datasourceId, count] of perSearch) {
    const key: Key = `${chatbotId}|${organizationId}|${datasourceId}`;
    target.set(key, (target.get(key) ?? 0) + count);
  }
}

/** Empties the buffer and groups increments by chatbot for one UPDATE each. */
export function drainReferenceIncrements(source: Map<Key, number>) {
  const byChatbot = new Map<string, ReferenceIncrement[]>();

  for (const [key, increment] of source) {
    const [chatbotId, organizationId, datasourceId] = key.split("|") as [string, string, string];
    const groupKey = `${chatbotId}|${organizationId}`;
    const group = byChatbot.get(groupKey) ?? [];
    group.push({ chatbotId, organizationId, datasourceId, increment });
    byChatbot.set(groupKey, group);
  }

  source.clear();
  return [...byChatbot.values()];
}

async function writeIncrements(group: ReferenceIncrement[]) {
  const first = group[0];
  if (!first) return;

  const valuesClause = group
    .map((_, index) => `($${index * 2 + 1}::uuid, $${index * 2 + 2}::integer)`)
    .join(", ");
  const params = group.flatMap(({ datasourceId, increment }) => [datasourceId, increment]);

  await getPgPool().query(
    `
      update datasources as d
      set times_referenced = d.times_referenced + v.increment
      from (values ${valuesClause}) as v(id, increment)
      where d.id = v.id
        and d.chatbot_id = $${params.length + 1}::uuid
        and d.organization_id = $${params.length + 2}::text
    `,
    [...params, first.chatbotId, first.organizationId],
  );
}

export async function flushDatasourceReferences() {
  const groups = drainReferenceIncrements(pending);
  await Promise.all(
    groups.map((group) =>
      writeIncrements(group).catch((error) => {
        console.error("Failed to record datasource references", error);
      }),
    ),
  );
}

export function recordDatasourceReferences(
  chatbotId: string,
  organizationId: string,
  datasourceIds: string[],
) {
  if (datasourceIds.length === 0) return;

  addReferenceIncrements(pending, chatbotId, organizationId, datasourceIds);

  if (!timer) {
    timer = setInterval(() => void flushDatasourceReferences(), FLUSH_INTERVAL_MS);
    // Don't keep the process alive just to flush counters.
    timer.unref?.();
  }
}
