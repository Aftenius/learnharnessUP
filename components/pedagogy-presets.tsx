"use client";

import { PEDAGOGY_PRESETS, pedagogyOpening, topicFromDraft, type PedagogyMode } from "@/src/core";

/** Fills the draft with one opening. Does not create a session kind. */
export function PedagogyPresets({ text, onPick }: { text: string; onPick: (opening: string) => void }) {
	const pick = (mode: PedagogyMode) => onPick(pedagogyOpening(mode, topicFromDraft(text)));
	return (
		<div data-testid="pedagogy-presets" className="pointer-events-auto mb-2 flex flex-wrap gap-1.5">
			{PEDAGOGY_PRESETS.map((preset) => (
				<button
					key={preset.mode}
					type="button"
					title={preset.hint}
					data-testid={`pedagogy-${preset.mode}`}
					onClick={() => pick(preset.mode)}
					className="cursor-pointer rounded-full border border-border bg-card px-3 py-1 font-ui text-xs text-foreground transition-colors hover:bg-accent"
				>
					{preset.label}
				</button>
			))}
		</div>
	);
}
