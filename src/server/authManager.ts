import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

export interface Session {
  id: string; // Session token
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: number;
  lastActive: number;
}

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

class AuthManager {
  private users: Map<string, User> = new Map(); // id -> User
  private sessions: Map<string, Session> = new Map(); // token -> Session

  constructor() {
    this.initStorage();
  }

  private initStorage() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(USERS_FILE)) {
        const usersData = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        if (Array.isArray(usersData)) {
          usersData.forEach((u: User) => this.users.set(u.id, u));
        }
      } else {
        fs.writeFileSync(USERS_FILE, JSON.stringify([]), "utf-8");
      }

      if (fs.existsSync(SESSIONS_FILE)) {
        const sessionsData = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
        if (Array.isArray(sessionsData)) {
          sessionsData.forEach((s: Session) => this.sessions.set(s.id, s));
        }
      } else {
        fs.writeFileSync(SESSIONS_FILE, JSON.stringify([]), "utf-8");
      }
    } catch (err) {
      console.error("[AuthManager] Failed to initialize persistent storage:", err);
    }
  }

  private persistUsers() {
    try {
      const list = Array.from(this.users.values());
      fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("[AuthManager] Failed to persist users:", err);
    }
  }

  private persistSessions() {
    try {
      const list = Array.from(this.sessions.values());
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2), "utf-8");
    } catch (err) {
      console.error("[AuthManager] Failed to persist sessions:", err);
    }
  }

  private hashPassword(password: string, salt: string): string {
    return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  }

  public signUp(username: string, email: string, password: string, userAgent: string, ip: string) {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedUsername || !trimmedEmail || !password) {
      throw new Error("Username, email, and password are required.");
    }

    // Check existing
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === trimmedUsername.toLowerCase()) {
        throw new Error("Username is already taken.");
      }
      if (u.email === trimmedEmail) {
        throw new Error("Email address is already registered.");
      }
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = this.hashPassword(password, salt);
    const userId = crypto.randomUUID();

    const newUser: User = {
      id: userId,
      username: trimmedUsername,
      email: trimmedEmail,
      passwordHash,
      salt,
      createdAt: Date.now(),
    };

    this.users.set(userId, newUser);
    this.persistUsers();

    return this.createSession(userId, userAgent, ip);
  }

  public signIn(usernameOrEmail: string, password: string, userAgent: string, ip: string) {
    const target = usernameOrEmail.trim().toLowerCase();
    let matchedUser: User | null = null;

    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === target || u.email === target) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      throw new Error("Invalid username/email or password.");
    }

    const calculatedHash = this.hashPassword(password, matchedUser.salt);
    if (calculatedHash !== matchedUser.passwordHash) {
      throw new Error("Invalid username/email or password.");
    }

    return this.createSession(matchedUser.id, userAgent, ip);
  }

  private createSession(userId: string, userAgent: string, ip: string): { session: Session; user: { id: string; username: string; email: string } } {
    const sessionToken = crypto.randomBytes(32).toString("hex");
    const session: Session = {
      id: sessionToken,
      userId,
      userAgent: userAgent || "Unknown Device",
      ip: ip || "127.0.0.1",
      createdAt: Date.now(),
      lastActive: Date.now(),
    };

    this.sessions.set(sessionToken, session);
    this.persistSessions();

    const user = this.users.get(userId)!;
    return {
      session,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  public signOut(sessionToken: string) {
    const exists = this.sessions.has(sessionToken);
    if (exists) {
      this.sessions.delete(sessionToken);
      this.persistSessions();
    }
    return exists;
  }

  public getSession(sessionToken: string) {
    if (sessionToken && sessionToken.startsWith("guest_")) {
      return {
        session: {
          id: sessionToken,
          userId: "guest_user",
          userAgent: "Guest Terminal",
          ip: "127.0.0.1",
          createdAt: Date.now(),
          lastActive: Date.now()
        },
        user: {
          id: "guest_user",
          username: "Local Guest",
          email: "guest@xkira.local",
        }
      };
    }

    const session = this.sessions.get(sessionToken);
    if (!session) return null;

    // Check session age or simple validation
    const user = this.users.get(session.userId);
    if (!user) {
      this.sessions.delete(sessionToken);
      this.persistSessions();
      return null;
    }

    // Update active time
    session.lastActive = Date.now();
    this.persistSessions();

    return {
      session,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }

  public getUserSessions(userId: string) {
    return Array.from(this.sessions.values())
      .filter((s) => s.userId === userId)
      .map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastActive: s.lastActive,
      }));
  }

  public revokeSession(userId: string, sessionIdToRevoke: string) {
    const session = this.sessions.get(sessionIdToRevoke);
    if (session && session.userId === userId) {
      this.sessions.delete(sessionIdToRevoke);
      this.persistSessions();
      return true;
    }
    return false;
  }

  public revokeAllOtherSessions(userId: string, currentSessionToken: string) {
    let count = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (session.userId === userId && token !== currentSessionToken) {
        this.sessions.delete(token);
        count++;
      }
    }
    if (count > 0) {
      this.persistSessions();
    }
    return count;
  }
}

export const authManager = new AuthManager();
