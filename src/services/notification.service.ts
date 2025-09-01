import { NotificationModal } from "@/models/notification/index.js";
import type { Types } from "mongoose";

/**
 * Notification creation parameters
 */
export interface CreateNotificationParams {
  userId: Types.ObjectId | string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, any>;
  actionUrl?: string;
  status?: string;
}

/**
 * Create a notification for a user
 * @param params - Notification creation parameters
 */
export async function createNotificationService({
  userId,
  type,
  title,
  message,
  meta = {},
  actionUrl = '',
  status = 'sent',
}: CreateNotificationParams) {
  return NotificationModal.create({
    userId,
    type,
    title,
    message,
    meta,
    actionUrl,
    status,
  });
}
