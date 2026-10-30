/**
 * Probe the three local runtime presets. A hit's base URL already includes /v1.
 */

import { LOCAL_RUNTIME_PRESETS, modelsFromProbe, presetBaseUrl, type DetectedRuntime } from "../core/local-presets.ts";

export async function detectLocalRuntimes(fetchImpl: typeof fetch = fetch, timeoutMs = 400): Promise<DetectedRuntime[]> {
	const checks = LOCAL_RUNTIME_PRESETS.map(async (preset) => {
		try {
			const response = await fetchImpl(preset.probeUrl, { signal: AbortSignal.timeout(timeoutMs) });
			if (!response.ok) return null;
			const body: unknown = await response.json();
			return {
				id: preset.id,
				label: preset.label,
				baseUrl: presetBaseUrl(preset),
				models: modelsFromProbe(preset.id, body),
			} satisfies DetectedRuntime;
		} catch {
			return null;
		}
	});
	const found = await Promise.all(checks);
	return found.filter((hit): hit is DetectedRuntime => hit !== null);
}
