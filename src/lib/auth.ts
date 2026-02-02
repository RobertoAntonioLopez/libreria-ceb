import bcrypt from "bcryptjs";

export function getAuthUser() {
  return process.env.AUTH_USER ?? "";
}

export function getAuthPassword() {
  return process.env.AUTH_PASSWORD ?? "";
}

export function getJwtSecret() {
  const s = process.env.AUTH_JWT_SECRET ?? "";
  if (!s || s.length < 24) {
    throw new Error("AUTH_JWT_SECRET is missing or too short.");
  }
  return s;
}

export async function verifyCredentials(user: string, pass: string) {
  const expectedUser = getAuthUser();
  const expectedPass = getAuthPassword();

  if (!expectedUser || !expectedPass) return false;
  if (user !== expectedUser) return false;

  // Guardamos el pass “real” en env, pero comparamos usando hash para no filtrar timing y para poder migrar luego.
  const hash = await bcrypt.hash(expectedPass, 10);
  return bcrypt.compare(pass, hash);
}
