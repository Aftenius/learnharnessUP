/**
 * SSR pins — abort-turn-dialog (ESC-abort guard, owner 2026-10-02):
 * the confirm popup EVERYWHERE ruling. AbortTurnBody is the pure seam
 * (the DeleteNodeBody pattern); the wrapper owns effects + portal.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AbortTurnBody } from "@/components/abort-turn-dialog";

describe("AbortTurnBody", () => {
	it("turn mode: names the turn, the partial-stays promise, Abort", () => {
		const html = renderToStaticMarkup(
			<AbortTurnBody mode="turn" onClose={() => {}} onConfirm={() => {}} />,
		);
		assert.ok(html.includes('data-testid="abort-turn-dialog"'));
		assert.match(html, /Прервать этот вызов\?/);
		assert.match(html, /Частичный ответ остаётся в стенограмме\./);
		assert.match(html, /Отмена/);
		assert.match(html, /Прервать/);
	});

	it("question mode: names the dismissal, the skip, Dismiss", () => {
		const html = renderToStaticMarkup(
			<AbortTurnBody mode="question" onClose={() => {}} onConfirm={() => {}} />,
		);
		assert.match(html, /Скрыть этот вопрос\?/);
		assert.match(html, /Пропущено — преподаватель идёт дальше без него\./);
		assert.match(html, /Скрыть/);
		// the abort copy must not leak into the dismissal mode
		assert.ok(!html.includes("Abort this turn"));
	});

	it("the confirm action is the destructive pair, never the cancel", () => {
		const html = renderToStaticMarkup(
			<AbortTurnBody mode="turn" onClose={() => {}} onConfirm={() => {}} />,
		);
		const confirmAt = html.indexOf('data-testid="abort-turn-confirm"');
		const cancelAt = html.indexOf('data-testid="abort-turn-cancel"');
		assert.ok(confirmAt > -1 && cancelAt > -1);
		const confirmBtn = html.slice(confirmAt, html.indexOf("</button>", confirmAt));
		assert.match(confirmBtn, /destructive/);
		const cancelBtn = html.slice(cancelAt, html.indexOf("</button>", cancelAt));
		assert.ok(!cancelBtn.includes("destructive"));
	});
});
