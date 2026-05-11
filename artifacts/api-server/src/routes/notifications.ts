import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate } from "../lib/auth";
import { ListNotificationsQueryParams, MarkNotificationReadParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/notifications", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const parsed = ListNotificationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const notifications = await db.select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, user.id),
        parsed.data.unreadOnly ? eq(notificationsTable.isRead, false) : undefined,
      )
    )
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map(n => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    referenceId: n.referenceId,
    referenceType: n.referenceType,
    createdAt: n.createdAt.toISOString(),
  })));
});

router.patch("/notifications/:notificationId/read", authenticate, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [notification] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, params.data.notificationId), eq(notificationsTable.userId, user.id)))
    .returning();

  if (!notification) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }

  res.json({
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    isRead: notification.isRead,
    referenceId: notification.referenceId,
    referenceType: notification.referenceType,
    createdAt: notification.createdAt.toISOString(),
  });
});

export default router;
