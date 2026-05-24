import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const baseUrl = process.env.BASE_URL || "https://wastelink-3lgu.onrender.com/api";

async function prompt(question) {
  const rl = createInterface({ input, output });
  try {
    const answer = await rl.question(question);
    return answer.trim();
  } finally {
    rl.close();
  }
}

async function promptSecret(question) {
  output.write(question);
  const wasRaw = input.isRaw;
  if (input.isTTY) {
    input.setRawMode(true);
  }
  input.resume();

  let value = "";

  try {
    while (true) {
      const chunk = await new Promise((resolve) => input.once("data", resolve));
      const text = chunk.toString("utf8");

      if (text === "\r" || text === "\n" || text === "\r\n") {
        output.write("\n");
        break;
      }

      if (text === "\u0003") {
        throw new Error("Cancelled");
      }

      if (text === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          output.write("\b \b");
        }
        continue;
      }

      value += text;
      output.write("*");
    }
  } finally {
    if (input.isTTY) {
      input.setRawMode(Boolean(wasRaw));
    }
  }

  return value.trim();
}

async function req(method, path, body, token) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { status: res.status, json };
}

function must(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const email = (await prompt("Super admin email: ")).trim();
const password = (await promptSecret("Super admin password: ")).trim();
must(email && password, "Email and password are required");

const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

console.log(`Using base URL: ${baseUrl}`);

const adminLogin = await req("POST", "/auth/login", { email, password });
must(adminLogin.status === 200, `admin login failed: ${JSON.stringify(adminLogin.json)}`);
const adminToken = adminLogin.json?.data?.token;
must(adminToken, "admin token missing");

const cpA = await req("POST", "/collection-points", {
  name: `Smoke Point A ${unique}`,
  division: "Smoke Division",
  agent_name: `Agent A ${unique}`,
  agent_phone: `090${Date.now().toString().slice(-8)}`,
  status: "ACTIVE",
}, adminToken);
must(cpA.status === 201, `cpA failed: ${JSON.stringify(cpA.json)}`);

const cpB = await req("POST", "/collection-points", {
  name: `Smoke Point B ${unique}`,
  division: "Smoke Division",
  agent_name: `Agent B ${unique}`,
  agent_phone: `091${Date.now().toString().slice(-8)}`,
  status: "ACTIVE",
}, adminToken);
must(cpB.status === 201, `cpB failed: ${JSON.stringify(cpB.json)}`);

const picker = await req("POST", "/pickers", {
  name: `Smoke Picker ${unique}`,
  phone: `080${Date.now().toString().slice(-8)}`,
  gender: "MALE",
  age_group: "18-25",
  division: "Smoke Division",
  main_waste_type: "Plastics",
}, adminToken);
must(picker.status === 201, `picker failed: ${JSON.stringify(picker.json)}`);

const agentEmail = `smoke.agent.${unique}@example.com`;
const agentPassword = `SmokePass!${unique}`;
const agentUser = await req("POST", "/users", {
  name: `Smoke Agent ${unique}`,
  email: agentEmail,
  phone: `070${Date.now().toString().slice(-8)}`,
  password: agentPassword,
  role: "AGENT",
  city: "Smoke City",
  division: "Smoke Division",
  collection_point_id: cpA.json.data.id,
  status: "ACTIVE",
}, adminToken);
must(agentUser.status === 201, `agent user failed: ${JSON.stringify(agentUser.json)}`);

const agentLogin = await req("POST", "/auth/login", { identifier: agentEmail, password: agentPassword });
must(agentLogin.status === 200, `agent login failed: ${JSON.stringify(agentLogin.json)}`);
const agentToken = agentLogin.json?.data?.token;
must(agentToken, "agent token missing");

const agentMe = await req("GET", "/auth/me", null, agentToken);
must(agentMe.status === 200, `agent me failed: ${JSON.stringify(agentMe.json)}`);
const assignedPoint = agentMe.json?.data?.user?.collection_point;
must(assignedPoint?.id === cpA.json.data.id, `assigned collection point mismatch: ${JSON.stringify(assignedPoint)}`);

const logA = await req("POST", "/waste-logs", {
  picker_id: picker.json.data.id,
  collection_point_id: cpA.json.data.id,
  waste_type: "PLASTIC",
  estimated_kg: 12.5,
  notes: "smoke assigned",
}, adminToken);
must(logA.status === 201, `logA failed: ${JSON.stringify(logA.json)}`);

const logB = await req("POST", "/waste-logs", {
  picker_id: picker.json.data.id,
  collection_point_id: cpB.json.data.id,
  waste_type: "PAPER",
  estimated_kg: 7.25,
  notes: "smoke other",
}, adminToken);
must(logB.status === 201, `logB failed: ${JSON.stringify(logB.json)}`);

const verifyA = await req("PATCH", `/waste-logs/${logA.json.data.id}/verify`, { verified_kg: 12.5 }, agentToken);
must(verifyA.status === 200, `assigned verify failed: ${JSON.stringify(verifyA.json)}`);

const verifyB = await req("PATCH", `/waste-logs/${logB.json.data.id}/verify`, { verified_kg: 7.25 }, agentToken);
must(verifyB.status === 403, `cross-point verify should be 403: ${JSON.stringify(verifyB.json)}`);

const rejectB = await req("PATCH", `/waste-logs/${logB.json.data.id}/reject`, { reason: "wrong point" }, agentToken);
must(rejectB.status === 403, `cross-point reject should be 403: ${JSON.stringify(rejectB.json)}`);

console.log(JSON.stringify({
  adminLogin: adminLogin.status,
  agentLogin: agentLogin.status,
  verifyA: verifyA.status,
  verifyB: verifyB.status,
  rejectB: rejectB.status,
}, null, 2));