import { Handlers } from "$fresh/server.ts";
import { getTodaysDate, runBoilergramsMakerScript } from "../../utils/utils.ts";
import { logger } from "../../utils/logger.ts";

export const handler: Handlers = {
	async GET(_req) {

		logger.info("New User!");

		const todaysDate = getTodaysDate();

		// const responseBody = await runBoilergramsMakerScript(todaysDate);
		const responseBody = {
			"dimensions": [
				8,
				7
			],
			"data": "mUsCLE3N5RaTHer2p5eSTAtE2H4pRotEST2T4"
		}

		return new Response(JSON.stringify(responseBody), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	},
};
