import { Request } from "express";
import { db } from "../helpers/db";

export class AuditService {
  
  static async log(
    req: Request, 
    action: string, 
    entityType: string, 
    entityId: number | string, 
    description: string
  ): Promise<void> {
    try {
      const performingUserId = (req as any).user?.user_id || (req as any).user?.id;
      
      if (!performingUserId) {
        console.warn('Audit Log attempted without a valid user session.');
        return;
      }

      await db.connection!.run(
        `INSERT INTO audit_log (user_id, action_type, entity_type, entity_id, description) 
         VALUES (?, ?, ?, ?, ?)`,
        [performingUserId, action, entityType, entityId, description]
      );
    } catch (error) {
      console.error('Failed to write to audit_log:', error);
    }
  }
}