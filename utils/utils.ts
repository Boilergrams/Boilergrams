export const host = "https://boilergrams.deno.dev/"
// export const host = "http://localhost:8000/"

export async function runBoilergramsMakerScript(seed: number): Promise<string> {
	const scriptPath = "./utils/boilergrams_maker/boilergrams.py";

	const process = new Deno.Command("python3", {
		args: [scriptPath, String(seed)],
		stdout: "piped", // Capture stdout
		stderr: "piped", // Capture stderr
	});

	const { stdout, stderr } = await process.output();

	const errorOutput = new TextDecoder().decode(stderr);
	if (errorOutput.length > 0) {
		throw new Error(errorOutput);
	}

	const output = new TextDecoder().decode(stdout);
	return JSON.parse(output);
}

export function getTodaysDate(): number {
	return Number(new Date().toISOString().split("T")[0].replace(/-/g, ""));
}

export function isDigit(str: string): boolean {
	return /^[0-9]$/.test(str);
}

export function isUpperCase(char: string): boolean {
	return char === char.toUpperCase() && char !== char.toLowerCase();
}

export function isLowerCase(char: string): boolean {
	return char === char.toLowerCase() && char !== char.toUpperCase();
}

function seededRandom(seed: number): () => number {
	let state = seed % 2147483647;
	if (state <= 0) state += 2147483646;

	return function () {
		state = (state * 16807) % 2147483647;
		return (state - 1) / 2147483646;
	};
}

export function randomizeString(input: string, seed: number): string {
	const charArray = input.split("");
	const random = seededRandom(seed);

	for (let i = charArray.length - 1; i > 0; i--) {
		const j = Math.floor(random() * (i + 1));
		[charArray[i], charArray[j]] = [charArray[j], charArray[i]];
	}

	return charArray.join("");
}

export function seconds_to_display_string(seconds: number): string {
	if (seconds < 60) {
		return `${seconds}s`;
	}
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
