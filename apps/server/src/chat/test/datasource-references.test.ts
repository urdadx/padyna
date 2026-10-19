import { describe, expect, test } from "bun:test";

import { addReferenceIncrements, drainReferenceIncrements } from "../datasource-references";

describe("datasource reference buffering", () => {
  test("caps one search's weight per datasource and sums across searches", () => {
    const buffer = new Map();
    addReferenceIncrements(buffer, "bot", "org", ["a", "a", "a", "a", "b"]);
    addReferenceIncrements(buffer, "bot", "org", ["a"]);

    const [group] = drainReferenceIncrements(buffer);
    expect(group).toEqual(
      expect.arrayContaining([
        { chatbotId: "bot", organizationId: "org", datasourceId: "a", increment: 4 },
        { chatbotId: "bot", organizationId: "org", datasourceId: "b", increment: 1 },
      ]),
    );
  });

  test("groups by chatbot and empties the buffer", () => {
    const buffer = new Map();
    addReferenceIncrements(buffer, "bot-1", "org", ["a"]);
    addReferenceIncrements(buffer, "bot-2", "org", ["b"]);

    const groups = drainReferenceIncrements(buffer);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group[0]!.chatbotId).sort()).toEqual(["bot-1", "bot-2"]);
    expect(buffer.size).toBe(0);
    expect(drainReferenceIncrements(buffer)).toEqual([]);
  });
});
