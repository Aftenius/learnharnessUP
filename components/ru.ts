/** Russian count phrase: 1 утверждение, 2 утверждения, 5 утверждений. */
export function ruCount(n: number, one: string, few: string, many: string): string {
	const n10 = n % 10;
	const n100 = n % 100;
	if (n10 === 1 && n100 !== 11) return `${n} ${one}`;
	if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} ${few}`;
	return `${n} ${many}`;
}
