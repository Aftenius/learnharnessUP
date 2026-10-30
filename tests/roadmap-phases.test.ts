import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pedagogyOpening, topicFromDraft } from "../src/core/pedagogy.ts";
import { parseCriticVerdict, criticMarkerContent } from "../src/core/critic.ts";
import { slotForTask, tierMark } from "../src/core/model-tier.ts";
import { applySm2, gradeReview, initialReview, pickReviewCard, qualityFromSignal } from "../src/core/sm2.ts";
import { labelProposal, scanContradictions } from "../src/core/contradictions.ts";
import { localEmbed, rankNodes } from "../src/core/local-embed.ts";
import { assignLocalContour, modelsFromProbe, presetBaseUrl, presetById } from "../src/core/local-presets.ts";
import { parseRunnableSnippet, snippetSrcDoc, splitTrace } from "../src/core/snippet.ts";
import { graphMl, obsidianFiles, zipTextFiles } from "../src/core/graph-export.ts";

describe("pedagogy openings", () => {
	it("uses a short draft as the topic and leaves a long draft alone", () => {
		assert.equal(topicFromDraft("video editing"), "video editing");
		assert.equal(topicFromDraft("line one\nline two"), "");
		assert.match(pedagogyOpening("pareto", "video editing"), /5 ключевых поднавыков/);
		assert.match(pedagogyOpening("pareto", "video editing"), /2 часа/);
		assert.match(pedagogyOpening("feynman", ""), /10 лет/);
		assert.match(pedagogyOpening("tutor", "graphs"), /Дождись ответа/);
	});
});

describe("critic note", () => {
	it("parses a disagreement and names both models without replacing the session reply", () => {
		const verdict = parseCriticVerdict('sure {"disagrees": true, "note": "The analogy skips the invariant."}');
		assert.equal(verdict?.disagrees, true);
		const text = criticMarkerContent(verdict!, "cheap · a:b", "strong · c:d");
		assert.match(text, /does not replace/);
		assert.match(text, /cheap · a:b/);
		assert.equal(parseCriticVerdict('{"disagrees": false, "note": ""}')?.disagrees, false);
		assert.equal(slotForTask("critic"), "cheap");
		assert.equal(slotForTask("synthesize"), "strong");
		assert.equal(tierMark("cheap", "custom:local"), "cheap · custom:local");
	});
});

describe("SM-2 review ledger", () => {
	it("resets on a miss and pulls neighbors, and does not invent a card when nothing is due", () => {
		const now = new Date("2026-10-30T00:00:00.000Z");
		assert.equal(qualityFromSignal(true, 20), 3);
		assert.equal(qualityFromSignal(false, 90), 1);
		const first = applySm2(initialReview("n1", now), 5, now);
		assert.equal(first.intervalDays, 1);
		assert.equal(first.repetitions, 1);
		const far = { ...initialReview("n2", now), dueAt: new Date(now.getTime() + 30 * 86_400_000).toISOString() };
		const failed = gradeReview([first, far], "n1", 1, ["n2"], now);
		const self = failed.find((row) => row.nodeId === "n1");
		const neighbor = failed.find((row) => row.nodeId === "n2");
		assert.equal(self?.repetitions, 0);
		assert.equal(neighbor?.dueAt, new Date(now.getTime() + 86_400_000).toISOString());
		const later = new Date("2026-10-31T00:00:00.000Z");
		assert.equal(pickReviewCard([{ id: "n9", createdAt: "2026-01-01T00:00:00.000Z" }], [], later)?.nodeId, "n9");
		const future = applySm2(initialReview("n3", now), 5, now);
		assert.equal(pickReviewCard([{ id: "n3", createdAt: now.toISOString() }], [future], now), null);
	});
});

describe("contradictions", () => {
	it("proposes a negated pair and keeps a learner label across a rescan", () => {
		const nodes = [
			{ id: "a", statement: "The sorting algorithm is stable for equal keys." },
			{ id: "b", statement: "The sorting algorithm is not stable for equal keys." },
		];
		const found = scanContradictions(nodes);
		assert.equal(found.length, 1);
		assert.equal(found[0]?.label, "open");
		const labeled = labelProposal(found, found[0]!.id, "other-context");
		assert.equal(labeled?.[0]?.label, "other-context");
		const again = scanContradictions(nodes, labeled!);
		assert.equal(again[0]?.label, "other-context");
		assert.equal(labelProposal(found, found[0]!.id, "open"), null);
	});
});

describe("local retrieval and presets", () => {
	it("ranks a nearer statement first and does not append a second /v1", () => {
		const hits = rankNodes(
			[
				{ id: "n1", name: "Stable sort", statement: "Equal keys keep their order." },
				{ id: "n2", name: "Hash join", statement: "A hash table probes the build side." },
			],
			"equal keys keep order",
		);
		assert.equal(hits[0]?.id, "n1");
		assert.ok(localEmbed("alpha").some((value) => value !== 0));
		const ollama = presetById("ollama");
		assert.ok(ollama);
		assert.match(presetBaseUrl(ollama!), /\/v1$/);
		assert.doesNotMatch(presetBaseUrl(ollama!), /\/v1\/v1/);
		assert.deepEqual(modelsFromProbe("ollama", { models: [{ name: "llama3" }] }), ["llama3"]);
		const slots = assignLocalContour({ cheap: { model: { provider: "openai", id: "old" }, thinkingLevel: "low" as const } }, "llama3");
		assert.equal(slots.strong.model.id, "llama3");
		assert.equal(slots.cheap.model.provider, "custom");
		assert.equal(slots.cheap.thinkingLevel, "low");
		assert.equal(slots.vision.model.id, "llama3");
	});
});

describe("snippet traces and graph export", () => {
	it("parses a runnable fence, splits trace frames, and exports GraphML plus a zip", () => {
		assert.deepEqual(parseRunnableSnippet("python", 'run expect="4"'), { expect: "4" });
		assert.equal(parseRunnableSnippet("python", ""), null);
		assert.equal(parseRunnableSnippet("ts", "run"), null);
		const split = splitTrace('ok\nLH_TRACE {"step":1,"label":"push","state":{"stack":[1]}}\n');
		assert.equal(split.visible, "ok");
		assert.equal(split.frames[0]?.label, "push");
		const doc = snippetSrcDoc("print(1)", "1");
		assert.match(doc, /default-src 'none'/);
		assert.match(doc, /pyodide/);
		assert.doesNotMatch(doc, /allow-same-origin/);
		const nodes = [{ id: "n1", name: "Alpha", statement: "Alpha holds." }];
		const chains = [{ premises: ["n1"], conclusion: "n1" }];
		assert.match(graphMl(nodes, [{ premises: ["n1"], conclusion: "n2" }]), /edgedefault="directed"/);
		const files = obsidianFiles(nodes, chains);
		assert.ok(files.some((file) => file.path.endsWith(".canvas")));
		const zip = zipTextFiles(files);
		assert.equal(zip[0], 0x50);
		assert.equal(zip[1], 0x4b);
	});
});
