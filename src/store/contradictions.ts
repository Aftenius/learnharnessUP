/**
 * Contradiction proposals at config.CONTRADICTIONS_FILE.
 * The file never contains a deletion or a merge of graph nodes.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { CONTRADICTIONS_FILE } from "../../config.ts";
import { CONTRADICTION_LABELS, type ContradictionProposal } from "../core/contradictions.ts";
import type { ContradictionStore } from "../core/ports.ts";

function isProposal(value: unknown): value is ContradictionProposal {
	if (typeof value !== "object" || value === null) return false;
	const row = value as Partial<ContradictionProposal>;
	return typeof row.id === "string" && typeof row.nodeA === "string" && typeof row.nodeB === "string" && typeof row.statementA === "string" && typeof row.statementB === "string" && typeof row.reason === "string" && CONTRADICTION_LABELS.includes(row.label as ContradictionProposal["label"]);
}

export const contradictionStore: ContradictionStore = {
	readProposals() {
		try {
			const raw = JSON.parse(fs.readFileSync(CONTRADICTIONS_FILE, "utf-8")) as unknown;
			return Array.isArray(raw) ? raw.filter(isProposal) : [];
		} catch {
			return [];
		}
	},
	writeProposals(proposals) {
		fs.mkdirSync(path.dirname(CONTRADICTIONS_FILE), { recursive: true });
		const tmp = `${CONTRADICTIONS_FILE}.tmp`;
		fs.writeFileSync(tmp, `${JSON.stringify(proposals, null, 2)}\n`, "utf-8");
		fs.renameSync(tmp, CONTRADICTIONS_FILE);
	},
};
