"use client";

import { CONFIDENCE_STOPS, DEFAULT_CONFIDENCE_INDEX } from "@/src/core";
import { confidenceRailStyle } from "@/components/confidence-rail";

/** The same stops as the quiz slider, for free answers and review cards. */
export function ConfidenceControl({
	index,
	onIndex,
	disabled = false,
}: {
	index: number;
	onIndex: (index: number) => void;
	disabled?: boolean;
}) {
	const safe = CONFIDENCE_STOPS[index] ?? CONFIDENCE_STOPS[DEFAULT_CONFIDENCE_INDEX]!;
	return (
		<div className="flex items-center gap-3 px-2.5 py-2" data-testid="confidence-control">
			<span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">Уверенность</span>
			<input
				type="range"
				min={0}
				max={100}
				step={1}
				disabled={disabled}
				value={safe}
				aria-label="Уверенность — вероятность, что ответ верен"
				data-testid="confidence-slider"
				onChange={(event) => {
					const value = Number(event.target.value);
					let best = 0;
					for (let i = 1; i < CONFIDENCE_STOPS.length; i++) {
						if (Math.abs(CONFIDENCE_STOPS[i]! - value) < Math.abs(CONFIDENCE_STOPS[best]! - value)) best = i;
					}
					onIndex(best);
				}}
				className="h-4 min-w-0 flex-1"
				style={confidenceRailStyle(safe)}
			/>
			<span className="w-9 shrink-0 text-right font-mono text-sm tabular-nums">{safe}%</span>
		</div>
	);
}
