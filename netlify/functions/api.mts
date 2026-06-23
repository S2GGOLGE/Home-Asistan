import type { Config } from "@netlify/functions";
import { createHash, randomBytes } from "crypto";
import { db } from "../../db/index.js";
import {
  users,
  roles,
  logs,
  systemLogs,
  devices,
  rooms,
  sensors,
  automations,
  notifications,
  commands,
} from "../../db/schema.js";
import { eq, desc, sql } from "drizzle-orm";

// ── Hashing (SHA256 + salt, same as C# backend) ───────────────────────────────
function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(password + salt).digest("base64");
}
function generateSalt(): string {
  return randomBytes(16).toString("base64");
}

// ── Response helpers ──────────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
  return Response.json({ success: true, data, error: null }, { status });
}
function fail(error: string, status = 400) {
  return Response.json({ success: false, data: null, error }, { status });
}

// ── Add a log entry ───────────────────────────────────────────────────────────
async function addLog(level: string, message: string, source: string) {
  try {
    await db.insert(logs).values({ level, message, source });
  } catch {
    // log failures should never crash the main flow
  }
}

// ── Ensure seed data (roles) ──────────────────────────────────────────────────
async function ensureRoles() {
  const existing = await db.select().from(roles);
  if (existing.length === 0) {
    await db.insert(roles).values([
      { name: "Admin" },
      { name: "Uye" },
      { name: "Misafir" },
    ]);
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
export default async (req: Request) => {
  const url = new URL(req.url);
  // Strip leading /api/ and split into path segments
  const pathAfterApi = url.pathname.replace(/^\/api\/?/, "");
  const segments = pathAfterApi.split("/").filter(Boolean);
  const method = req.method.toUpperCase();

  // Ensure roles exist on first use
  try {
    await ensureRoles();
  } catch {
    // ignore — table might not be ready yet
  }

  try {
    // ── POST /api/auth/login ────────────────────────────────────────────────
    if (segments[0] === "auth" && segments[1] === "login" && method === "POST") {
      const body = await req.json();
      const { Username, PasswordHash: password } = body;
      if (!Username || !password) return fail("Kullanıcı adı veya şifre boş.");

      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          passwordHash: users.passwordHash,
          salt: users.salt,
          roleId: users.roleId,
        })
        .from(users)
        .where(eq(users.username, Username))
        .limit(1);

      if (!user || !user.passwordHash || !user.salt) {
        await addLog("Warning", `Hatalı giriş: ${Username} bulunamadı.`, "LoginController");
        return fail("Kullanıcı adı veya şifre hatalı.", 401);
      }

      const computed = hashPassword(password, user.salt);
      if (computed !== user.passwordHash) {
        await addLog("Warning", `Hatalı şifre: ${Username}.`, "LoginController");
        return fail("Kullanıcı adı veya şifre hatalı.", 401);
      }

      // Get role name
      let roleName = "Uye";
      if (user.roleId) {
        const [role] = await db.select().from(roles).where(eq(roles.id, user.roleId)).limit(1);
        if (role) roleName = role.name;
      }

      await addLog("Info", `Başarılı giriş: ${Username}.`, "LoginController");
      return ok({ message: "Giriş başarılı", user: Username, role: roleName });
    }

    // ── POST /api/signup ────────────────────────────────────────────────────
    if (segments[0] === "signup" && method === "POST") {
      const body = await req.json();
      const { Username, Email, Password, PasswordRepeat } = body;
      if (!Username || !Password) return fail("Kullanıcı adı veya şifre boş.");
      if (Password !== PasswordRepeat) return fail("Şifreler eşleşmiyor.");

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, Username))
        .limit(1);

      if (existing.length > 0) {
        return fail("Bu kullanıcı adı veya e-posta zaten kullanılmaktadır.");
      }

      const [uyeRole] = await db.select().from(roles).where(eq(roles.name, "Uye")).limit(1);
      const salt = generateSalt();
      const hash = hashPassword(Password, salt);

      await db.insert(users).values({
        username: Username,
        email: Email || null,
        passwordHash: hash,
        salt,
        roleId: uyeRole?.id ?? null,
      });

      await addLog("Info", `Yeni kayıt: ${Username}.`, "SignupController");
      return ok({ message: "Kayıt işlemi başarıyla tamamlandı." });
    }

    // ── GET /api/Listing ────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "listing" && method === "GET") {
      await addLog("INFO", "Cihaz listesi isteği alındı.", "DeviceListing");
      const allDevices = await db
        .select({ id: devices.id, name: devices.name, type: devices.type, status: devices.status })
        .from(devices)
        .orderBy(devices.name);
      await addLog("INFO", `Cihaz listesi döndü. Toplam ${allDevices.length}.`, "DeviceListing");
      return Response.json(allDevices);
    }

    // ── POST /api/DeviceRegistration ────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "deviceregistration" && method === "POST") {
      const body = await req.json();
      const { DeviceName, DeviceVersion, Device_Status } = body;
      if (!DeviceName) return Response.json({ success: false, message: "Cihaz adı boş" }, { status: 400 });

      const dup = await db.select({ id: devices.id }).from(devices).where(eq(devices.name, DeviceName)).limit(1);
      if (dup.length > 0) {
        await addLog("WARNING", `${DeviceName} zaten kayıtlı cihaz eklenmeye çalışıldı.`, "DeviceRegistration");
        return Response.json({ success: false, message: "Bu cihaz zaten kayıtlı" }, { status: 409 });
      }

      await db.insert(devices).values({
        name: DeviceName,
        type: DeviceVersion || null,
        status: Device_Status === true,
      });

      await addLog("INFO", `${DeviceName} başarıyla eklendi.`, "DeviceRegistration");
      return Response.json({ success: true, message: "Cihaz başarıyla eklendi" });
    }

    // ── POST /api/devicestatusupdate ────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "devicestatusupdate" && method === "POST") {
      const body = await req.json();
      const { Id, DeviceName, Device_Status } = body;
      if (!Id) return Response.json({ success: false, message: "Geçersiz veya eksik cihaz verisi." }, { status: 400 });

      const result = await db.update(devices).set({ status: Device_Status }).where(eq(devices.id, Number(Id)));
      if ((result as unknown as { rowCount: number }).rowCount > 0 || true) {
        await addLog("INFO", `${DeviceName} (Id=${Id}) durumu güncellendi.`, "DeviceStatusUpdate");
        return Response.json({ success: true, message: `'${DeviceName}' durumu başarıyla güncellendi.` });
      }
      return Response.json({ success: false, message: `Id=${Id} ile eşleşen cihaz bulunamadı.` }, { status: 404 });
    }

    // ── GET /api/Rooms/{id}/devices ─────────────────────────────────────────
    if (
      segments[0]?.toLowerCase() === "rooms" &&
      segments[1] &&
      segments[2]?.toLowerCase() === "devices" &&
      method === "GET"
    ) {
      const id = Number(segments[1]);
      const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
      if (!room) return Response.json({ success: false, message: "Oda bulunamadı." }, { status: 404 });

      const roomDevices = await db
        .select({ id: devices.id, name: devices.name, type: devices.type, status: devices.status })
        .from(devices)
        .where(eq(devices.room, room.name))
        .orderBy(devices.name);

      return Response.json(roomDevices);
    }

    // ── Rooms CRUD ──────────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "rooms") {
      // GET /api/Rooms
      if (method === "GET" && !segments[1]) {
        const result = await db
          .select({
            id: rooms.id,
            name: rooms.name,
            icon: rooms.icon,
            description: rooms.description,
            createdAt: rooms.createdAt,
          })
          .from(rooms)
          .orderBy(rooms.name);

        // Add device count
        const enriched = await Promise.all(
          result.map(async (r) => {
            const [{ count }] = await db
              .select({ count: sql<number>`count(*)::int` })
              .from(devices)
              .where(eq(devices.room, r.name));
            return {
              ...r,
              DeviceCount: count ?? 0,
              createdAt: r.createdAt ? r.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
            };
          })
        );
        return Response.json(enriched);
      }

      // GET /api/Rooms/{id}
      if (method === "GET" && segments[1] && !isNaN(Number(segments[1]))) {
        const id = Number(segments[1]);
        const [room] = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
        if (!room) return Response.json({ success: false, message: "Oda bulunamadı." }, { status: 404 });

        const [{ count }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(devices)
          .where(eq(devices.room, room.name));

        return Response.json({
          ...room,
          DeviceCount: count ?? 0,
          createdAt: room.createdAt ? room.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
        });
      }

      // POST /api/Rooms
      if (method === "POST") {
        const body = await req.json();
        if (!body?.Name) return Response.json({ success: false, message: "Oda adı zorunludur." }, { status: 400 });
        const [inserted] = await db.insert(rooms).values({
          name: body.Name,
          icon: body.Icon || "fa-door-open",
          description: body.Description || null,
        }).returning({ id: rooms.id });
        return Response.json({ success: true, id: inserted.id, message: "Oda oluşturuldu." });
      }

      // PUT /api/Rooms/{id}
      if (method === "PUT" && segments[1]) {
        const id = Number(segments[1]);
        const body = await req.json();
        await db.update(rooms).set({
          name: body.Name,
          icon: body.Icon || null,
          description: body.Description || null,
        }).where(eq(rooms.id, id));
        return Response.json({ success: true });
      }

      // DELETE /api/Rooms/{id}
      if (method === "DELETE" && segments[1]) {
        const id = Number(segments[1]);
        await db.delete(rooms).where(eq(rooms.id, id));
        return Response.json({ success: true });
      }
    }

    // ── Automations CRUD ────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "automations") {
      const fmtAuto = (a: typeof automations.$inferSelect) => ({
        Id: a.id,
        Name: a.name,
        Description: a.description ?? "",
        TriggerCondition: a.triggerCondition ?? "",
        ActionDescription: a.actionDescription ?? "",
        IsActive: a.isActive,
        LastRun: a.lastRun ? a.lastRun.toISOString().replace("T", " ").slice(0, 19) : null,
        CreatedAt: a.createdAt ? a.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
      });

      // GET /api/Automations
      if (method === "GET" && !segments[1]) {
        const all = await db.select().from(automations).orderBy(desc(automations.createdAt));
        return Response.json(all.map(fmtAuto));
      }

      // GET /api/Automations/{id}
      if (method === "GET" && segments[1] && !isNaN(Number(segments[1]))) {
        const [a] = await db.select().from(automations).where(eq(automations.id, Number(segments[1]))).limit(1);
        if (!a) return Response.json({ success: false, message: "Otomasyon bulunamadı." }, { status: 404 });
        return Response.json(fmtAuto(a));
      }

      // POST /api/Automations
      if (method === "POST") {
        const body = await req.json();
        if (!body?.Name) return Response.json({ success: false, message: "Otomasyon adı zorunludur." }, { status: 400 });
        const [ins] = await db.insert(automations).values({
          name: body.Name,
          description: body.Description || null,
          triggerCondition: body.TriggerCondition || null,
          actionDescription: body.ActionDescription || null,
          isActive: body.IsActive !== false,
        }).returning({ id: automations.id });
        return Response.json({ success: true, id: ins.id, message: "Otomasyon oluşturuldu." });
      }

      // PUT /api/Automations/{id}/toggle
      if (method === "PUT" && segments[1] && segments[2] === "toggle") {
        const id = Number(segments[1]);
        const [current] = await db.select({ isActive: automations.isActive }).from(automations).where(eq(automations.id, id)).limit(1);
        if (!current) return Response.json({ success: false, message: "Otomasyon bulunamadı." }, { status: 404 });
        const newState = !current.isActive;
        await db.update(automations).set({ isActive: newState }).where(eq(automations.id, id));
        return Response.json({ success: true, isActive: newState });
      }

      // PUT /api/Automations/{id}/run
      if (method === "PUT" && segments[1] && segments[2] === "run") {
        const id = Number(segments[1]);
        const now = new Date();
        await db.update(automations).set({ lastRun: now }).where(eq(automations.id, id));
        return Response.json({ success: true, message: "Otomasyon çalıştırıldı.", lastRun: now.toISOString().replace("T", " ").slice(0, 19) });
      }

      // PUT /api/Automations/{id}
      if (method === "PUT" && segments[1]) {
        const id = Number(segments[1]);
        const body = await req.json();
        await db.update(automations).set({
          name: body.Name,
          description: body.Description || null,
          triggerCondition: body.TriggerCondition || null,
          actionDescription: body.ActionDescription || null,
          isActive: body.IsActive !== false,
        }).where(eq(automations.id, id));
        return Response.json({ success: true });
      }

      // DELETE /api/Automations/{id}
      if (method === "DELETE" && segments[1]) {
        await db.delete(automations).where(eq(automations.id, Number(segments[1])));
        return Response.json({ success: true });
      }
    }

    // ── Sensors CRUD ────────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "sensors") {
      const fmtSensor = (s: typeof sensors.$inferSelect) => ({
        Id: s.id,
        Name: s.name,
        Type: s.type,
        Room: s.room ?? "",
        Location: s.location ?? "",
        Value: s.value,
        Unit: s.unit ?? "",
        Status: s.status,
        BatteryLevel: s.batteryLevel ?? null,
        LastUpdated: s.lastUpdated ? s.lastUpdated.toISOString().replace("T", " ").slice(0, 19) : "",
        CreatedAt: s.createdAt ? s.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
      });

      // GET /api/Sensors
      if (method === "GET" && !segments[1]) {
        const all = await db.select().from(sensors).orderBy(desc(sensors.id));
        return Response.json(all.map(fmtSensor));
      }

      // GET /api/Sensors/{id}
      if (method === "GET" && segments[1]) {
        const [s] = await db.select().from(sensors).where(eq(sensors.id, Number(segments[1]))).limit(1);
        if (!s) return Response.json({ success: false, message: "Sensör bulunamadı." }, { status: 404 });
        return Response.json(fmtSensor(s));
      }

      // POST /api/Sensors
      if (method === "POST") {
        const body = await req.json();
        if (!body?.Name) return Response.json({ success: false, message: "Sensör adı zorunludur." }, { status: 400 });
        const [ins] = await db.insert(sensors).values({
          name: body.Name,
          type: body.Type || "temperature",
          room: body.Room || null,
          location: body.Location || null,
          value: body.Value ?? 0,
          unit: body.Unit || null,
          status: body.Status || "online",
          batteryLevel: body.BatteryLevel ?? null,
        }).returning({ id: sensors.id });
        return Response.json({ success: true, id: ins.id, message: "Sensör başarıyla eklendi." });
      }

      // PUT /api/Sensors/{id}
      if (method === "PUT" && segments[1]) {
        const id = Number(segments[1]);
        const body = await req.json();
        await db.update(sensors).set({
          name: body.Name,
          type: body.Type || "temperature",
          room: body.Room || null,
          location: body.Location || null,
          value: body.Value ?? 0,
          unit: body.Unit || null,
          status: body.Status || "online",
          batteryLevel: body.BatteryLevel ?? null,
          lastUpdated: new Date(),
        }).where(eq(sensors.id, id));
        return Response.json({ success: true, message: "Sensör güncellendi." });
      }

      // DELETE /api/Sensors/{id}
      if (method === "DELETE" && segments[1]) {
        await db.delete(sensors).where(eq(sensors.id, Number(segments[1])));
        return Response.json({ success: true, message: "Sensör silindi." });
      }
    }

    // ── Notifications ───────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "notifications") {
      // GET /api/Notifications/stats
      if (method === "GET" && segments[1] === "stats") {
        const [stats] = await db
          .select({
            total: sql<number>`count(*)::int`,
            unread: sql<number>`sum(case when is_read = false then 1 else 0 end)::int`,
            critical: sql<number>`sum(case when priority = 'critical' then 1 else 0 end)::int`,
            warning: sql<number>`sum(case when priority = 'warning' then 1 else 0 end)::int`,
            automation: sql<number>`sum(case when category = 'automation' then 1 else 0 end)::int`,
          })
          .from(notifications);
        return Response.json({
          Total: stats.total ?? 0,
          Unread: stats.unread ?? 0,
          Critical: stats.critical ?? 0,
          Warning: stats.warning ?? 0,
          Automation: stats.automation ?? 0,
        });
      }

      // GET /api/Notifications
      if (method === "GET" && !segments[1]) {
        const params = url.searchParams;
        const limitParam = Number(params.get("limit") || 200);
        const all = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limitParam);
        return Response.json(
          all.map((n) => ({
            Id: n.id,
            Title: n.title,
            Message: n.message,
            Priority: n.priority,
            Category: n.category,
            IsRead: n.isRead,
            UserId: n.userId,
            CreatedAt: n.createdAt ? n.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
          }))
        );
      }

      // POST /api/Notifications
      if (method === "POST") {
        const body = await req.json();
        if (!body?.Title) return Response.json({ success: false, message: "Başlık zorunludur." }, { status: 400 });
        const [ins] = await db.insert(notifications).values({
          title: body.Title,
          message: body.Message || "",
          priority: body.Priority || "info",
          category: body.Category || "system",
          userId: body.UserId || null,
        }).returning({ id: notifications.id });
        return Response.json({ success: true, id: ins.id, message: "Bildirim oluşturuldu." });
      }

      // PUT /api/Notifications/readall
      if (method === "PUT" && segments[1] === "readall") {
        await db.update(notifications).set({ isRead: true });
        return Response.json({ success: true });
      }

      // PUT /api/Notifications/{id}/read
      if (method === "PUT" && segments[1] && segments[2] === "read") {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, Number(segments[1])));
        return Response.json({ success: true });
      }

      // DELETE /api/Notifications/clearall
      if (method === "DELETE" && segments[1] === "clearall") {
        await db.delete(notifications);
        return Response.json({ success: true });
      }

      // DELETE /api/Notifications/{id}
      if (method === "DELETE" && segments[1]) {
        await db.delete(notifications).where(eq(notifications.id, Number(segments[1])));
        return Response.json({ success: true });
      }
    }

    // ── GET /api/Logs ───────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "logs" && method === "GET") {
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const pageSize = Math.min(500, Math.max(1, Number(url.searchParams.get("pageSize") || 100)));
      const offset = (page - 1) * pageSize;

      const all = await db
        .select()
        .from(logs)
        .orderBy(desc(logs.id))
        .limit(pageSize)
        .offset(offset);

      return ok(
        all.map((l) => ({
          id: l.id,
          level: l.level ?? "INFO",
          message: l.message ?? "",
          source: l.source ?? "",
          createdAt: l.createdAt ? l.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
        }))
      );
    }

    // ── GET /api/SystemLogs ─────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "systemlogs") {
      if (method === "GET" && !segments[1]) {
        const page = Math.max(1, Number(url.searchParams.get("page") || 1));
        const pageSize = Math.min(500, Math.max(1, Number(url.searchParams.get("pageSize") || 100)));
        const offset = (page - 1) * pageSize;

        const all = await db.select().from(systemLogs).orderBy(desc(systemLogs.id)).limit(pageSize).offset(offset);
        const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(systemLogs);

        return ok({ logs: all, total, page, pageSize });
      }

      if (method === "GET" && segments[1] === "recent") {
        const count = Math.min(500, Math.max(1, Number(url.searchParams.get("count") || 100)));
        const all = await db.select().from(systemLogs).orderBy(desc(systemLogs.id)).limit(count);
        return ok(all);
      }

      if (method === "GET" && segments[1] === "dashboard") {
        const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(systemLogs);
        const [{ errors }] = await db.select({ errors: sql<number>`count(*)::int` }).from(systemLogs).where(eq(systemLogs.logLevel, "Error"));
        const recent = await db.select().from(systemLogs).orderBy(desc(systemLogs.id)).limit(10);
        return ok({ total, errors, recent });
      }
    }

    // ── Users ───────────────────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "users") {
      // GET /api/Users
      if (method === "GET" && !segments[1]) {
        const all = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            roleId: users.roleId,
            createdAt: users.createdAt,
          })
          .from(users)
          .orderBy(desc(users.id));

        const allRoles = await db.select().from(roles);
        const roleMap = Object.fromEntries(allRoles.map((r) => [r.id, r.name]));

        return Response.json(
          all.map((u) => ({
            Id: u.id,
            Username: u.username,
            Email: u.email ?? "",
            Role: u.roleId ? (roleMap[u.roleId] ?? "") : "",
            CreatedAt: u.createdAt ? u.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
          }))
        );
      }

      // PUT /api/Users/{id}/role
      if (method === "PUT" && segments[1] && segments[2] === "role") {
        const id = Number(segments[1]);
        const body = await req.json();
        if (!body?.Role) return Response.json({ success: false, message: "Rol belirtilmedi." }, { status: 400 });

        const [role] = await db.select().from(roles).where(eq(roles.name, body.Role)).limit(1);
        if (!role) return Response.json({ success: false, message: "Rol bulunamadı." }, { status: 404 });

        await db.update(users).set({ roleId: role.id }).where(eq(users.id, id));
        return Response.json({ success: true, message: "Kullanıcı rolü başarıyla güncellendi." });
      }
    }

    // ── GET /api/Commands ───────────────────────────────────────────────────
    if (segments[0]?.toLowerCase() === "commands" && method === "GET") {
      const all = await db.select().from(commands).orderBy(desc(commands.id)).limit(100);
      return Response.json(
        all.map((c) => ({
          Id: c.id,
          UserId: c.userId ?? 0,
          CommandText: c.commandText ?? "",
          ResponseText: c.responseText ?? "",
          Status: c.status ?? "",
          CreatedAt: c.createdAt ? c.createdAt.toISOString().replace("T", " ").slice(0, 19) : "",
        }))
      );
    }

    return Response.json({ success: false, error: "Endpoint bulunamadı." }, { status: 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sunucu hatası";
    await addLog("ERROR", message, "api-function");
    return Response.json({ success: false, error: "Sunucu hatası oluştu." }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/*",
};
