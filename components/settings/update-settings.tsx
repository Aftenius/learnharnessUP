"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BrailleSpinner } from "@/components/braille-spinner";
import { SettingsRow, Toggle } from "./controls.tsx";

/** Observational snapshot from electron/main.cjs; never updater permission. */
export type UpdateState = {
	status: "idle" | "checking" | "downloading" | "up-to-date" | "downloaded" | "error" | "disabled";
	version: string | null;
	revision: number;
};

export const APP_VERSION = process.env.LH_VERSION ?? "";
const HOMEPAGE = process.env.LH_HOMEPAGE ?? "";
export const MANUAL_UPDATE_HINT = "Проверка скачивает доступные обновления. Скачанные обновления устанавливаются при выходе из приложения.";
export const AUTO_UPDATE_HINT = "Проверка при запуске и каждые 24 часа. Выключение не останавливает обновления, которые уже идут или готовы к установке.";
const UPDATE_ERROR = "Не удалось проверить обновления. Попробуйте позже.";

/** Subscribe before requesting the snapshot. IPC replies and pushes can
 * cross; a revision prevents an older reply from hiding a newer event.
 * The banner shares this read-only observer so late loads recover too. */
export function useUpdateState() {
	const [state, setState] = useState<UpdateState | null>(null);
	const [failed, setFailed] = useState(false);
	useEffect(() => {
		const lh = window.lh;
		if (!lh) return;
		let live = true;
		let revision = -1;
		const accept = (next: UpdateState) => {
			if (!live || next.revision < revision) return;
			revision = next.revision;
			setState(next);
			setFailed(false);
		};
		const off = lh.onUpdateStatus?.(accept);
		void lh.getUpdateState?.().then(accept).catch(() => {
			if (live && revision === -1) setFailed(true);
		});
		return () => { live = false; off?.(); };
	}, []);
	return { state, failed };
}

export function updateStatusText(state: UpdateState | null): string | null {
	switch (state?.status) {
		case "checking": return "Проверка обновлений…";
		case "downloading": return state.version ? `Загрузка версии ${state.version}…` : "Загрузка обновления…";
		case "up-to-date": return "При последней проверке более новой версии не найдено.";
		case "downloaded":
			return state.version
				? `Версия ${state.version} готова. Она установится при выходе из приложения.`
				: "Обновление готово. Оно установится при выходе из приложения.";
		case "error": return UPDATE_ERROR;
		default: return null;
	}
}

/** Version information is useful everywhere; update controls only belong
 * to a shell with an available updater. Opening this row never checks. */
export function UpdateSettings({
	autoUpdate,
	onAutoUpdateChange,
	version = APP_VERSION,
	homepage = HOMEPAGE,
}: {
	autoUpdate: boolean;
	onAutoUpdateChange: (on: boolean) => void;
	version?: string;
	homepage?: string;
}) {
	const { state, failed } = useUpdateState();
	const [checkFailed, setCheckFailed] = useState(false);
	useEffect(() => setCheckFailed(false), [state]);
	const active = state !== null && state.status !== "disabled";
	const busy = state?.status === "checking" || state?.status === "downloading";
	const status = state?.status === "downloaded" ? updateStatusText(state)
		: failed || checkFailed ? UPDATE_ERROR : updateStatusText(state);
	const releaseNotes = version && homepage ? `${homepage}/releases/tag/v${version}` : null;
	const check = () => {
		setCheckFailed(false);
		void window.lh?.checkForUpdates?.().catch(() => setCheckFailed(true));
	};

	return (
		<>
			<SettingsRow
				label={`Версия ${version || "неизвестна"}`}
				testid="row-version"
				hint={
					<>
						{status && <span className="block" role="status" data-testid="update-status">{status}</span>}
						{active && <span className="block">{MANUAL_UPDATE_HINT}</span>}
						{releaseNotes && <a href={releaseNotes} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-foreground hover:underline" data-testid="release-notes">Заметки о выпуске</a>}
					</>
				}
			>
				{active && (state.status === "downloaded" ? (
					<Button type="button" size="xs" className="cursor-pointer" data-testid="update-restart" onClick={() => window.lh?.installUpdate?.()}>Перезапустить</Button>
				) : (
					<Button type="button" size="xs" variant="outline" className="cursor-pointer disabled:cursor-not-allowed" data-testid="update-check" disabled={busy} aria-busy={busy} onClick={check}>
						{busy && <BrailleSpinner label={state.status === "downloading" ? "Загрузка обновления" : "Проверка обновлений"} />}
						Проверить обновления
					</Button>
				))}
			</SettingsRow>
			{active && (
				<SettingsRow label="Автообновление" hint={AUTO_UPDATE_HINT} testid="row-auto-update">
					<Toggle checked={autoUpdate} label="автообновление" testid="toggle-auto-update" onChange={onAutoUpdateChange} />
				</SettingsRow>
			)}
		</>
	);
}
