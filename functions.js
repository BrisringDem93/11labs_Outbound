import fetch from "node-fetch";
import querystring from "querystring";
import fs from "fs";
import path from "path";

/**
 * Sends a POST request to an API with application/x-www-form-urlencoded data
 * If the request fails, it retries with a backup endpoint.
 * @param {string} primaryEndpoint - The primary API endpoint URL
 * @param {Object} dynamicVariables - An object containing dynamic variables to send
 * @param {number} duration - The duration of the call in seconds
 * @param {string} conversationId - The ID of the conversation
 * @param {string} [backupEndpoint] - The backup API endpoint URL (optional)
 * @returns {Promise<Object>} - The API response
 */
export async function sendPostRequest(primaryEndpoint, dynamicVariables, duration, conversationId, backupEndpoint = null) {
  try {
    const formData = querystring.stringify({
      ...dynamicVariables,
      duration,
      conversation_id: conversationId, // Added conversationId as a parameter
    });

    // First attempt with the primary endpoint
    return await attemptRequest(primaryEndpoint, formData, false, backupEndpoint);
  } catch (error) {
    logError(`Primary API request failed: ${error.message}`);

    // Retry with the backup endpoint if available
    if (backupEndpoint) {
      try {
        console.log("[API] Retrying with backup endpoint...");
        return await attemptRequest(backupEndpoint, formData, true);
      } catch (backupError) {
        logError(`Backup API request failed: ${backupError.message}`);
        throw new Error("Both primary and backup API requests failed.");
      }
    } else {
      throw error; // No backup available, rethrow the error
    }
  }
}

/**
 * Attempts to send a POST request and handles response parsing.
 * @param {string} endpoint - The API endpoint URL
 * @param {string} formData - The URL-encoded form data
 * @param {boolean} isRetry - Whether this is a retry attempt
 * @param {string} [backupEndpoint] - The backup API endpoint URL (optional)
 * @returns {Promise<Object>} - The API response
 */
async function attemptRequest(endpoint, formData, isRetry, backupEndpoint = null) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
    }

    // Check content type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else {
      // If response is not JSON, return plain text as a fallback
      const textResponse = await response.text();
      return { success: true, message: textResponse };
    }
  } catch (error) {
    if (isRetry) {
      logError(`Backup API request error: ${error.message}`);
      throw error;
    } else {
      throw error; // Will be caught in sendPostRequest to trigger backup
    }
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
