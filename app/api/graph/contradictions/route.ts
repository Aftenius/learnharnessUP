import { listContradictions, scanContradictionProposals, setContradictionLabel } from "@/src/server";
import { CONTRADICTION_LABELS, type ContradictionLabel } from "@/src/core";

export const dynamic = "force-dynamic";

export function GET() {
	return Response.json({ proposals: listContradictions() });
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as { scan?: unknown; id?: unknown; label?: unknown } | null;
	if (body?.scan === true) return Response.json({ proposals: scanContradictionProposals() });
	if (typeof body?.id === "string" && typeof body.label === "string" && CONTRADICTION_LABELS.includes(body.label as ContradictionLabel)) {
		const proposals = setContradictionLabel(body.id, body.label as ContradictionLabel);
		if (!proposals) return Response.json({ error: "Unknown proposal" }, { status: 404 });
		return Response.json({ proposals });
	}
	return Response.json({ error: "scan or id and label are required" }, { status: 400 });
}
