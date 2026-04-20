import notificationService from '../services/notification.service.js';
import Hospital from '../models/Hospital.model.js';

class StockMonitorJob {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
  }

  start() {
    if (this.isRunning) {
      console.log('📊 Stock monitor job is already running');
      return;
    }

    console.log('📊 Starting stock monitor job...');
    this.isRunning = true;
    
    // Run immediately on start
    this.checkLowStock();
    
    // Set up interval
    this.interval = setInterval(() => {
      this.checkLowStock();
    }, this.checkInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('📊 Stock monitor job stopped');
  }

  async checkLowStock() {
    try {
      console.log('📊 Checking stock levels for all hospitals...');
      
      // Get all approved hospitals
      const hospitals = await Hospital.find({ isApproved: true });
      
      for (const hospital of hospitals) {
        try {
          await notificationService.checkAndNotifyLowStock(hospital._id);
        } catch (error) {
          console.error(`Error checking stock for hospital ${hospital.name}:`, error);
        }
      }
      
      console.log('📊 Stock level check completed');
    } catch (error) {
      console.error('Error in stock monitor job:', error);
    }
  }

  // Manual trigger for testing
  async runOnce() {
    await this.checkLowStock();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      nextRun: this.interval ? new Date(Date.now() + this.checkInterval) : null
    };
  }
}

// Create singleton instance
const stockMonitorJob = new StockMonitorJob();

export default stockMonitorJob;
