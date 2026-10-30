/**
 * One cheap-slot pass over an explain answer.
 * Missing cheap slot, test runs, and a bad verdict all skip the note.
 * The teacher turn still happens.
 */

import { runSubagent } from "../agent/subagents/pi-run.ts";
import { piEngineForSpec } from "../agent/models.ts";
import { criticMarkerContent, criticUserPrompt, CRITIC_SYSTEM_PROMPT, parseCriticVerdict } from "../core/critic.ts";
import { tierMark } from "../core/model-tier.ts";
import { newCriticMarker } from "../core/native-messages.ts";
import type { QuestionAnswerData } from "../core/question-core.ts";
import type { EffectiveSlot } from "../core/settings-resolution.ts";
import type { LhMarkerMessage } from "../core/native-messages.ts";

export async function critiqueExplainAnswer(
	answer: QuestionAnswerData,
	session: { provider: string; id: string },
	cheap: EffectiveSlot | null,
): Promise<LhMarkerMessage | null> {
	if (process.env.NODE_ENV === "test" && process.env.LH_CRITIC !== "1") return null;
	if (answer.kind !== "explain" || answer.dontKnow || answer.dismissed) return null;
	const explanation = answer.text?.trim();
	if (!explanation || !cheap) return null;
	let engine;
	try {
		engine = piEngineForSpec(cheap, true);
	} catch {
		return null;
	}
	const sessionModel = `${session.provider}:${session.id}`;
	const criticModel = tierMark("cheap", `${cheap.provider}:${cheap.id}`);
	try {
		const { text } = await runSubagent([], {
			role: "auditor",
			engine,
			systemPrompt: CRITIC_SYSTEM_PROMPT,
			prompt: criticUserPrompt(explanation, answer.committed ?? "", undefined),
			maxTurns: 1,
			abortSignal: AbortSignal.timeout(20_000),
		});
		const verdict = parseCriticVerdict(text);
		if (!verdict?.disagrees) return null;
		return newCriticMarker(criticMarkerContent(verdict, criticModel, sessionModel), {
			criticModel,
			sessionModel,
			note: verdict.note,
		});
	} catch {
		return null;
	}
}
