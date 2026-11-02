import type { SimpleStreamOptions } from "@earendil-works/pi-ai";

/** Midpoint of the paper's temperature band (0.20–0.40). */
export const DENSE_TEMPERATURE = 0.3;

/** Fields the OpenAI chat-completions schema accepts. */
const COMPLETIONS_SAMPLING: Record<string, number> = {
	top_p: 1,
	presence_penalty: 0.25,
	frequency_penalty: 0,
};

/** min_p and repetition_penalty are vLLM / llama.cpp fields. Hosted
 *  chat-completions servers reject them, so they ride only on a local URL. */
const LOCAL_SAMPLING: Record<string, number> = {
	min_p: 0.08,
	repetition_penalty: 1.07,
};

/** A local or private host is the paper's inference server. A public
 *  OpenAI-compatible URL is not: it rejects the local-only fields. */
export function acceptsLocalSampling(baseUrl: string | undefined): boolean {
	if (!baseUrl) return false;
	let host: string;
	try {
		host = new URL(baseUrl).hostname;
	} catch {
		return false;
	}
	if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
	if (/^127\./.test(host)) return true;
	if (/^10\./.test(host)) return true;
	if (/^192\.168\./.test(host)) return true;
	if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
	return false;
}

export interface DenseSamplingInput {
	api: string;
	baseUrl?: string;
	/** Hosted reasoning models reject temperature and logit penalties. */
	reasoning?: boolean;
	/** True only for this app's custom OpenAI-completions route. */
	completions: boolean;
	options: SimpleStreamOptions | undefined;
}

/**
 * Attach the paper's decoding where the adapter is known to accept it.
 * Caller-supplied temperature and samplingParams win.
 */
export function withDenseSampling(input: DenseSamplingInput): SimpleStreamOptions | undefined {
	const { api, options } = input;
	if (api === "anthropic-messages") {
		const base = options ?? {};
		return { ...base, temperature: base.temperature ?? DENSE_TEMPERATURE };
	}
	if (!input.completions || api !== "openai-completions") return options;
	if (input.reasoning && !acceptsLocalSampling(input.baseUrl)) return options;
	const base = options ?? {};
	const local = acceptsLocalSampling(input.baseUrl) ? LOCAL_SAMPLING : {};
	return {
		...base,
		temperature: base.temperature ?? DENSE_TEMPERATURE,
		samplingParams: { ...COMPLETIONS_SAMPLING, ...local, ...base.samplingParams },
	};
}
