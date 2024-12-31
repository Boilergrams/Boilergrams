import { Handlers } from "$fresh/server.ts";
import { getBoilergramfromJSON, getTodaysDate, runBoilergramsMakerScript } from "../../utils/utils.ts";
import { logger } from "../../utils/logger.ts";

export const handler: Handlers = {
	async GET(_req) {
		logger.info("New User!");

		const todaysDate = getTodaysDate();

		// const responseBody = await runBoilergramsMakerScript(todaysDate);
		const responseBody = await getBoilergramfromJSON(todaysDate + 9);

		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	},
};
