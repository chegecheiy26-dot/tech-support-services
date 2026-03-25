const DEFAULT_OWNER_EMAIL = "chegekeith4@gmail.com";
const PASSWORD_ITERATIONS = 210000;
const encoder = new TextEncoder();

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders(),
  });
}

function nowIso() {
  return new Date().toISOString();
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex) {
  if (!hex || hex.length % 2 !== 0) {
    return new Uint8Array();
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < hex.length; index += 2) {
    bytes[index / 2] = Number.parseInt(hex.slice(index, index + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function createId(byteLength = 16) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return bytesToHex(bytes);
}

async function derivePasswordHash(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PASSWORD_ITERATIONS,
    },
    key,
    256,
  );

  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

async function verifyPassword(password, storedHash) {
  const [algorithm, iterationsValue, saltHex, hashHex] = String(storedHash || "").split("$");
  if (algorithm !== "pbkdf2_sha256") {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations) || !saltHex || !hashHex) {
    return false;
  }

  const salt = hexToBytes(saltHex);
  const expected = hexToBytes(hashHex);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    expected.length * 8,
  );

  return constantTimeEqual(new Uint8Array(bits), expected);
}

function sanitizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    full_name: row.full_name,
    phone: row.phone,
    avatar_url: row.avatar_url,
    bio: row.bio,
    company: row.company,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function ownerEmailFor(env) {
  return String(env.OWNER_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
}

function isOwner(user, env) {
  return Boolean(user?.email) && user.email.trim().toLowerCase() === ownerEmailFor(env);
}

function getToken(request) {
  const authHeader = request.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice(7);
}

async function readBody(request) {
  const text = await request.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}

async function allRows(env, query, bindings = []) {
  const result = await env.DB.prepare(query).bind(...bindings).all();
  return result.results || [];
}

async function firstRow(env, query, bindings = []) {
  return env.DB.prepare(query).bind(...bindings).first();
}

async function runQuery(env, query, bindings = []) {
  return env.DB.prepare(query).bind(...bindings).run();
}

async function cleanupExpiredSessions(env) {
  await runQuery(env, "DELETE FROM sessions WHERE expires_at <= ?", [nowIso()]);
}

async function getSession(env, request) {
  const token = getToken(request);
  if (!token) {
    return null;
  }

  const session = await firstRow(
    env,
    `
      SELECT
        s.token,
        s.expires_at,
        u.id,
        u.email,
        u.username,
        u.full_name,
        u.phone,
        u.avatar_url,
        u.bio,
        u.company,
        u.created_at,
        u.updated_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ?
    `,
    [token],
  );

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await runQuery(env, "DELETE FROM sessions WHERE token = ?", [token]);
    return null;
  }

  return {
    token,
    user: sanitizeUser(session),
  };
}

async function requireAuth(env, request) {
  const session = await getSession(env, request);
  if (!session) {
    return { error: json({ error: "Unauthorized" }, 401) };
  }
  return { session };
}

async function requireOwner(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth;
  }

  if (!isOwner(auth.session.user, env)) {
    return { error: json({ error: "Owner access required." }, 403) };
  }

  return auth;
}

function isMissingTableError(error) {
  return Boolean(error) && typeof error.message === "string" && error.message.includes("no such table");
}

async function handleHealth(env) {
  return json({
    ok: true,
    ownerEmail: ownerEmailFor(env),
    emailNotificationsEnabled: false,
    database: "cloudflare-d1",
  });
}

async function handleSignup(env, request) {
  const body = await readBody(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const username = String(body.username || "").trim();
  const fullName = String(body.fullName || "").trim();

  if (!email || !password || !username || !fullName) {
    return json({ error: "Email, password, username, and full name are required." }, 400);
  }
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, 400);
  }
  if (username.length < 3) {
    return json({ error: "Username must be at least 3 characters." }, 400);
  }

  if (await firstRow(env, "SELECT id FROM users WHERE email = ?", [email])) {
    return json({ error: "An account with that email already exists." }, 409);
  }
  if (await firstRow(env, "SELECT id FROM users WHERE username = ?", [username])) {
    return json({ error: "That username is already taken." }, 409);
  }

  const id = createId();
  const createdAt = nowIso();
  const passwordHash = await hashPassword(password);

  await runQuery(
    env,
    `
      INSERT INTO users (
        id, email, password_hash, username, full_name, phone, avatar_url, bio, company, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '', '', '', '', ?, ?)
    `,
    [id, email, passwordHash, username, fullName, createdAt, createdAt],
  );

  const token = createId(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await runQuery(
    env,
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [token, id, expiresAt, createdAt],
  );

  const user = await firstRow(
    env,
    `
      SELECT id, email, username, full_name, phone, avatar_url, bio, company, created_at, updated_at
      FROM users
      WHERE id = ?
    `,
    [id],
  );

  const profile = sanitizeUser(user);
  return json({ token, user: { id: user.id, email: user.email }, profile }, 201);
}

async function handleSignin(env, request) {
  const body = await readBody(request);
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return json({ error: "Email and password are required." }, 400);
  }

  const user = await firstRow(
    env,
    `
      SELECT id, email, password_hash, username, full_name, phone, avatar_url, bio, company, created_at, updated_at
      FROM users
      WHERE email = ?
    `,
    [email],
  );

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return json({ error: "Invalid email or password." }, 401);
  }

  const token = createId(32);
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await runQuery(
    env,
    "INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [token, user.id, expiresAt, createdAt],
  );

  const profile = sanitizeUser(user);
  return json({ token, user: { id: user.id, email: user.email }, profile });
}

async function handleSignout(env, request) {
  const token = getToken(request);
  if (token) {
    await runQuery(env, "DELETE FROM sessions WHERE token = ?", [token]);
  }
  return json({ success: true });
}

async function handleMe(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  return json({
    user: { id: auth.session.user.id, email: auth.session.user.email },
    profile: auth.session.user,
  });
}

async function handleProfileUpdate(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readBody(request);
  const username = String(body.username || "").trim();
  const fullName = String(body.full_name || "").trim();
  const phone = String(body.phone || "").trim();
  const bio = String(body.bio || "").trim();
  const company = String(body.company || "").trim();

  if (!username || !fullName) {
    return json({ error: "Username and full name are required." }, 400);
  }

  const existingUser = await firstRow(env, "SELECT id FROM users WHERE username = ?", [username]);
  if (existingUser && existingUser.id !== auth.session.user.id) {
    return json({ error: "That username is already taken." }, 409);
  }

  await runQuery(
    env,
    `
      UPDATE users
      SET username = ?, full_name = ?, phone = ?, bio = ?, company = ?, updated_at = ?
      WHERE id = ?
    `,
    [username, fullName, phone, bio, company, nowIso(), auth.session.user.id],
  );

  const updated = await firstRow(
    env,
    `
      SELECT id, email, username, full_name, phone, avatar_url, bio, company, created_at, updated_at
      FROM users
      WHERE id = ?
    `,
    [auth.session.user.id],
  );

  return json({ profile: sanitizeUser(updated) });
}

async function handlePasswordUpdate(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readBody(request);
  const password = String(body.password || "");
  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, 400);
  }

  const passwordHash = await hashPassword(password);
  await runQuery(
    env,
    "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
    [passwordHash, nowIso(), auth.session.user.id],
  );

  return json({ success: true });
}

async function handleConsultationCreate(env, request) {
  const body = await readBody(request);
  const fullName = String(body.full_name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const service = String(body.service || "").trim();
  const message = String(body.message || "").trim();
  const status = String(body.status || "pending").trim() || "pending";
  const session = await getSession(env, request);

  if (!fullName || !email || !service || !message) {
    return json({ error: "Name, email, service, and message are required." }, 400);
  }

  const consultation = {
    id: createId(),
    user_id: session?.user.id || null,
    full_name: fullName,
    email,
    phone,
    service,
    message,
    status,
    created_at: nowIso(),
  };

  await runQuery(
    env,
    `
      INSERT INTO consultations (id, user_id, full_name, email, phone, service, message, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      consultation.id,
      consultation.user_id,
      consultation.full_name,
      consultation.email,
      consultation.phone,
      consultation.service,
      consultation.message,
      consultation.status,
      consultation.created_at,
    ],
  );

  return json({ consultation, notification: { enabled: false, sent: false } }, 201);
}

async function handleConsultationList(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  const consultations = await allRows(
    env,
    `
      SELECT id, full_name, email, phone, service, message, status, created_at
      FROM consultations
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `,
    [auth.session.user.id],
  );

  return json({ consultations });
}

async function handleAdminConsultationList(env, request) {
  const auth = await requireOwner(env, request);
  if (auth.error) {
    return auth.error;
  }

  const consultations = await allRows(
    env,
    `
      SELECT id, user_id, full_name, email, phone, service, message, status, created_at
      FROM consultations
      ORDER BY datetime(created_at) DESC
    `,
  );

  return json({ consultations, ownerEmail: ownerEmailFor(env) });
}

async function handleConsultationStatusUpdate(env, request, id) {
  const auth = await requireOwner(env, request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readBody(request);
  const status = String(body.status || "").trim();
  const allowedStatuses = new Set(["pending", "in_progress", "completed", "cancelled"]);

  if (!allowedStatuses.has(status)) {
    return json({ error: "Invalid consultation status." }, 400);
  }

  await runQuery(env, "UPDATE consultations SET status = ? WHERE id = ?", [status, id]);
  const consultation = await firstRow(
    env,
    `
      SELECT id, user_id, full_name, email, phone, service, message, status, created_at
      FROM consultations
      WHERE id = ?
    `,
    [id],
  );

  if (!consultation) {
    return json({ error: "Consultation not found." }, 404);
  }

  return json({ consultation });
}

async function handleSavedServicesList(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  const savedServices = await allRows(
    env,
    `
      SELECT id, service_title, service_category, service_description, saved_at
      FROM saved_services
      WHERE user_id = ?
      ORDER BY datetime(saved_at) DESC
    `,
    [auth.session.user.id],
  );

  return json({ savedServices });
}

async function handleSavedServiceCreate(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readBody(request);
  const title = String(body.service_title || "").trim();
  const category = String(body.service_category || "").trim();
  const description = String(body.service_description || "").trim();

  if (!title || !category || !description) {
    return json({ error: "Service title, category, and description are required." }, 400);
  }

  await runQuery(
    env,
    "DELETE FROM saved_services WHERE user_id = ? AND service_title = ?",
    [auth.session.user.id, title],
  );

  const savedService = {
    id: createId(),
    service_title: title,
    service_category: category,
    service_description: description,
    saved_at: nowIso(),
  };

  await runQuery(
    env,
    `
      INSERT INTO saved_services (id, user_id, service_title, service_category, service_description, saved_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      savedService.id,
      auth.session.user.id,
      savedService.service_title,
      savedService.service_category,
      savedService.service_description,
      savedService.saved_at,
    ],
  );

  return json({ savedService }, 201);
}

async function handleSavedServiceDelete(env, request, id) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  await runQuery(
    env,
    "DELETE FROM saved_services WHERE id = ? AND user_id = ?",
    [id, auth.session.user.id],
  );

  return json({ success: true });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return json({ ok: true });
  }

  if (!env.DB) {
    return json({ error: "D1 binding `DB` is not configured." }, 500);
  }

  const url = new URL(request.url);
  const { pathname } = url;

  try {
    await cleanupExpiredSessions(env);

    if (request.method === "GET" && pathname === "/api/health") return handleHealth(env);
    if (request.method === "POST" && pathname === "/api/auth/signup") return handleSignup(env, request);
    if (request.method === "POST" && pathname === "/api/auth/signin") return handleSignin(env, request);
    if (request.method === "POST" && pathname === "/api/auth/signout") return handleSignout(env, request);
    if (request.method === "GET" && pathname === "/api/auth/me") return handleMe(env, request);
    if (request.method === "PATCH" && pathname === "/api/auth/password") return handlePasswordUpdate(env, request);
    if (request.method === "PATCH" && pathname === "/api/profile") return handleProfileUpdate(env, request);
    if (request.method === "GET" && pathname === "/api/consultations") return handleConsultationList(env, request);
    if (request.method === "POST" && pathname === "/api/consultations") return handleConsultationCreate(env, request);
    if (request.method === "GET" && pathname === "/api/admin/consultations") return handleAdminConsultationList(env, request);

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/api/admin/consultations/") &&
      pathname.endsWith("/status")
    ) {
      const id = pathname.replace("/api/admin/consultations/", "").replace("/status", "").replace(/\//g, "");
      return handleConsultationStatusUpdate(env, request, id);
    }

    if (request.method === "GET" && pathname === "/api/saved-services") return handleSavedServicesList(env, request);
    if (request.method === "POST" && pathname === "/api/saved-services") return handleSavedServiceCreate(env, request);
    if (request.method === "DELETE" && pathname.startsWith("/api/saved-services/")) {
      const id = pathname.replace("/api/saved-services/", "");
      return handleSavedServiceDelete(env, request, id);
    }

    return json({ error: "Not found." }, 404);
  } catch (error) {
    if (isMissingTableError(error)) {
      return json({ error: "Database not initialized. Run the D1 migrations first." }, 503);
    }

    console.error("Cloudflare API error", error);
    return json({ error: "Internal server error." }, 500);
  }
}
