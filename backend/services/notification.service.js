import Notification from '../models/Notification.model.js';
import { 
  sendNotificationToUser, 
  sendNotificationToHospital, 
  sendNotificationToRole, 
  broadcastEmergencyNotification,
  NotificationTypes 
} from '../utils/socket.js';
import User from '../models/User.model.js';
import PublicUser from '../models/PublicUser.model.js';
import BloodUnit from '../models/BloodUnit.model.js';
import BloodRequest from '../models/BloodRequest.model.js';
import Hospital from '../models/Hospital.model.js';

class NotificationService {
  // Create and send notification
  async createNotification(data) {
    const {
      recipient,
      recipientModel,
      type,
      title,
      message,
      priority = 'medium',
      actionRequired = false,
      actionUrl,
      actionText,
      createdBy,
      creatorModel = 'System',
      metadata = {}
    } = data;

    try {
      // Create notification in database
      const notification = await Notification.create({
        recipient,
        recipientModel,
        type,
        title,
        message,
        priority,
        actionRequired,
        actionUrl,
        actionText,
        createdBy,
        creatorModel,
        metadata
      });

      // Populate sender details
      await notification.populate('createdBy', 'firstName lastName email');

      // Send real-time notification
      const notificationData = {
        id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        actionRequired: notification.actionRequired,
        actionUrl: notification.actionUrl,
        actionText: notification.actionText,
        data: notification.metadata,
        createdAt: notification.createdAt,
        read: notification.read
      };

      sendNotificationToUser(recipient, notificationData);

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Blood request approved notification
  async notifyBloodRequestApproved(requestId, hospitalId) {
    try {
      const request = await BloodRequest.findById(requestId).populate('hospitalId');
      if (!request) return;

      const notification = await this.createNotification({
        recipient: request.requestedBy,
        recipientModel: 'User',
        type: NotificationTypes.BLOOD_REQUEST_APPROVED,
        title: 'Blood Request Approved',
        message: `Your blood request for ${request.bloodGroup} (${request.quantity} units) has been approved.`,
        priority: 'high',
        actionRequired: false,
        actionUrl: `/blood-requests/${requestId}`,
        actionText: 'View Request',
        metadata: {
          requestId: requestId,
          bloodGroup: request.bloodGroup,
          quantity: request.quantity,
          hospitalId: hospitalId
        }
      });

      return notification;
    } catch (error) {
      console.error('Error notifying blood request approved:', error);
    }
  }

  // Blood request rejected notification
  async notifyBloodRequestRejected(requestId, rejectionReason) {
    try {
      const request = await BloodRequest.findById(requestId);
      if (!request) return;

      const notification = await this.createNotification({
        recipient: request.requestedBy,
        recipientModel: 'User',
        type: NotificationTypes.BLOOD_REQUEST_REJECTED,
        title: 'Blood Request Rejected',
        message: `Your blood request for ${request.bloodGroup} (${request.quantity} units) has been rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`,
        priority: 'high',
        actionRequired: false,
        metadata: {
          requestId: requestId,
          bloodGroup: request.bloodGroup,
          quantity: request.quantity,
          rejectionReason
        }
      });

      return notification;
    } catch (error) {
      console.error('Error notifying blood request rejected:', error);
    }
  }

  // Blood request fulfilled notification
  async notifyBloodRequestFulfilled(requestId) {
    try {
      const request = await BloodRequest.findById(requestId);
      if (!request) return;

      const notification = await this.createNotification({
        recipient: request.requestedBy,
        recipientModel: 'User',
        type: NotificationTypes.BLOOD_REQUEST_FULFILLED,
        title: 'Blood Request Fulfilled',
        message: `Your blood request for ${request.bloodGroup} (${request.quantity} units) has been fulfilled successfully.`,
        priority: 'medium',
        actionRequired: false,
        actionUrl: `/blood-requests/${requestId}`,
        actionText: 'View Details',
        metadata: {
          requestId: requestId,
          bloodGroup: request.bloodGroup,
          quantity: request.quantity
        }
      });

      return notification;
    } catch (error) {
      console.error('Error notifying blood request fulfilled:', error);
    }
  }

  // Low stock alert
  async checkAndNotifyLowStock(hospitalId) {
    try {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) return;

      // Get current blood inventory
      const bloodInventory = await BloodUnit.aggregate([
        { $match: { hospitalId: hospitalId, status: 'Available' } },
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }
      ]);

      // Check each blood group against thresholds
      for (const group of bloodInventory) {
        const bloodGroup = group._id;
        const currentStock = group.count;
        const threshold = hospital.bloodThresholds?.[bloodGroup] || 10;

        if (currentStock <= threshold / 2) {
          // Critical stock alert
          await this.createNotification({
            recipient: hospital.adminId,
            recipientModel: 'User',
            type: NotificationTypes.CRITICAL_STOCK_ALERT,
            title: 'Critical Stock Alert',
            message: `CRITICAL: Blood group ${bloodGroup} is critically low. Current stock: ${currentStock} units`,
            priority: 'high',
            actionRequired: true,
            actionUrl: `/blood-units`,
            actionText: 'Manage Inventory',
            metadata: {
              hospitalId,
              bloodGroup,
              currentStock,
              threshold
            }
          });

          // Also notify super admins
          const superAdmins = await User.find({ role: 'super_admin' });
          for (const admin of superAdmins) {
            await this.createNotification({
              recipient: admin._id,
              recipientModel: 'User',
              type: NotificationTypes.CRITICAL_STOCK_ALERT,
              title: 'Critical Stock Alert - Hospital',
              message: `${hospital.name} reports critical stock for ${bloodGroup}: ${currentStock} units`,
              priority: 'high',
              actionRequired: false,
              metadata: {
                hospitalId,
                hospitalName: hospital.name,
                bloodGroup,
                currentStock
              }
            });
          }
        } else if (currentStock <= threshold) {
          // Low stock alert
          await this.createNotification({
            recipient: hospital.adminId,
            recipientModel: 'User',
            type: NotificationTypes.LOW_STOCK_ALERT,
            title: 'Low Stock Alert',
            message: `Blood group ${bloodGroup} is running low. Current stock: ${currentStock} units (Threshold: ${threshold})`,
            priority: 'medium',
            actionRequired: true,
            actionUrl: `/blood-units`,
            actionText: 'Manage Inventory',
            metadata: {
              hospitalId,
              bloodGroup,
              currentStock,
              threshold
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking low stock:', error);
    }
  }

  // Emergency broadcast
  async broadcastEmergencyNotification(title, message, priority = 'high', createdBy) {
    try {
      // Get all hospital admins and super admins
      const hospitalAdmins = await User.find({ role: 'hospital_admin' });
      const superAdmins = await User.find({ role: 'super_admin' });

      const allAdmins = [...hospitalAdmins, ...superAdmins];

      // Create notifications for all admins
      const notifications = await Promise.all(
        allAdmins.map(admin => 
          this.createNotification({
            recipient: admin._id,
            recipientModel: 'User',
            type: NotificationTypes.EMERGENCY_BROADCAST,
            title,
            message,
            priority,
            actionRequired: true,
            actionUrl: '/dashboard',
            actionText: 'View Dashboard',
            createdBy,
            creatorModel: 'User'
          })
        )
      );

      return notifications;
    } catch (error) {
      console.error('Error broadcasting emergency notification:', error);
    }
  }

  // Transfer request created
  async notifyTransferRequestCreated(transferId, fromHospitalId, toHospitalId) {
    try {
      const toHospital = await Hospital.findById(toHospitalId);
      if (!toHospital) return;

      const notification = await this.createNotification({
        recipient: toHospital.adminId,
        recipientModel: 'User',
        type: NotificationTypes.TRANSFER_REQUEST_CREATED,
        title: 'Blood Transfer Request',
        message: `New blood transfer request received. Please review and approve.`,
        priority: 'medium',
        actionRequired: true,
        actionUrl: `/inter-hospital-requests/${transferId}`,
        actionText: 'Review Request',
        metadata: {
          transferId,
          fromHospitalId,
          toHospitalId
        }
      });

      return notification;
    } catch (error) {
      console.error('Error notifying transfer request created:', error);
    }
  }

  // Transfer approved/rejected
  async notifyTransferStatusUpdated(transferId, status, fromHospitalId) {
    try {
      const fromHospital = await Hospital.findById(fromHospitalId);
      if (!fromHospital) return;

      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      const notificationType = status === 'approved' ? 
        NotificationTypes.TRANSFER_APPROVED : 
        NotificationTypes.TRANSFER_REJECTED;

      const notification = await this.createNotification({
        recipient: fromHospital.adminId,
        recipientModel: 'User',
        type: notificationType,
        title: `Transfer Request ${statusText}`,
        message: `Your blood transfer request has been ${statusText.toLowerCase()}.`,
        priority: status === 'approved' ? 'medium' : 'high',
        actionRequired: status === 'approved',
        actionUrl: `/inter-hospital-requests/${transferId}`,
        actionText: status === 'approved' ? 'View Details' : 'View Request',
        metadata: {
          transferId,
          fromHospitalId,
          status
        }
      });

      return notification;
    } catch (error) {
      console.error('Error notifying transfer status updated:', error);
    }
  }

  // Camp created notification
  async notifyCampCreated(campId, hospitalId) {
    try {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) return;

      // Notify hospital admin
      await this.createNotification({
        recipient: hospital.adminId,
        recipientModel: 'User',
        type: NotificationTypes.CAMP_CREATED,
        title: 'Blood Camp Created',
        message: 'New blood camp has been created successfully.',
        priority: 'medium',
        actionRequired: false,
        actionUrl: `/blood-camps/${campId}`,
        actionText: 'View Camp',
        metadata: {
          campId,
          hospitalId
        }
      });

      // Notify nearby public users (if location data available)
      const nearbyUsers = await PublicUser.find({
        isActive: true,
        bloodGroup: { $exists: true }
      }).limit(100); // Limit to avoid spam

      for (const user of nearbyUsers) {
        await this.createNotification({
          recipient: user._id,
          recipientModel: 'PublicUser',
          type: NotificationTypes.CAMP_CREATED,
          title: 'New Blood Camp Nearby',
          message: `A new blood donation camp has been organized. Register to donate!`,
          priority: 'low',
          actionRequired: false,
          actionUrl: '/user/camps',
          actionText: 'View Camps',
          metadata: {
            campId,
            hospitalId,
            hospitalName: hospital.name
          }
        });
      }
    } catch (error) {
      console.error('Error notifying camp created:', error);
    }
  }

  // Donor registered notification
  async notifyDonorRegistered(donorId, hospitalId) {
    try {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) return;

      await this.createNotification({
        recipient: hospital.adminId,
        recipientModel: 'User',
        type: NotificationTypes.DONOR_REGISTERED,
        title: 'New Donor Registered',
        message: 'A new donor has registered with your hospital.',
        priority: 'low',
        actionRequired: false,
        actionUrl: `/donors/${donorId}`,
        actionText: 'View Donor',
        metadata: {
          donorId,
          hospitalId
        }
      });
    } catch (error) {
      console.error('Error notifying donor registered:', error);
    }
  }

  // Hospital approved/rejected
  async notifyHospitalStatusUpdated(hospitalId, status, reason = '') {
    try {
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) return;

      const statusText = status === 'approved' ? 'Approved' : 'Rejected';
      const notificationType = status === 'approved' ? 
        NotificationTypes.HOSPITAL_APPROVED : 
        NotificationTypes.HOSPITAL_REJECTED;

      await this.createNotification({
        recipient: hospital.adminId,
        recipientModel: 'User',
        type: notificationType,
        title: `Hospital ${statusText}`,
        message: `Your hospital registration has been ${statusText.toLowerCase()}.${reason ? ` ${reason}` : ''}`,
        priority: 'high',
        actionRequired: status === 'approved',
        actionUrl: status === 'approved' ? '/dashboard' : '/register',
        actionText: status === 'approved' ? 'Go to Dashboard' : 'Contact Support',
        metadata: {
          hospitalId,
          status,
          reason
        }
      });
    } catch (error) {
      console.error('Error notifying hospital status updated:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId, userModel, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const notifications = await Notification.find({
        recipient: userId,
        recipientModel: userModel,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email');

      const total = await Notification.countDocuments({
        recipient: userId,
        recipientModel: userModel,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      const unreadCount = await Notification.getUnreadCount(userId, userModel);

      return {
        notifications,
        total,
        unreadCount,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId, userModel) {
    try {
      await Notification.markAllAsRead(userId, userModel);
      return { success: true };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Delete notification
  async deleteNotification(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        recipient: userId
      });

      return notification;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  // Cleanup expired notifications (run periodically)
  async cleanupExpiredNotifications() {
    try {
      const result = await Notification.cleanupExpired();
      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }
}

export default new NotificationService();
