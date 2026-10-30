/**
 * Presets for local OpenAI-compatible servers.
 * Each base URL already includes /v1. Callers must not append another /v1.
 * Probing is separate: this module only names the endpoints and parses
 * their model lists.
 */

export interface LocalRuntimePreset {
	id: "ollama" | "llama.cpp" | "vllm";
	label: string;
	/** OpenAI-compatible base. Already ends in /v1. */
	baseUrl: string;
	/** Liveness probe. Ollama's tag list is not under /v1. */
	probeUrl: string;
}

export const LOCAL_RUNTIME_PRESETS: readonly LocalRuntimePreset[] = [
	{
		id: "ollama",
		label: "Ollama",
		baseUrl: "http://127.0.0.1:11434/v1",
		probeUrl: "http://127.0.0.1:11434/api/tags",
	},
	{
		id: "llama.cpp",
		label: "llama.cpp",
		baseUrl: "http://127.0.0.1:8080/v1",
		probeUrl: "http://127.0.0.1:8080/v1/models",
	},
	{
		id: "vllm",
		label: "vLLM",
		baseUrl: "http://127.0.0.1:8000/v1",
		probeUrl: "http://127.0.0.1:8000/v1/models",
	},
];

export function presetById(id: string): LocalRuntimePreset | null {
	return LOCAL_RUNTIME_PRESETS.find((preset) => preset.id === id) ?? null;
}

/**
 * The preset URL is stored as-is. A value that already ends in /v1 is
 * not given a second suffix.
 */
export function presetBaseUrl(preset: LocalRuntimePreset): string {
	return preset.baseUrl;
}

export interface DetectedRuntime {
	id: LocalRuntimePreset["id"];
	label: string;
	baseUrl: string;
	models: string[];
}

/** Model ids from an Ollama tag list or an OpenAI /v1/models body. */
export function modelsFromProbe(id: LocalRuntimePreset["id"], body: unknown): string[] {
	if (typeof body !== "object" || body === null) return [];
	const record = body as { models?: unknown; data?: unknown };
	if (id === "ollama" && Array.isArray(record.models)) {
		return record.models
			.map((row) => (typeof row === "object" && row && "name" in row ? String((row as { name: unknown }).name) : ""))
			.filter((name) => name.length > 0);
	}
	if (Array.isArray(record.data)) {
		return record.data
			.map((row) => (typeof row === "object" && row && "id" in row ? String((row as { id: unknown }).id) : ""))
			.filter((name) => name.length > 0);
	}
	return [];
}

/** Put one local model in every slot without dropping a slot's thinking level. */
export function assignLocalContour<T extends { model?: { provider: string; id: string } }>(
	existing: { strong?: T; cheap?: T; vision?: T } | null | undefined,
	modelId: string,
): { strong: T; cheap: T; vision: T } {
	const slot = (prev: T | undefined): T => ({ ...(prev ?? ({} as T)), model: { provider: "custom", id: modelId } });
	return {
		strong: slot(existing?.strong),
		cheap: slot(existing?.cheap),
		vision: slot(existing?.vision),
	};
}
