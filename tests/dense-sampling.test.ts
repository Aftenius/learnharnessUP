import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { acceptsLocalSampling, withDenseSampling } from "../src/agent/dense-sampling.ts";

describe("dense sampling", () => {
	it("leaves ChatGPT-shaped and other hosted APIs alone", () => {
		const options = { maxTokens: 10 };
		assert.equal(withDenseSampling({ api: "openai-responses", completions: false, options }), options);
		assert.equal(withDenseSampling({ api: "google-generative-ai", completions: false, options }), options);
		assert.equal(
			withDenseSampling({ api: "openai-completions", completions: false, options }),
			options,
		);
	});

	it("sends Anthropic a temperature and keeps a caller override", () => {
		const set = withDenseSampling({ api: "anthropic-messages", completions: false, options: undefined });
		assert.equal(set?.temperature, 0.3);
		const kept = withDenseSampling({ api: "anthropic-messages", completions: false, options: { temperature: 0.9 } });
		assert.equal(kept?.temperature, 0.9);
	});

	it("sends a public completions server only the chat-completions fields", () => {
		const set = withDenseSampling({
			api: "openai-completions",
			baseUrl: "https://api.openai.com/v1",
			completions: true,
			options: undefined,
		});
		assert.equal(set?.temperature, 0.3);
		assert.equal(set?.samplingParams?.top_p, 1);
		assert.equal(set?.samplingParams?.presence_penalty, 0.25);
		assert.equal(set?.samplingParams?.frequency_penalty, 0);
		assert.equal(set?.samplingParams?.min_p, undefined);
		assert.equal(set?.samplingParams?.repetition_penalty, undefined);
	});

	it("adds min_p and repetition_penalty on a local server", () => {
		assert.equal(acceptsLocalSampling("http://127.0.0.1:8000/v1"), true);
		assert.equal(acceptsLocalSampling("https://api.openai.com/v1"), false);
		const set = withDenseSampling({
			api: "openai-completions",
			baseUrl: "http://localhost:8000/v1",
			reasoning: true,
			completions: true,
			options: { samplingParams: { top_p: 0.5 } },
		});
		assert.equal(set?.temperature, 0.3);
		assert.equal(set?.samplingParams?.min_p, 0.08);
		assert.equal(set?.samplingParams?.repetition_penalty, 1.07);
		assert.equal(set?.samplingParams?.top_p, 0.5);
	});

	it("does not send decoding fields to a hosted reasoning model", () => {
		const options = { maxTokens: 10 };
		assert.equal(
			withDenseSampling({
				api: "openai-completions",
				baseUrl: "https://openrouter.ai/api/v1",
				reasoning: true,
				completions: true,
				options,
			}),
			options,
		);
	});
});
