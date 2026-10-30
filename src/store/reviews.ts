/**
 * SM-2 ledger at config.REVIEWS_FILE. A JSON array, not nodes.jsonl.
 * Corrupt or missing files read as an empty ledger.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { REVIEWS_FILE } from "../../config.ts";
import type { ReviewRecord } from "../core/sm2.ts";
import type { ReviewStore } from "../core/ports.ts";

function isRecord(value: unknown): value is ReviewRecord {
	if (typeof value !== "object" || value === null) return false;
	const row = value as Partial<ReviewRecord>;
	return typeof row.nodeId === "string" && typeof row.ease === "number" && typeof row.dueAt === "string" && typeof row.intervalDays === "number" && typeof row.repetitions === "number";
}

export const reviewStore: ReviewStore = {
	readReviews() {
		try {
			const raw = JSON.parse(fs.readFileSync(REVIEWS_FILE, "utf-8")) as unknown;
			return Array.isArray(raw) ? raw.filter(isRecord) : [];
		} catch {
			return [];
		}
	},
	writeReviews(records) {
		fs.mkdirSync(path.dirname(REVIEWS_FILE), { recursive: true });
		const tmp = `${REVIEWS_FILE}.tmp`;
		fs.writeFileSync(tmp, `${JSON.stringify(records, null, 2)}\n`, "utf-8");
		fs.renameSync(tmp, REVIEWS_FILE);
	},
};
