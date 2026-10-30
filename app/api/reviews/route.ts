import { dueReviewCard, gradeReviewCard } from "@/src/server";

export const dynamic = "force-dynamic";

export function GET() {
	return Response.json({ card: dueReviewCard() });
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => null)) as { nodeId?: unknown; correct?: unknown; confidence?: unknown } | null;
	if (!body || typeof body.nodeId !== "string" || typeof body.correct !== "boolean") {
		return Response.json({ error: "nodeId and correct are required" }, { status: 400 });
	}
	const confidence = typeof body.confidence === "number" ? body.confidence : undefined;
	const result = gradeReviewCard(body.nodeId, body.correct, confidence);
	if (!result) return Response.json({ error: "Unknown proposition" }, { status: 404 });
	return Response.json(result);
}
