"use client";

import { useState } from "react";
import { assignLocalContour, LOCAL_RUNTIME_PRESETS, type DetectedRuntime } from "@/src/core";

/**
 * Fills the custom-endpoint URL from a preset or a live probe.
 * Preset URLs already include /v1. Detected models can be written into
 * every slot so background work stays on the same local server.
 */
export function LocalRuntimePresets({
	onBaseUrl,
	onModels,
}: {
	onBaseUrl: (url: string) => void;
	onModels: (ids: string) => void;
}) {
	const [found, setFound] = useState<DetectedRuntime[] | null>(null);
	const [busy, setBusy] = useState(false);
	const [note, setNote] = useState<string | null>(null);

	const detect = () => {
		setBusy(true);
		setNote(null);
		void fetch("/api/providers/local")
			.then((res) => res.json() as Promise<{ runtimes: DetectedRuntime[] }>)
			.then((body) => setFound(body.runtimes ?? []))
			.catch(() => setFound([]))
			.finally(() => setBusy(false));
	};

	const apply = (hit: { baseUrl: string; models: string[] }) => {
		onBaseUrl(hit.baseUrl);
		if (hit.models.length > 0) onModels(hit.models.join(", "));
	};

	const assignAll = async (modelId: string) => {
		setNote(null);
		const current = await fetch("/api/settings").then((res) => res.json() as Promise<{ settings: { models?: { strong?: object; cheap?: object; vision?: object } } | null }>);
		const models = assignLocalContour(current.settings?.models, modelId);
		const res = await fetch("/api/settings/models", {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(models),
		});
		setNote(res.ok ? "Сильная, дешёвая и зрение теперь используют эту локальную модель." : "Сначала подключите эндпоинт, затем назначайте слоты.");
	};

	return (
		<div data-testid="local-runtime-presets" className="flex flex-col gap-1">
			<div className="flex flex-wrap items-center gap-1">
				{LOCAL_RUNTIME_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						data-testid={`preset-${preset.id}`}
						onClick={() => apply({ baseUrl: preset.baseUrl, models: [] })}
						className="rounded border px-1.5 py-0.5 font-ui text-[11px] text-muted-foreground hover:bg-accent"
					>
						{preset.label}
					</button>
				))}
				<button type="button" data-testid="detect-local" disabled={busy} onClick={detect} className="rounded border px-1.5 py-0.5 font-ui text-[11px] hover:bg-accent disabled:opacity-50">
					{busy ? "Поиск…" : "Найти локальные"}
				</button>
			</div>
			{found && found.length === 0 && <p className="text-[11px] text-muted-foreground">Локальный рантайм не ответил.</p>}
			{found?.map((hit) => (
				<div key={hit.id} className="flex flex-wrap items-center gap-1 text-[11px]">
					<button type="button" className="rounded bg-accent px-1.5 py-0.5" onClick={() => apply(hit)}>
						{hit.label} · {hit.baseUrl}
					</button>
					{hit.models[0] && (
						<button type="button" className="rounded border px-1.5 py-0.5" onClick={() => void assignAll(hit.models[0]!)}>
							Во все слоты: {hit.models[0]}
						</button>
					)}
				</div>
			))}
			{note && <p className="text-[11px] text-muted-foreground">{note}</p>}
		</div>
	);
}
