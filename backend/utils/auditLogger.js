import AuditLog from '../models/AuditLog.model.js';

export const logAction = async (action, entityType, entityId, userId, hospitalId, changes = {}, req = null) => {
  try {
    await AuditLog.create({
      action,
      entityType,
      entityId,
      userId,
      hospitalId,
      changes,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('user-agent'),
    });
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error - audit logging should not break the main flow
  }
};

