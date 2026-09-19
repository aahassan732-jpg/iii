import { notifications } from "../drizzle/schema";
import { getDb, getDueMonitors, markMonitorRun, searchAndSnapshot } from "./db";

export async function runDueMonitoring() {
  const due = await getDueMonitors(); let checked = 0; let changed = 0; let failed = 0;
  for (const item of due) {
    const monitor = item.monitor;
    try {
      if (!item.profile?.username) throw new Error("monitor profile not found");
      const result = await searchAndSnapshot(item.profile.username);
      checked += 1; changed += result.changes.length;
      const db = await getDb();
      if (db && result.changes.length) await db.insert(notifications).values({ userId: monitor.userId, title: "تغيير جديد في الحساب", body: `تم اكتشاف ${result.changes.length} تغييرًا في الحساب الذي تراقبه.`, type: "PROFILE_CHANGE" });
      await markMonitorRun(monitor.id, monitor.frequencyMinutes);
    } catch (error) {
      failed += 1;
      console.warn(`[Monitoring] monitor ${monitor.id} failed:`, error instanceof Error ? error.message : error);
      await markMonitorRun(monitor.id, monitor.frequencyMinutes);
    }
  }
  return { ok: true, checked, changed, failed };
}
