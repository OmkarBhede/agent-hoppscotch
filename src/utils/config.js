import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'fs';

const CONFIG_DIR = join(homedir(), '.hoppscotch');
const AUTH_FILE = join(CONFIG_DIR, 'auth.json');
const DEFAULTS_FILE = join(CONFIG_DIR, 'defaults.json');

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { mode: 0o700, recursive: true });
  }
}

export function readAuth() {
  if (!existsSync(AUTH_FILE)) return {};
  try {
    return JSON.parse(readFileSync(AUTH_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function writeAuth(data) {
  ensureConfigDir();
  const current = readAuth();
  const merged = { ...current, ...data };
  writeFileSync(AUTH_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function readDefaults() {
  if (!existsSync(DEFAULTS_FILE)) return {};
  try {
    return JSON.parse(readFileSync(DEFAULTS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function writeDefaults(data) {
  ensureConfigDir();
  const current = readDefaults();
  const merged = { ...current, ...data };
  writeFileSync(DEFAULTS_FILE, JSON.stringify(merged, null, 2), { mode: 0o600 });
}

export function clearConfig() {
  if (existsSync(AUTH_FILE)) rmSync(AUTH_FILE);
  if (existsSync(DEFAULTS_FILE)) rmSync(DEFAULTS_FILE);
}

export function getConfig(opts = {}) {
  const auth = readAuth();
  const defaults = readDefaults();

  return {
    endpoint: opts.endpoint || process.env.HOPPSCOTCH_ENDPOINT || auth.endpoint,
    cookie: opts.cookie || process.env.HOPPSCOTCH_COOKIE || auth.cookie,
    teamId: opts.team || defaults.teamId,
    collectionId: opts.collection || defaults.collectionId,
  };
}

export function getConfigPaths() {
  return { CONFIG_DIR, AUTH_FILE, DEFAULTS_FILE };
}
