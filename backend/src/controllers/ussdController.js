/**
 * USSD Controller for WasteLink Uganda
 * Handles USSD menu flows for feature phone users
 * Returns plain text USSD responses (CON/END format)
 */

import pool from "../config/db.js";
import { normalizePhoneNumber } from "../utils/phone.js";

/**
 * Parse request body - handles both JSON and form-encoded
 */
const parseUSSDRequest = (req) => {
  const body = req.body;

  return {
    sessionId: body.sessionId || body.session_id || "",
    serviceCode: body.serviceCode || body.service_code || "",
    phoneNumber: body.phoneNumber || body.phone_number || "",
    text: body.text || "",
  };
};

/**
 * Get Uganda divisions with IDs
 */
const DIVISIONS = {
  "1": "Kawempe",
  "2": "Makindye",
  "3": "Nakawa",
  "4": "Rubaga",
  "5": "Central",
};

/**
 * Main USSD endpoint handler
 * POST /api/ussd
 */
export const handleUSSD = async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = parseUSSDRequest(req);

    // Validate required fields
    if (!sessionId || !serviceCode || !phoneNumber) {
      return res
        .status(400)
        .type("text/plain")
        .send(
          "END Invalid request. Missing sessionId, serviceCode, or phoneNumber."
        );
    }

    let response;

    // Main menu (when text is empty or only contains separator)
    if (!text || text.trim() === "") {
      response = generateMainMenu();
    } else {
      // Route based on text input
      response = await routeUSSDFlow(text, phoneNumber);
    }

    // Set response header to plain text
    res.set("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send(response);
  } catch (error) {
    console.error("[USSD Error]", error);
    res
      .status(500)
      .type("text/plain")
      .send("END An error occurred. Please try again later.");
  }
};

/**
 * Generate main menu
 */
const generateMainMenu = () => {
  return `CON WasteLink Uganda
1. Register as Picker
2. Log Waste
3. Check Job Status
4. Check Earnings
5. Collection Points`;
};

/**
 * Route USSD flow based on text input
 */
const routeUSSDFlow = async (text, phoneNumber) => {
  const parts = text.split("*");
  const option = parts[0];

  switch (option) {
    case "1":
      return handleRegisterPicker(parts);
    case "2":
      return handleLogWaste(parts);
    case "3":
      return handleCheckJobStatus(parts);
    case "4":
      return handleCheckEarnings(parts);
    case "5":
      return await handleCollectionPoints(parts, phoneNumber);
    default:
      return "END Invalid option. Please try again.";
  }
};

/**
 * Handle Register as Picker flow
 */
const handleRegisterPicker = (parts) => {
  if (parts.length === 1) {
    return `CON Register as Picker
Enter your full name`;
  }

  // TODO: Implement picker registration
  return "END Picker registration is coming soon.";
};

/**
 * Handle Log Waste flow
 */
const handleLogWaste = (parts) => {
  if (parts.length === 1) {
    return `CON Log Waste
Enter your PIN`;
  }

  // TODO: Implement waste logging
  return "END Waste logging is coming soon.";
};

/**
 * Handle Check Job Status flow
 */
const handleCheckJobStatus = (parts) => {
  if (parts.length === 1) {
    return `CON Check Job Status
1. Latest Job
2. Enter Job Code`;
  }

  const subOption = parts[1];
  switch (subOption) {
    case "1":
      // TODO: Implement latest job lookup
      return "END Your latest job status will be shown here.";
    case "2":
      return `CON Enter Job Code`;
    default:
      return "END Invalid option.";
  }
};

/**
 * Handle Check Earnings flow
 */
const handleCheckEarnings = (parts) => {
  if (parts.length === 1) {
    return `CON Check Earnings
Enter your PIN`;
  }

  // TODO: Implement earnings lookup
  return "END Your earnings will be shown here.";
};

/**
 * Handle Collection Points lookup flow
 */
const handleCollectionPoints = async (parts, phoneNumber) => {
  // Step 1: Show division selection menu
  if (parts.length === 1) {
    return `CON Select Division
1. Kawempe
2. Makindye
3. Nakawa
4. Rubaga
5. Central`;
  }

  // Step 2: Show collection points for selected division
  if (parts.length === 2) {
    const divisionId = parts[1];
    const division = DIVISIONS[divisionId];

    if (!division) {
      return "END Invalid division. Please try again.";
    }

    try {
      const collectionPoints = await getCollectionPointsByDivision(division);

      if (collectionPoints.length === 0) {
        return `END No active collection points found in ${division}.`;
      }

      // Format response with collection points
      let response = `END Collection Points in ${division}:\n`;
      collectionPoints.forEach((cp, index) => {
        response += `${index + 1}. ${cp.name}\n`;
        if (cp.agent_phone) {
          response += `Agent: ${getShortPhoneFormat(cp.agent_phone)}\n`;
        }
      });

      return response;
    } catch (error) {
      console.error("[Collection Points Error]", error);
      return "END Error fetching collection points. Please try again.";
    }
  }

  return "END Invalid selection.";
};

/**
 * Get collection points by division from database
 */
const getCollectionPointsByDivision = async (division) => {
  try {
    const result = await pool.query(
      `SELECT id, point_code, name, division, agent_name, agent_phone, status
       FROM collection_points
       WHERE division = $1 AND status = 'ACTIVE'
       ORDER BY name ASC
       LIMIT 10`,
      [division]
    );

    return result.rows;
  } catch (error) {
    console.error("[DB Error - Collection Points]", error);
    throw error;
  }
};

/**
 * Get short phone format for display
 */
const getShortPhoneFormat = (phone) => {
  if (!phone) return "N/A";
  const str = String(phone);
  if (str.length >= 4) {
    return "0..." + str.slice(-4);
  }
  return str;
};

export default {
  handleUSSD,
  routeUSSDFlow,
  DIVISIONS,
};
