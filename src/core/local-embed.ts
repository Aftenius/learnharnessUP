/**
 * In-process retrieval over proposition text.
 * The bundled embedder is a local feature hash: no network, no lesson cache.
 * It ranks nodes for the prober and practice tools. It does not replace
 * the auditor's glob `find`.
 */

export const LOCAL_EMBED_DIMS = 256;

export interface RankedNode {
	id: string;
	name: string;
	statement: string;
	score: number;
}

function hashToken(token: string): number {
	let h = 2166136261;
	for (let i = 0; i < token.length; i++) {
		h ^= token.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

function tokensOf(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, " ")
		.split(/\s+/)
		.filter((word) => word.length > 1);
}

/** Unit-length feature hash of the text, including neighbor-word pairs. */
export function localEmbed(text: string, dims = LOCAL_EMBED_DIMS): Float32Array {
	const vector = new Float32Array(dims);
	const tokens = tokensOf(text);
	const add = (token: string) => {
		const h = hashToken(token);
		const index = h % dims;
		vector[index] = (vector[index] ?? 0) + ((h & 1) === 0 ? 1 : -1);
	};
	for (let i = 0; i < tokens.length; i++) {
		add(tokens[i]!);
		if (i + 1 < tokens.length) add(`${tokens[i]}_${tokens[i + 1]}`);
	}
	let norm = 0;
	for (const value of vector) norm += value * value;
	norm = Math.sqrt(norm);
	if (norm > 0) {
		for (let i = 0; i < vector.length; i++) vector[i] = (vector[i] ?? 0) / norm;
	}
	return vector;
}

export function cosine(a: Float32Array, b: Float32Array): number {
	const n = Math.min(a.length, b.length);
	let sum = 0;
	for (let i = 0; i < n; i++) sum += (a[i] ?? 0) * (b[i] ?? 0);
	return sum;
}

/** Top matches by cosine. Ties keep input order. Score 0 is omitted. */
export function rankNodes(
	nodes: readonly { id: string; name: string; statement: string }[],
	query: string,
	limit = 8,
): RankedNode[] {
	const probe = localEmbed(query);
	const ranked: RankedNode[] = [];
	for (const node of nodes) {
		const score = cosine(probe, localEmbed(`${node.name}\n${node.statement}`));
		if (score <= 0) continue;
		ranked.push({ id: node.id, name: node.name, statement: node.statement, score });
	}
	ranked.sort((a, b) => b.score - a.score);
	return ranked.slice(0, limit);
}
