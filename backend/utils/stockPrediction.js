// AI-lite Blood Stock Prediction
// Uses historical data to predict low stock scenarios

export const predictStockLevel = async (BloodUnit, bloodGroup, hospitalId) => {
  try {
    // Get historical data for the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historicalData = await BloodUnit.aggregate([
      {
        $match: {
          hospitalId: hospitalId,
          bloodGroup: bloodGroup,
          collectionDate: { $gte: ninetyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$collectionDate' },
          },
          collected: { $sum: 1 },
          issued: {
            $sum: {
              $cond: [{ $eq: ['$status', 'issued'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Get current stock
    const currentStock = await BloodUnit.countDocuments({
      hospitalId: hospitalId,
      bloodGroup: bloodGroup,
      status: { $in: ['available', 'reserved'] },
      expiryDate: { $gt: new Date() },
    });

    // Simple moving average calculation
    const avgDailyCollection = historicalData.length > 0
      ? historicalData.reduce((sum, day) => sum + day.collected, 0) / historicalData.length
      : 0;

    const avgDailyIssue = historicalData.length > 0
      ? historicalData.reduce((sum, day) => sum + day.issued, 0) / historicalData.length
      : 0;

    const netDailyChange = avgDailyCollection - avgDailyIssue;

    // Predict days until low stock (assuming low stock threshold is 10 units)
    const lowStockThreshold = 10;
    const daysUntilLowStock = netDailyChange < 0 && currentStock > lowStockThreshold
      ? Math.ceil((currentStock - lowStockThreshold) / Math.abs(netDailyChange))
      : null;

    // Risk level calculation
    let riskLevel = 'low';
    if (currentStock < 5) {
      riskLevel = 'critical';
    } else if (currentStock < 10) {
      riskLevel = 'high';
    } else if (currentStock < 20) {
      riskLevel = 'medium';
    }

    return {
      currentStock,
      avgDailyCollection: Math.round(avgDailyCollection * 10) / 10,
      avgDailyIssue: Math.round(avgDailyIssue * 10) / 10,
      netDailyChange: Math.round(netDailyChange * 10) / 10,
      daysUntilLowStock,
      riskLevel,
      prediction: daysUntilLowStock
        ? `Low stock predicted in ${daysUntilLowStock} days`
        : 'Stock level stable',
    };
  } catch (error) {
    throw new Error(`Stock prediction failed: ${error.message}`);
  }
};

