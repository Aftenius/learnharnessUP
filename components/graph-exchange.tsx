"use client";

import { useState } from "react";
import type { ContradictionLabel, ContradictionProposal } from "@/src/core";

const FORMATS = [
	{ id: "obsidian", label: "Obsidian" },
	{ id: "logseq", label: "Logseq" },
	{ id: "graphml", label: "GraphML" },
] as const;

async function download(format: string) {
	const res = await fetch(`/api/graph/export?format=${format}`);
	if (!res.ok) return;
	const blob = await res.blob();
	const named = /filename="([^"]+)"/.exec(res.headers.get("content-disposition") ?? "");
	const link = document.createElement("a");
	link.href = URL.createObjectURL(blob);
	link.download = named?.[1] ?? `learnharness.${format}`;
	link.click();
	URL.revokeObjectURL(link.href);
}

/** Export the derived graph, and label contradiction proposals. Neither writes the node ledger. */
export function GraphExchange() {
	const [open, setOpen] = useState(false);
	const [proposals, setProposals] = useState<ContradictionProposal[]>([]);

	const load = () => {
		void fetch("/api/graph/contradictions")
			.then((res) => res.json() as Promise<{ proposals: ContradictionProposal[] }>)
			.then((body) => setProposals(body.proposals ?? []))
			.catch(() => {});
	};

	const label = (id: string, next: ContradictionLabel) => {
		void fetch("/api/graph/contradictions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ id, label: next }),
		})
			.then((res) => res.json() as Promise<{ proposals: ContradictionProposal[] }>)
			.then((body) => setProposals(body.proposals ?? []))
			.catch(() => {});
	};

	const openOnes = proposals.filter((proposal) => proposal.label === "open");
	return (
		<div className="shrink-0 rounded-xl border bg-card/85 px-1 py-[3px] shadow-lg backdrop-blur">
			<div className="flex items-center gap-1">
				{FORMATS.map((format) => (
					<button
						key={format.id}
						type="button"
						data-testid={`export-${format.id}`}
						onClick={() => void download(format.id)}
						className="flex h-7 items-center rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
					>
						{format.label}
					</button>
				))}
				<button
					type="button"
					data-testid="contradiction-scan"
					onClick={() => {
						setOpen(true);
						void fetch("/api/graph/contradictions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scan: true }) })
							.then((res) => res.json() as Promise<{ proposals: ContradictionProposal[] }>)
							.then((body) => setProposals(body.proposals ?? []))
							.catch(() => load());
					}}
					className="flex h-7 items-center rounded-lg px-2 text-xs text-muted-foreground transition-colors hover:bg-accent"
				>
					Противоречия
				</button>
			</div>
			{open && (
				<div data-testid="contradiction-list" className="max-h-64 w-80 overflow-y-auto p-2 text-xs">
					{openOnes.length === 0 && <p className="text-muted-foreground">Открытых противоречий нет</p>}
					{openOnes.map((proposal) => (
						<div key={proposal.id} className="mb-2 border-t pt-2">
							<p>{proposal.statementA}</p>
							<p className="mt-1 text-muted-foreground">{proposal.statementB}</p>
							<div className="mt-1 flex flex-wrap gap-1">
								<button type="button" className="rounded border px-1.5 py-0.5" onClick={() => label(proposal.id, "other-context")}>Другой контекст</button>
								<button type="button" className="rounded border px-1.5 py-0.5" onClick={() => label(proposal.id, "superseded")}>Устарело</button>
								<button type="button" className="rounded border px-1.5 py-0.5" onClick={() => label(proposal.id, "reconcile")}>Согласовать</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
