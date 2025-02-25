import fetch from "node-fetch";
import querystring from "querystring";
import fs from "fs";
import path from "path";

/**
 * Sends a POST request to an API with application/x-www-form-urlencoded data
 * @param {string} endpoint - The API endpoint URL
 * @param {Object} dynamicVariables - An object containing dynamic variables to send
 * @param {number} duration - The duration of the call in seconds
 * @returns {Promise<Object>} - The API response
 */
export async function sendPostRequest(endpoint, dynamicVariables, duration) {
  try {
    const formData = querystring.stringify({
      ...dynamicVariables,
      duration,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    logError(`API request error: ${error.message}`);
    throw error;
  }
}

/**
 * Logs errors to a text file
 * @param {string} errorMessage - The error message to log
 */
export function logError(errorMessage) {
  const logFilePath = path.join(process.cwd(), "error_log.txt");
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${errorMessage}\n`;

  fs.appendFile(logFilePath, logMessage, (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
    }
  });
}
