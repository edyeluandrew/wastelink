/**
 * USSD Routes for WasteLink Uganda
 * Handles feature phone USSD menu flows
 */

import { Router } from "express";
import { handleUSSD } from "../controllers/ussdController.js";

const router = Router();

/**
 * POST /api/ussd
 * Main USSD endpoint
 *
 * Accepts:
 * - application/json
 * - application/x-www-form-urlencoded
 *
 * Request body:
 * {
 *   sessionId: string (unique session identifier)
 *   serviceCode: string (USSD service code, e.g., "*123#")
 *   phoneNumber: string (user's phone number)
 *   text: string (menu navigation text, separated by *)
 * }
 *
 * Response:
 * Plain text USSD response starting with CON or END
 */
router.post("/", handleUSSD);

export default router;
