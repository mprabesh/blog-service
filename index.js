/**
 * Blog Application Server Entry Point
 * 
 * This file serves as the main entry point for the Node.js/Express backend server.
 * It imports the configured Express application and starts the server on the specified port.
 * 
 * Dependencies:
 * - app: The configured Express application with all middleware and routes
 * - config: Environment configuration (PORT, MongoDB URL)
 * - logger: Structured logging utility for server events
 */

const app = require("./app");
const { PORT, mongoURL } = require("./utils/config");
const { info } = require("./utils/logger");

/**
 * Start the Express server
 * 
 * Binds the server to the configured port and logs the startup information.
 * The server will begin accepting HTTP requests once this function executes.
 * 
 * @listens {number} PORT - The port number from environment variables or default
 */
app.listen(PORT, () => {
  info(`Listening to port ${PORT} and DB URL is ${mongoURL}`);
});
