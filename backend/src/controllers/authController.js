import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { generatePickerCode } from "../utils/generateCodes.js";
import { ensureUsersTableSchema, safeUserFromRow } from "../utils/userHelpers.js";

const ALLOWED_PICKER_GENDERS = new Set(["MALE", "FEMALE"]);
const ALLOWED_PICKER_AGE_GROUPS = new Set(["Below 18", "18-24", "25-35", "Above 35"]);
const ALLOWED_PICKER_WASTE_TYPES = new Set([
  "PLASTIC",
  "MIXED_RECYCLABLES",
  "ORGANIC",
  "E_WASTE",
  "METAL_CARDBOARD",
]);

const pickerAuthSelectQuery = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.phone,
    u.password_hash,
    u.role,
    u.city,
    u.division,
    u.collection_point_id,
    cp.point_code AS collection_point_point_code,
    cp.name AS collection_point_name,
    cp.division AS collection_point_division,
    cp.agent_name AS collection_point_agent_name,
    cp.agent_phone AS collection_point_agent_phone,
    cp.status AS collection_point_status,
    u.picker_id,
    p.picker_code AS picker_code,
    p.name AS picker_name,
    p.phone AS picker_phone,
    p.gender AS picker_gender,
    p.age_group AS picker_age_group,
    p.division AS picker_division,
    p.main_waste_type AS picker_main_waste_type,
    p.status AS picker_status,
    u.recycler_id,
    r.company_name AS recycler_company_name,
    r.contact_person AS recycler_contact_person,
    r.phone AS recycler_phone,
    r.status AS recycler_status,
    u.status,
    u.created_at,
    u.updated_at
  FROM users u
  LEFT JOIN collection_points cp ON u.collection_point_id = cp.id
  LEFT JOIN pickers p ON u.picker_id = p.id
  LEFT JOIN recyclers r ON u.recycler_id = r.id
`;

const normalizeText = (value) => String(value ?? "").trim();
const normalizeUpperText = (value) => normalizeText(value).toUpperCase();

const loadAuthUserById = async (userId) => {
  const result = await pool.query(`${pickerAuthSelectQuery} WHERE u.id = $1 LIMIT 1`, [userId]);

  if (result.rows.length === 0) {
    return null;
  }

  return safeUserFromRow(result.rows[0]);
};

const ensurePickerRegistrationInputs = ({
  name,
  phone,
  gender,
  ageGroup,
  division,
  mainWasteType,
  password,
  confirmPassword,
}) => {
  if (!name || !phone || !gender || !ageGroup || !division || !mainWasteType || !password || !confirmPassword) {
    return "name, phone, gender, age_group, division, main_waste_type, password, and confirmPassword are required";
  }

  if (!ALLOWED_PICKER_GENDERS.has(gender)) {
    return "Gender must be either MALE or FEMALE";
  }

  if (!ALLOWED_PICKER_AGE_GROUPS.has(ageGroup)) {
    return "Age group must be one of: Below 18, 18-24, 25-35, Above 35";
  }

  if (!ALLOWED_PICKER_WASTE_TYPES.has(mainWasteType)) {
    return "Unsupported main waste type";
  }

  if (password.length < 4) {
    return "Password or PIN must be at least 4 characters";
  }

  if (password !== confirmPassword) {
    return "Password/PIN confirmation does not match";
  }

  return null;
};

export const registerPicker = async (req, res) => {
  const name = normalizeText(req.body?.name);
  const phone = normalizeText(req.body?.phone);
  const gender = normalizeUpperText(req.body?.gender);
  const ageGroup = normalizeText(req.body?.age_group);
  const division = normalizeText(req.body?.division);
  const mainWasteType = normalizeUpperText(req.body?.main_waste_type);
  const password = String(req.body?.password ?? "");
  const confirmPassword = String(req.body?.confirmPassword ?? req.body?.confirm_password ?? "");

  const validationError = ensurePickerRegistrationInputs({
    name,
    phone,
    gender,
    ageGroup,
    division,
    mainWasteType,
    password,
    confirmPassword,
  });

  if (validationError) {
    return sendError(res, validationError, 400);
  }

  try {
    await ensureUsersTableSchema();

    const duplicatePicker = await pool.query("SELECT id FROM pickers WHERE phone = $1 LIMIT 1", [phone]);
    if (duplicatePicker.rows.length > 0) {
      return sendError(res, "Phone number already registered", 400);
    }

    const duplicateUser = await pool.query("SELECT id FROM users WHERE phone = $1 LIMIT 1", [phone]);
    if (duplicateUser.rows.length > 0) {
      return sendError(res, "Phone number already registered", 400);
    }

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const pickerCode = generatePickerCode();
      const pickerResult = await client.query(
        `INSERT INTO pickers (
          picker_code, name, phone, gender, age_group, division, main_waste_type, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
        RETURNING id, picker_code, name, phone, gender, age_group, division, main_waste_type, status`,
        [pickerCode, name, phone, gender, ageGroup, division, mainWasteType]
      );

      const picker = pickerResult.rows[0];
      const passwordHash = await bcrypt.hash(password, 12);
      const normalizedCity = normalizeText(req.body?.city) || "Kampala";

      const userResult = await client.query(
        `INSERT INTO users (
          name, phone, password_hash, role, picker_id, status, city, division
        ) VALUES ($1, $2, $3, 'PICKER', $4, 'ACTIVE', $5, $6)
        RETURNING id`,
        [name, phone, passwordHash, picker.id, normalizedCity, division]
      );

      const authUserResult = await client.query(
        `${pickerAuthSelectQuery} WHERE u.id = $1 LIMIT 1`,
        [userResult.rows[0].id]
      );

      if (authUserResult.rows.length === 0) {
        throw new Error("Failed to load registered picker");
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error("Authentication is not configured");
      }

      const user = safeUserFromRow(authUserResult.rows[0]);
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        secret,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      await client.query("COMMIT");

      return sendSuccess(res, "Picker registered successfully", { token, user }, 201);
    } catch (error) {
      await client.query("ROLLBACK");

      if (error.code === "23505") {
        return sendError(res, "Phone number already registered", 400);
      }

      console.error("[Register Picker Error]", { code: error.code, message: error.message });
      return sendError(res, "Picker registration failed", 500);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Register Picker Error]", { code: error.code, message: error.message });
    return sendError(res, "Picker registration failed", 500);
  }
};

export const login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const loginIdentifier = String(identifier ?? email ?? "").trim();

    if (!loginIdentifier || !password) {
      return sendError(res, "Email or phone and password are required", 400);
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.password_hash, u.status
       FROM users u
       WHERE LOWER(u.email) = $1 OR u.phone = $2
       LIMIT 1`,
      [loginIdentifier.toLowerCase(), loginIdentifier]
    );

    if (result.rows.length === 0) {
      return sendError(res, "Invalid email or password", 401);
    }

    const authRow = result.rows[0];

    if (authRow.status !== "ACTIVE") {
      return sendError(res, "Account is inactive", 403);
    }

    if (!authRow.password_hash) {
      return sendError(res, "Invalid email or password", 401);
    }

    const passwordMatches = await bcrypt.compare(password, authRow.password_hash);
    if (!passwordMatches) {
      return sendError(res, "Invalid email or password", 401);
    }

    const user = await loadAuthUserById(authRow.id);
    if (!user) {
      return sendError(res, "Invalid email or password", 401);
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return sendError(res, "Authentication is not configured", 500);
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return sendSuccess(res, "Login successful", {
      token,
      user,
    });
  } catch (error) {
    console.error("[Auth Login Error]", { code: error.code, message: error.message });
    return sendError(res, "Login failed", 500);
  }
};

export const me = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, "Unauthorized", 401);
    }

    const user = await loadAuthUserById(userId);
    if (!user) {
      return sendError(res, "Unauthorized", 401);
    }

    return sendSuccess(res, "Authenticated user fetched successfully", {
      user,
    });
  } catch (error) {
    console.error("[Auth Me Error]", { code: error.code, message: error.message });
    return sendError(res, "Failed to fetch authenticated user", 500);
  }
};