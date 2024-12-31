import { createLogger, format, Logger, transports } from "npm:winston";

const logLevel = "info";
const logFilePath = "./logs/log.log";

const formatTimestamp = (): string => {
	return new Date().toLocaleString();
};

export const logger: Logger = createLogger({
	level: logLevel,
	format: format.combine(
		format.timestamp({
			format: formatTimestamp,
		}),
		format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`),
	),
	transports: [
		new transports.File({ filename: logFilePath, options: { flags: "a" } }),
	],
});
