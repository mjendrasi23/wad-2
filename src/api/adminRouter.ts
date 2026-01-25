import { Router, Request, Response } from "express";
import { db } from "../helpers/db";
import { HttpError } from "../helpers/errors";
import { requireRole } from "../helpers/auth";
import { hashPassword } from "../helpers/password";
import { AuditService } from "../helpers/auditlog"; 

export const adminRouter = Router();

function roleIdFromName(role: string): number {
  if (role === "admin") return 1;
  if (role === "manager") return 2;
  if (role === "creator") return 3;
  if (role === "explorer") return 4;
  throw new HttpError(400, "Invalid role");
}

function roleNameFromId(role_id: number): "admin" | "manager" | "creator" | "explorer" {
  if (role_id === 1) return "admin";
  if (role_id === 2) return "manager";
  if (role_id === 4) return "explorer";
  return "creator";
}

function userDto(row: any) {
  return {
    id: String(row.user_id),
    name: row.username,
    email: row.email,
    role: roleNameFromId(Number(row.role_id)),
    createdAt: row.created_at,
  };
}

// Admin-only user management (used by the Angular admin UI)
adminRouter.get("/admin/users", requireRole([1]), async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;
  const offset = (page - 1) * pageSize;

  const search = (req.query.search as string | undefined)?.trim() || "";
  const role = (req.query.role as string | undefined)?.trim() || "";

  const where: string[] = [];
  const params: any[] = [];

  if (search) {
    where.push("(username LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (role) {
    where.push("role_id = ?");
    params.push(roleIdFromName(role));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const items = await db.connection!.all(
    `SELECT user_id, username, email, role_id, created_at FROM users ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const countRow = await db.connection!.get(`SELECT COUNT(*) as total FROM users ${whereSql}`, params);

  res.json({
    items: (items || []).map(userDto),
    total: countRow?.total ?? 0,
    page,
    pageSize,
  });
});

adminRouter.get("/admin/users/:id", requireRole([1]), async (req: Request, res: Response) => {
  const user = await db.connection!.get(
    "SELECT user_id, username, email, role_id, created_at FROM users WHERE user_id = ?",
    [Number(req.params.id)]
  );
  if (!user) throw new HttpError(404, "User not found");
  res.json(userDto(user));
});

adminRouter.patch("/admin/users/:id", requireRole([1]), async (req: Request, res: Response) => {
  const role = String(req.body?.role ?? "");
  const role_id = roleIdFromName(role);
  const targetId = Number(req.params.id);

  const updated = await db.connection!.get(
    "UPDATE users SET role_id = ? WHERE user_id = ? RETURNING user_id, username, email, role_id, created_at",
    [role_id, Number(req.params.id)]
  );
  if (!updated) throw new HttpError(404, "User not found");
  await AuditService.log(
    req, 
    'ROLE_UPDATE', 
    'users', 
    targetId, 
    `Administrator updated user ${updated.username} to role: ${role}`
  );
  res.json(userDto(updated));
});

adminRouter.post("/admin/users/:id/reset-password", requireRole([1]), async (req: Request, res: Response) => {
  const newPassword = process.env.RESET_PASSWORD || "Password123!";
  const password_hash = hashPassword(newPassword);
  const targetId = Number(req.params.id);

  const updated = await db.connection!.get(
    "UPDATE users SET password_hash = ? WHERE user_id = ? RETURNING user_id",
    [password_hash, Number(req.params.id)]
  );
  if (!updated) throw new HttpError(404, "User not found");
  await AuditService.log(
    req, 
    'PASSWORD_RESET', 
    'users', 
    targetId, 
    `Administrator forced a password reset for user: ${updated.username}`
  );
  res.status(204).send();
});

