/**
 * Opening frames for three study modes. They fill the draft composer.
 * They do not add a session kind: teach and practice stay the only kinds,
 * and the agent that receives the opening follows the frame.
 */

export const PEDAGOGY_MODES = ["pareto", "feynman", "tutor"] as const;
export type PedagogyMode = (typeof PEDAGOGY_MODES)[number];

export interface PedagogyPreset {
	mode: PedagogyMode;
	label: string;
	hint: string;
}

export const PEDAGOGY_PRESETS: readonly PedagogyPreset[] = [
	{
		mode: "pareto",
		label: "Парето",
		hint: "Пять поднавыков на первые два часа",
	},
	{
		mode: "feynman",
		label: "Фейнман",
		hint: "Вы объясняете, учитель ищет пробелы",
	},
	{
		mode: "tutor",
		label: "Репетитор",
		hint: "Вопрос, ваш ответ, затем разбор ошибки",
	},
];

/** A short draft is a topic. A long or multi-line draft is already an opening. */
export function topicFromDraft(text: string): string {
	const topic = text.trim();
	if (!topic || topic.includes("\n") || topic.length > 80) return "";
	return topic;
}

/** The first message for one mode. An empty topic stays as a bracket the learner edits. */
export function pedagogyOpening(mode: PedagogyMode, topic: string): string {
	const subject = topic.trim() || "[тема]";
	switch (mode) {
		case "pareto":
			return `Разложи навык [${subject}] на 5 ключевых поднавыков по правилу Парето для абсолютного новичка. Что нужно освоить за первые 2 часа, чтобы получить приемлемый результат?`;
		case "feynman":
			return `Представь, что тебе 10 лет. Я объясню, как устроено [${subject}], а ты найдёшь ошибки в объяснении и покажешь, где пробелы. Дождись моего объяснения. Сначала не учи.`;
		case "tutor":
			return `Задавай мне практические вопросы по теме [${subject}]. Дождись ответа и после каждого покажи, где я ошибся.`;
	}
}
