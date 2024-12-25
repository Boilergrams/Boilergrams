import { createLogger, format, Logger, transports } from "npm:winston";

const logLevel = "info";
const logFilePath = "./logs/log.log";

const formatTimestamp = (): string => {
	return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	}).format(new Date());
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


