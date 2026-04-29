import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '.data')
const dbPath = path.join(dataDir, 'sandbox-auth.sqlite')

mkdirSync(dataDir, { recursive: true })

const db = new DatabaseSync(dbPath)

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sandbox_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    workspace_dir TEXT NOT NULL,
    container_id TEXT NOT NULL,
    forwarded_port INTEGER NOT NULL,
    image TEXT NOT NULL,
    language TEXT NOT NULL,
    mode TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT PRIMARY KEY,
    completed_lesson_ids TEXT NOT NULL,
    visited_lesson_ids TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_expires_at ON sandbox_sessions(expires_at);
`)

export interface UserRecord {
  id: string
  username: string
  createdAt: number
}

interface UserPasswordRecord extends UserRecord {
  passwordHash: string
  passwordSalt: string
}

export interface AuthSessionRecord {
  id: string
  userId: string
  username: string
  createdAt: number
  lastActiveAt: number
  expiresAt: number
}

export interface SandboxSessionRecord {
  id: string
  userId: string
  workspaceDir: string
  containerId: string
  forwardedPort: number
  image: string
  language: string
  mode: string
  status: string
  createdAt: number
  lastActiveAt: number
  expiresAt: number
}

export interface UserProgressRecord {
  userId: string
  completedLessonIds: string[]
  visitedLessonIds: string[]
  updatedAt: number
}

interface UserProgressRow {
  userId: string
  completedLessonIds: string
  visitedLessonIds: string
  updatedAt: number
}

const normalizeUsername = (value: string) => value.trim().toLowerCase()

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 64).toString('hex')

const makePasswordRecord = (password: string) => {
  const passwordSalt = randomUUID().replace(/-/g, '')
  return {
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
  }
}

const verifyPassword = (password: string, passwordSalt: string, passwordHash: string) => {
  const expected = Buffer.from(passwordHash, 'hex')
  const actual = Buffer.from(hashPassword(password, passwordSalt), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const parseStoredLessonIds = (raw: string | undefined) => {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))]
  } catch {
    return []
  }
}

const toProgressRecord = (row: UserProgressRow | undefined, userId: string): UserProgressRecord => {
  if (!row) {
    return {
      userId,
      completedLessonIds: [],
      visitedLessonIds: [],
      updatedAt: 0,
    }
  }

  const completedLessonIds = parseStoredLessonIds(row.completedLessonIds)
  const visitedLessonIds = [...new Set([...parseStoredLessonIds(row.visitedLessonIds), ...completedLessonIds])]

  return {
    userId: row.userId,
    completedLessonIds,
    visitedLessonIds,
    updatedAt: row.updatedAt,
  }
}

const statements = {
  createUser: db.prepare(`
    INSERT INTO users (id, username, password_hash, password_salt, created_at)
    VALUES (?, ?, ?, ?, ?)
  `),
  getUserById: db.prepare(`
    SELECT id, username, created_at AS createdAt
    FROM users
    WHERE id = ?
  `),
  getUserByUsername: db.prepare(`
    SELECT id, username, password_hash AS passwordHash, password_salt AS passwordSalt, created_at AS createdAt
    FROM users
    WHERE username = ?
  `),
  createAuthSession: db.prepare(`
    INSERT INTO auth_sessions (id, user_id, created_at, last_active_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `),
  getAuthSessionWithUser: db.prepare(`
    SELECT
      s.id,
      s.user_id AS userId,
      s.created_at AS createdAt,
      s.last_active_at AS lastActiveAt,
      s.expires_at AS expiresAt,
      u.username
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `),
  touchAuthSession: db.prepare(`
    UPDATE auth_sessions
    SET last_active_at = ?, expires_at = ?
    WHERE id = ?
  `),
  deleteAuthSession: db.prepare(`DELETE FROM auth_sessions WHERE id = ?`),
  deleteExpiredAuthSessions: db.prepare(`DELETE FROM auth_sessions WHERE expires_at <= ?`),
  getSandboxSessionById: db.prepare(`
    SELECT
      id,
      user_id AS userId,
      workspace_dir AS workspaceDir,
      container_id AS containerId,
      forwarded_port AS forwardedPort,
      image,
      language,
      mode,
      status,
      created_at AS createdAt,
      last_active_at AS lastActiveAt,
      expires_at AS expiresAt
    FROM sandbox_sessions
    WHERE id = ?
  `),
  getSandboxSessionByUserId: db.prepare(`
    SELECT
      id,
      user_id AS userId,
      workspace_dir AS workspaceDir,
      container_id AS containerId,
      forwarded_port AS forwardedPort,
      image,
      language,
      mode,
      status,
      created_at AS createdAt,
      last_active_at AS lastActiveAt,
      expires_at AS expiresAt
    FROM sandbox_sessions
    WHERE user_id = ?
  `),
  upsertSandboxSession: db.prepare(`
    INSERT INTO sandbox_sessions (
      id, user_id, workspace_dir, container_id, forwarded_port, image,
      language, mode, status, created_at, last_active_at, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      id = excluded.id,
      workspace_dir = excluded.workspace_dir,
      container_id = excluded.container_id,
      forwarded_port = excluded.forwarded_port,
      image = excluded.image,
      language = excluded.language,
      mode = excluded.mode,
      status = excluded.status,
      created_at = excluded.created_at,
      last_active_at = excluded.last_active_at,
      expires_at = excluded.expires_at
  `),
  touchSandboxSession: db.prepare(`
    UPDATE sandbox_sessions
    SET last_active_at = ?, status = ?
    WHERE id = ?
  `),
  deleteSandboxSession: db.prepare(`DELETE FROM sandbox_sessions WHERE id = ?`),
  deleteSandboxSessionsByUserId: db.prepare(`DELETE FROM sandbox_sessions WHERE user_id = ?`),
  deleteAllSandboxSessions: db.prepare(`DELETE FROM sandbox_sessions`),
  listSandboxSessions: db.prepare(`
    SELECT
      id,
      user_id AS userId,
      workspace_dir AS workspaceDir,
      container_id AS containerId,
      forwarded_port AS forwardedPort,
      image,
      language,
      mode,
      status,
      created_at AS createdAt,
      last_active_at AS lastActiveAt,
      expires_at AS expiresAt
    FROM sandbox_sessions
  `),
  getUserProgress: db.prepare(`
    SELECT
      user_id AS userId,
      completed_lesson_ids AS completedLessonIds,
      visited_lesson_ids AS visitedLessonIds,
      updated_at AS updatedAt
    FROM user_progress
    WHERE user_id = ?
  `),
  upsertUserProgress: db.prepare(`
    INSERT INTO user_progress (user_id, completed_lesson_ids, visited_lesson_ids, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      completed_lesson_ids = excluded.completed_lesson_ids,
      visited_lesson_ids = excluded.visited_lesson_ids,
      updated_at = excluded.updated_at
  `),
}

export const authDbPath = dbPath

export const createUser = (username: string, password: string): UserRecord => {
  const normalized = normalizeUsername(String(username ?? ''))
  if (!normalized) throw new Error('用户名不能为空')
  if (String(password ?? '').length < 6) throw new Error('密码至少 6 位')
  if (statements.getUserByUsername.get(normalized)) throw new Error('用户名已存在')

  const id = randomUUID()
  const now = Date.now()
  const { passwordHash, passwordSalt } = makePasswordRecord(password)
  statements.createUser.run(id, normalized, passwordHash, passwordSalt, now)
  return statements.getUserById.get(id) as unknown as UserRecord
}

export const verifyUserCredentials = (username: string, password: string): UserRecord | null => {
  const normalized = normalizeUsername(String(username ?? ''))
  const user = statements.getUserByUsername.get(normalized) as unknown as UserPasswordRecord | undefined
  if (!user) return null
  if (!verifyPassword(String(password ?? ''), user.passwordSalt, user.passwordHash)) return null
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
  }
}

export const createAuthSession = (userId: string, ttlMs: number) => {
  const id = randomUUID()
  const now = Date.now()
  statements.createAuthSession.run(id, userId, now, now, now + ttlMs)
  return {
    id,
    userId,
    createdAt: now,
    lastActiveAt: now,
    expiresAt: now + ttlMs,
  }
}

export const getAuthSessionUser = (sessionId: string | undefined): AuthSessionRecord | null => {
  if (!sessionId) return null
  return (statements.getAuthSessionWithUser.get(sessionId) as unknown as AuthSessionRecord | undefined) ?? null
}

export const touchAuthSession = (sessionId: string, ttlMs: number) => {
  const now = Date.now()
  statements.touchAuthSession.run(now, now + ttlMs, sessionId)
}

export const deleteAuthSession = (sessionId: string | undefined) => {
  if (!sessionId) return
  statements.deleteAuthSession.run(sessionId)
}

export const deleteExpiredAuthSessions = (now = Date.now()) => {
  statements.deleteExpiredAuthSessions.run(now)
}

export const getSandboxSessionRecordById = (id: string | undefined): SandboxSessionRecord | null =>
  (id
    ? ((statements.getSandboxSessionById.get(id) as unknown as SandboxSessionRecord | undefined) ?? null)
    : null)

export const getSandboxSessionRecordByUserId = (userId: string | undefined): SandboxSessionRecord | null =>
  userId
    ? ((statements.getSandboxSessionByUserId.get(userId) as unknown as SandboxSessionRecord | undefined) ?? null)
    : null

export const upsertSandboxSessionRecord = (record: SandboxSessionRecord) => {
  statements.upsertSandboxSession.run(
    record.id,
    record.userId,
    record.workspaceDir,
    record.containerId,
    record.forwardedPort,
    record.image,
    record.language,
    record.mode,
    record.status,
    record.createdAt,
    record.lastActiveAt,
    record.expiresAt,
  )
}

export const touchSandboxSessionRecord = (id: string, lastActiveAt: number, status = 'active') => {
  statements.touchSandboxSession.run(lastActiveAt, status, id)
}

export const deleteSandboxSessionRecord = (id: string | undefined) => {
  if (!id) return
  statements.deleteSandboxSession.run(id)
}

export const deleteSandboxSessionRecordsByUserId = (userId: string | undefined) => {
  if (!userId) return
  statements.deleteSandboxSessionsByUserId.run(userId)
}

export const deleteAllSandboxSessionRecords = () => {
  statements.deleteAllSandboxSessions.run()
}

export const listExpiredSandboxSessionRecords = (now: number, idleTimeoutMs: number): SandboxSessionRecord[] =>
  ((statements.listSandboxSessions.all() as unknown as SandboxSessionRecord[]) ?? []).filter(
    (record) => now >= record.expiresAt || now - record.lastActiveAt >= idleTimeoutMs,
  )

export const getUserProgress = (userId: string): UserProgressRecord =>
  toProgressRecord(statements.getUserProgress.get(userId) as unknown as UserProgressRow | undefined, userId)

export const saveUserProgress = (
  userId: string,
  completedLessonIds: string[],
  visitedLessonIds: string[],
): UserProgressRecord => {
  const normalizedCompleted = parseStoredLessonIds(JSON.stringify(completedLessonIds))
  const normalizedVisited = [...new Set([...parseStoredLessonIds(JSON.stringify(visitedLessonIds)), ...normalizedCompleted])]
  const updatedAt = Date.now()
  statements.upsertUserProgress.run(
    userId,
    JSON.stringify(normalizedCompleted),
    JSON.stringify(normalizedVisited),
    updatedAt,
  )
  return {
    userId,
    completedLessonIds: normalizedCompleted,
    visitedLessonIds: normalizedVisited,
    updatedAt,
  }
}
