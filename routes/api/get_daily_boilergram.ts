import { Handlers } from "$fresh/server.ts";
import { getTodaysDate, runBoilergramsMakerScript } from "../../utils/utils.ts";

export const handler: Handlers = {
	async GET(_req) {
		const todaysDate = getTodaysDate();

		const responseBody = await runBoilergramsMakerScript(todaysDate);

		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	},
};
