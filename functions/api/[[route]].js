const DEFAULT_OWNER_EMAIL = "chegekeith4@gmail.com";
const PASSWORD_RESET_TTL_MINUTES = 10;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_COOLDOWN_SECONDS = 60;
const RESEND_API_URL = "https://api.resend.com/emails";
const RESEND_USER_AGENT = "kctech-password-reset/1.0";
const RESEND_TEST_DOMAIN = "resend.dev";
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

function combineBytes(left, right) {
  const combined = new Uint8Array(left.length + right.length);
  combined.set(left);
  combined.set(right, left.length);
  return combined;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return new Uint8Array(digest);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordBytes = encoder.encode(password);
  const hash = await sha256(combineBytes(salt, passwordBytes));
  return `sha256$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

async function verifyPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  const [algorithm] = parts;

  if (algorithm === "sha256") {
    const [, saltHex, hashHex] = parts;
    if (!saltHex || !hashHex) {
      return false;
    }

    const salt = hexToBytes(saltHex);
    const expected = hexToBytes(hashHex);
    const passwordBytes = encoder.encode(password);
    const actual = await sha256(combineBytes(salt, passwordBytes));
    return constantTimeEqual(actual, expected);
  }

  if (algorithm === "pbkdf2_sha256") {
    const [, iterationsValue, saltHex, hashHex] = parts;
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

  return false;
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

function normalizeWhitespace(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function extractEmailAddress(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return "";
  }

  const match = normalized.match(/<([^>]+)>/);
  return (match ? match[1] : normalized).trim().toLowerCase();
}

function maskEmailAddress(value) {
  const email = extractEmailAddress(value);
  if (!email || !email.includes("@")) {
    return "";
  }

  const [localPart, domainPart] = email.split("@");
  const localPrefix = localPart.length <= 2 ? localPart.slice(0, 1) : localPart.slice(0, 2);
  const domainSegments = domainPart.split(".");
  const domainName = domainSegments.shift() || "";
  const domainSuffix = domainSegments.join(".");
  const domainPrefix = domainName.length <= 2 ? domainName.slice(0, 1) : domainName.slice(0, 2);

  return `${localPrefix || "*"}***@${domainPrefix || "*"}***${domainSuffix ? `.${domainSuffix}` : ""}`;
}

function maskSender(value) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) {
    return "";
  }

  const maskedEmail = maskEmailAddress(normalized);
  const match = normalized.match(/^([^<]+)<([^>]+)>$/);
  if (match && maskedEmail) {
    return `${match[1].trim()} <${maskedEmail}>`;
  }

  return maskedEmail || normalized;
}

function summarizeResendConfig(env) {
  const apiKey = normalizeWhitespace(env.RESEND_API_KEY);
  const fromRaw = normalizeWhitespace(env.RESEND_FROM_EMAIL);
  const fromAddress = extractEmailAddress(fromRaw);
  const fromDomain = fromAddress.includes("@") ? fromAddress.split("@").pop() || "" : "";
  const issues = [];

  if (!apiKey) {
    issues.push("RESEND_API_KEY is missing.");
  }

  if (!fromRaw) {
    issues.push("RESEND_FROM_EMAIL is missing.");
  } else {
    if (fromRaw.toLowerCase().includes("yourdomain.com")) {
      issues.push("RESEND_FROM_EMAIL is still using the placeholder yourdomain.com.");
    }
    if (!fromAddress.includes("@")) {
      issues.push("RESEND_FROM_EMAIL must contain a valid sender email address.");
    }
  }

  return {
    configured: Boolean(apiKey && fromRaw),
    fromMasked: maskSender(fromRaw),
    senderMode: fromDomain === RESEND_TEST_DOMAIN ? "resend_test" : fromDomain ? "custom_domain" : "unknown",
    issues,
  };
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function extractResendErrorMessage(responseText) {
  const normalizedText = normalizeWhitespace(responseText);
  if (!normalizedText) {
    return "";
  }

  try {
    const parsed = JSON.parse(responseText);
    return normalizeWhitespace(
      parsed?.message ||
        parsed?.error?.message ||
        parsed?.error ||
        parsed?.name ||
        normalizedText,
    );
  } catch {
    return normalizedText;
  }
}

function formatResendFailureMessage(env, status, responseText = "") {
  const resendConfig = summarizeResendConfig(env);
  if (resendConfig.issues.length > 0) {
    return `Password reset email is not configured correctly: ${resendConfig.issues.join(" ")}`;
  }

  const senderLabel = resendConfig.fromMasked || "the configured sender";
  const apiMessage = extractResendErrorMessage(responseText);

  if (status === 401) {
    return "Resend rejected the API key. Check that RESEND_API_KEY is valid and has Sending or Full access.";
  }

  if (status === 403 && resendConfig.senderMode === "resend_test") {
    return `Resend rejected ${senderLabel}. The resend.dev testing sender only works for the email address on your Resend account. Use a verified custom-domain sender for other recipients.`;
  }

  if (status === 403) {
    return apiMessage
      ? `Resend rejected ${senderLabel}: ${apiMessage}`
      : `Resend rejected ${senderLabel}. Verify that the sender is approved in Resend.`;
  }

  if (status === 422) {
    return apiMessage
      ? `Resend rejected the email payload: ${apiMessage}`
      : "Resend rejected the email payload. Check the sender and recipient values.";
  }

  if (apiMessage) {
    return `Resend email failed (${status}): ${apiMessage}`;
  }

  return `Resend email failed (${status}). Check the sender, recipient, and API key configuration.`;
}

function resetEmailConfigured(env) {
  const resendConfig = summarizeResendConfig(env);
  return resendConfig.configured && resendConfig.issues.length === 0;
}

function createOtp() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
  return String(value).padStart(6, "0");
}

async function hashOtp(email, otp, saltBytes = crypto.getRandomValues(new Uint8Array(16))) {
  const hash = await sha256(combineBytes(saltBytes, encoder.encode(`${email}:${otp}`)));
  return {
    saltHex: bytesToHex(saltBytes),
    hashHex: bytesToHex(hash),
  };
}

async function verifyOtp(email, otp, saltHex, hashHex) {
  if (!saltHex || !hashHex) {
    return false;
  }

  const { hashHex: actualHash } = await hashOtp(email, otp, hexToBytes(saltHex));
  return constantTimeEqual(hexToBytes(actualHash), hexToBytes(hashHex));
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

async function cleanupExpiredPasswordResetOtps(env) {
  await runQuery(
    env,
    "DELETE FROM password_reset_otps WHERE used_at IS NOT NULL OR expires_at <= ?",
    [nowIso()],
  );
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

async function sendPasswordResetOtpEmail(env, { email, fullName, otp }) {
  const resendConfig = summarizeResendConfig(env);
  if (resendConfig.issues.length > 0) {
    throw createHttpError(502, formatResendFailureMessage(env, 0));
  }

  const ownerEmail = ownerEmailFor(env);
  const recipientName = fullName || email;
  const subject = "Your KCJ Tech password reset code";
  const text = [
    `Hello ${recipientName},`,
    "",
    `Use this OTP to reset your KCJ Tech password: ${otp}`,
    `This code expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.`,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;background:#f4f7fb;padding:24px;color:#0f172a">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;border:1px solid #dbe5f0">
        <p style="margin:0 0 16px;font-size:16px">Hello ${recipientName},</p>
        <p style="margin:0 0 20px;font-size:16px;line-height:1.6">
          Use this one-time password to reset your KCJ Tech account password.
        </p>
        <div style="margin:0 0 20px;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,#0ea5e9,#2563eb);color:#ffffff;text-align:center;font-size:32px;font-weight:700;letter-spacing:8px">
          ${otp}
        </div>
        <p style="margin:0 0 12px;font-size:15px;line-height:1.6">
          This code expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.
        </p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#475569">
          If you did not request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  let response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": RESEND_USER_AGENT,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: [email],
        subject,
        html,
        text,
        reply_to: env.RESEND_REPLY_TO || ownerEmail,
      }),
    });
  } catch (error) {
    console.error("Password reset email transport error", error);
    throw createHttpError(502, "Could not reach Resend from Cloudflare. Try again in a moment.");
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Password reset email send failed", {
      status: response.status,
      sender: resendConfig.fromMasked,
      errorText,
    });
    throw createHttpError(502, formatResendFailureMessage(env, response.status, errorText));
  }
}

async function issuePasswordResetOtp(env, user) {
  const email = String(user.email || "").trim().toLowerCase();
  const otp = createOtp();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000).toISOString();
  const { saltHex, hashHex } = await hashOtp(email, otp);

  await runQuery(env, "DELETE FROM password_reset_otps WHERE email = ?", [email]);
  await runQuery(
    env,
    `
      INSERT INTO password_reset_otps (
        id, user_id, email, otp_hash, otp_salt, attempt_count, expires_at, created_at, used_at
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL)
    `,
    [createId(), user.id, email, hashHex, saltHex, expiresAt, createdAt],
  );

  return { email, otp, createdAt, expiresAt };
}

async function handleHealth(env) {
  const resendConfig = summarizeResendConfig(env);
  return json({
    ok: true,
    ownerEmail: ownerEmailFor(env),
    emailNotificationsEnabled: resetEmailConfigured(env),
    database: "cloudflare-d1",
    emailDiagnostics: {
      provider: "resend",
      configured: resendConfig.configured,
      sender: resendConfig.fromMasked || null,
      senderMode: resendConfig.senderMode,
      issues: resendConfig.issues,
    },
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

async function handlePasswordResetRequest(env, request) {
  const resendConfig = summarizeResendConfig(env);
  const body = await readBody(request);
  const email = String(body.email || "").trim().toLowerCase();

  if (!resetEmailConfigured(env)) {
    // If the reset email provider is not set up, allow a fallback owner recovery path
    // by issuing an OTP directly for the configured owner email only.
    if (email && email === ownerEmailFor(env)) {
      const ownerUser = await firstRow(env, "SELECT id, email, full_name FROM users WHERE email = ?", [email]);
      if (ownerUser) {
        const reset = await issuePasswordResetOtp(env, ownerUser);
        return json({
          success: true,
          fallback: true,
          message:
            "Email delivery is disabled; owner recovery code generated. Use this code to complete reset.",
          otp: reset.otp,
          expiresAt: reset.expiresAt,
        });
      }
    }

    return json(
      {
        error:
          resendConfig.configured && resendConfig.issues.length > 0
            ? `Password reset email is configured incorrectly: ${resendConfig.issues.join(" ")}. Use Dashboard -> Settings -> Manual Password Reset instead.`
            : "Email OTP delivery is currently disabled. Ask the owner to use Dashboard -> Settings -> Manual Password Reset to generate a code.",
      },
      503,
    );
  }
  
  const emailAddress = email;
  if (!emailAddress) {
    return json({ error: "Email is required." }, 400);
  }

  const user = await firstRow(env, "SELECT id, email, full_name FROM users WHERE email = ?", [emailAddress]);
  if (!user) {
    return json({ success: true });
  }

  const latestOtp = await firstRow(
    env,
    `
      SELECT id, created_at
      FROM password_reset_otps
      WHERE email = ?
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `,
    [emailAddress],
  );

  if (latestOtp) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(latestOtp.created_at).getTime()) / 1000);
    if (elapsedSeconds < PASSWORD_RESET_COOLDOWN_SECONDS) {
      return json(
        {
          error: `Please wait ${PASSWORD_RESET_COOLDOWN_SECONDS - elapsedSeconds} seconds before requesting another OTP.`,
        },
        429,
      );
    }
  }

  const { otp } = await issuePasswordResetOtp(env, user);

  try {
    await sendPasswordResetOtpEmail(env, {
      email: emailAddress,
      fullName: user.full_name,
      otp,
    });
  } catch (error) {
    console.error("Password reset request email error", error);
    const status = Number(error?.status);
    return json(
      {
        error: error instanceof Error ? error.message : "Password reset email could not be sent.",
      },
      status >= 400 && status < 600 ? status : 502,
    );
  }

  return json({ success: true });
}

async function handleOwnerPasswordResetOtpCreate(env, request) {
  const auth = await requireOwner(env, request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readBody(request);
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) {
    return json({ error: "Email is required." }, 400);
  }

  const user = await firstRow(env, "SELECT id, email, full_name FROM users WHERE email = ?", [email]);
  if (!user) {
    return json({ error: "No account exists for that email." }, 404);
  }

  const reset = await issuePasswordResetOtp(env, user);
  return json({
    success: true,
    email: reset.email,
    otp: reset.otp,
    expiresAt: reset.expiresAt,
    ttlMinutes: PASSWORD_RESET_TTL_MINUTES,
  });
}

async function handlePasswordResetConfirm(env, request) {
  const body = await readBody(request);
  const email = String(body.email || "").trim().toLowerCase();
  const otp = String(body.otp || "").trim();
  const password = String(body.password || "");

  if (!email || !otp || !password) {
    return json({ error: "Email, OTP, and new password are required." }, 400);
  }

  if (!/^\d{6}$/.test(otp)) {
    return json({ error: "OTP must be a 6-digit code." }, 400);
  }

  if (password.length < 6) {
    return json({ error: "Password must be at least 6 characters." }, 400);
  }

  const resetRecord = await firstRow(
    env,
    `
      SELECT id, user_id, email, otp_hash, otp_salt, attempt_count, expires_at
      FROM password_reset_otps
      WHERE email = ? AND used_at IS NULL
      ORDER BY datetime(created_at) DESC
      LIMIT 1
    `,
    [email],
  );

  if (!resetRecord) {
    return json({ error: "The OTP is invalid or has expired." }, 400);
  }

  if (new Date(resetRecord.expires_at).getTime() <= Date.now()) {
    await runQuery(env, "DELETE FROM password_reset_otps WHERE id = ?", [resetRecord.id]);
    return json({ error: "The OTP is invalid or has expired." }, 400);
  }

  if ((resetRecord.attempt_count || 0) >= PASSWORD_RESET_MAX_ATTEMPTS) {
    return json({ error: "Too many invalid OTP attempts. Request a new code and try again." }, 429);
  }

  const otpMatches = await verifyOtp(email, otp, resetRecord.otp_salt, resetRecord.otp_hash);
  if (!otpMatches) {
    await runQuery(
      env,
      "UPDATE password_reset_otps SET attempt_count = attempt_count + 1 WHERE id = ?",
      [resetRecord.id],
    );
    return json({ error: "The OTP is invalid or has expired." }, 400);
  }

  const passwordHash = await hashPassword(password);
  const updatedAt = nowIso();

  await runQuery(env, "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
    passwordHash,
    updatedAt,
    resetRecord.user_id,
  ]);
  await runQuery(env, "DELETE FROM sessions WHERE user_id = ?", [resetRecord.user_id]);
  await runQuery(env, "UPDATE password_reset_otps SET used_at = ? WHERE id = ?", [updatedAt, resetRecord.id]);

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
    next_path: "service",
    next_path_status: "pending",
    owner_agreed: "no",
    created_at: nowIso(),
  };

  await runQuery(
    env,
    `
      INSERT INTO consultations (id, user_id, full_name, email, phone, service, message, status, next_path, next_path_status, owner_agreed, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      consultation.next_path,
      consultation.next_path_status,
      consultation.owner_agreed,
      consultation.created_at,
    ],
  );

  return json({ consultation, notification: { enabled: false, sent: false } }, 201);
}

async function getConsultationColumns(env) {
  const cols = await allRows(env, "PRAGMA table_info(consultations)");
  return cols.map((c) => c.name);
}

async function handleConsultationList(env, request) {
  const auth = await requireAuth(env, request);
  if (auth.error) {
    return auth.error;
  }

  const columns = await getConsultationColumns(env);
  const includeWorkflow = columns.includes("next_path") && columns.includes("next_path_status") && columns.includes("owner_agreed");
  const columnsQuery = includeWorkflow
    ? "id, full_name, email, phone, service, message, status, next_path, next_path_status, owner_agreed, created_at"
    : "id, full_name, email, phone, service, message, status, created_at";

  const consultations = await allRows(
    env,
    `
      SELECT ${columnsQuery}
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

  const columns = await getConsultationColumns(env);
  const includeWorkflow = columns.includes("next_path") && columns.includes("next_path_status") && columns.includes("owner_agreed");
  const columnsQuery = includeWorkflow
    ? "id, user_id, full_name, email, phone, service, message, status, next_path, next_path_status, owner_agreed, created_at"
    : "id, user_id, full_name, email, phone, service, message, status, created_at";

  const consultations = await allRows(
    env,
    `
      SELECT ${columnsQuery}
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

async function handleConsultationWorkflowUpdate(env, request, id) {
  const auth = await requireOwner(env, request);
  if (auth.error) {
    return auth.error;
  }

  const body = await readBody(request);
  const nextPath = String(body.next_path || "service").trim();
  const nextPathStatus = String(body.next_path_status || "pending").trim();
  const ownerAgreed = body.owner_agreed === true || body.owner_agreed === "yes" ? "yes" : "no";

  const allowedNextPath = new Set(["service", "class"]);
  const allowedNextPathStatus = new Set(["pending", "test_in_progress", "test_completed", "certification_started"]);

  if (!allowedNextPath.has(nextPath)) {
    return json({ error: "Invalid next path." }, 400);
  }

  if (!allowedNextPathStatus.has(nextPathStatus)) {
    return json({ error: "Invalid next path status." }, 400);
  }

  const columns = await getConsultationColumns(env);
  const includeWorkflow = columns.includes("next_path") && columns.includes("next_path_status") && columns.includes("owner_agreed");

  if (includeWorkflow) {
    await runQuery(
      env,
      "UPDATE consultations SET next_path = ?, next_path_status = ?, owner_agreed = ? WHERE id = ?",
      [nextPath, nextPathStatus, ownerAgreed, id],
    );
  } else {
    // fallback to status-only in legacy schema
    const statusMap = {
      pending: "pending",
      test_in_progress: "in_progress",
      test_completed: "completed",
      certification_started: "completed",
    };
    await runQuery(env, "UPDATE consultations SET status = ? WHERE id = ?", [statusMap[nextPathStatus] || "pending", id]);
  }

  const columnsQuery = includeWorkflow
    ? "id, user_id, full_name, email, phone, service, message, status, next_path, next_path_status, owner_agreed, created_at"
    : "id, user_id, full_name, email, phone, service, message, status, created_at";

  const consultation = await firstRow(
    env,
    `
      SELECT ${columnsQuery}
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
    await cleanupExpiredPasswordResetOtps(env);

    if (request.method === "GET" && pathname === "/api/health") return await handleHealth(env);
    if (request.method === "POST" && pathname === "/api/auth/signup") return await handleSignup(env, request);
    if (request.method === "POST" && pathname === "/api/auth/signin") return await handleSignin(env, request);
    if (request.method === "POST" && pathname === "/api/auth/password-reset/request") {
      return await handlePasswordResetRequest(env, request);
    }
    if (request.method === "POST" && pathname === "/api/auth/password-reset/confirm") {
      return await handlePasswordResetConfirm(env, request);
    }
    if (request.method === "POST" && pathname === "/api/auth/signout") return await handleSignout(env, request);
    if (request.method === "GET" && pathname === "/api/auth/me") return await handleMe(env, request);
    if (request.method === "PATCH" && pathname === "/api/auth/password") return await handlePasswordUpdate(env, request);
    if (request.method === "PATCH" && pathname === "/api/profile") return await handleProfileUpdate(env, request);
    if (request.method === "GET" && pathname === "/api/consultations") return await handleConsultationList(env, request);
    if (request.method === "POST" && pathname === "/api/consultations") return await handleConsultationCreate(env, request);
    if (request.method === "GET" && pathname === "/api/admin/consultations") return await handleAdminConsultationList(env, request);
    if (request.method === "POST" && pathname === "/api/admin/password-reset-otp") {
      return await handleOwnerPasswordResetOtpCreate(env, request);
    }

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/api/admin/consultations/") &&
      pathname.endsWith("/status")
    ) {
      const id = pathname.replace("/api/admin/consultations/", "").replace("/status", "").replace(/\//g, "");
      return await handleConsultationStatusUpdate(env, request, id);
    }

    if (
      request.method === "PATCH" &&
      pathname.startsWith("/api/admin/consultations/") &&
      pathname.endsWith("/workflow")
    ) {
      const id = pathname.replace("/api/admin/consultations/", "").replace("/workflow", "").replace(/\//g, "");
      return await handleConsultationWorkflowUpdate(env, request, id);
    }

    if (request.method === "GET" && pathname === "/api/saved-services") return await handleSavedServicesList(env, request);
    if (request.method === "POST" && pathname === "/api/saved-services") return await handleSavedServiceCreate(env, request);
    if (request.method === "DELETE" && pathname.startsWith("/api/saved-services/")) {
      const id = pathname.replace("/api/saved-services/", "");
      return await handleSavedServiceDelete(env, request, id);
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
