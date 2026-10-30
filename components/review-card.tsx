"use client";

import { useEffect, useState } from "react";
import { ConfidenceControl } from "@/components/confidence-control";
import { DEFAULT_CONFIDENCE_INDEX, CONFIDENCE_STOPS } from "@/src/core";

interface DueCard {
	nodeId: string;
	name: string;
}

/**
 * One recall card at the start of a new session.
 * Skip writes nothing. A grade writes the review ledger and then reveals the statement.
 */
export function ReviewCard() {
	const [card, setCard] = useState<DueCard | null>(null);
	const [hidden, setHidden] = useState(false);
	const [recall, setRecall] = useState("");
	const [confIdx, setConfIdx] = useState(DEFAULT_CONFIDENCE_INDEX);
	const [revealed, setRevealed] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		void fetch("/api/reviews")
			.then((res) => res.json() as Promise<{ card: DueCard | null }>)
			.then((body) => {
				if (!cancelled) setCard(body.card);
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	if (!card || hidden) return null;

	const grade = (correct: boolean) => {
		void fetch("/api/reviews", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				nodeId: card.nodeId,
				correct,
				confidence: CONFIDENCE_STOPS[confIdx],
			}),
		})
			.then((res) => res.json() as Promise<{ statement?: string }>)
			.then((body) => setRevealed(body.statement ?? ""))
			.catch(() => setRevealed(""));
	};

	return (
		<div data-testid="review-card" className="pointer-events-auto mb-2 rounded-xl border bg-card p-3">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Повторение</p>
			<p className="mt-1 text-sm">{card.name}</p>
			{revealed === null ? (
				<>
					<textarea
						value={recall}
						onChange={(event) => setRecall(event.target.value)}
						placeholder="Что утверждает это утверждение?"
						aria-label="Воспоминание"
						className="mt-2 min-h-16 w-full resize-none rounded-md border bg-background px-2 py-1 text-sm outline-none"
					/>
					<ConfidenceControl index={confIdx} onIndex={setConfIdx} />
					<div className="flex flex-wrap gap-2">
						<button type="button" className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground" onClick={() => grade(true)}>
							Знал
						</button>
						<button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => grade(false)}>
							Не вспомнил
						</button>
						<button type="button" data-testid="review-skip" className="rounded-md px-2 py-1 text-xs text-muted-foreground" onClick={() => setHidden(true)}>
							Пропустить
						</button>
					</div>
				</>
			) : (
				<p className="mt-2 text-sm text-muted-foreground">{revealed}</p>
			)}
		</div>
	);
}
