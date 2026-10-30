/**
 * Which slot runs which part of a live session.
 * Synthesis stays on the session's strong model.
 * Classification, the adversarial check, and context maintenance use cheap
 * when that slot is configured. The transcript names the slot so a reply
 * is never silently co-authored.
 */

export type SessionTask = "synthesize" | "classify" | "critic" | "maintain-context";

export function slotForTask(task: SessionTask): "strong" | "cheap" {
	if (task === "synthesize") return "strong";
	return "cheap";
}

/** Visible provenance for a model that is not the session author. */
export function tierMark(slot: "strong" | "cheap", modelId: string): string {
	return `${slot} · ${modelId}`;
}
