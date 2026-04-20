// Smart Donor Matching - Find nearest eligible donors when stock is low

export const findNearestEligibleDonors = async (Donor, bloodGroup, hospitalLocation, radiusKm = 50) => {
  try {
    let longitude, latitude;
    
    // Handle both formats: {latitude, longitude} or GeoJSON {type: 'Point', coordinates: [lng, lat]}
    if (hospitalLocation.coordinates && Array.isArray(hospitalLocation.coordinates)) {
      [longitude, latitude] = hospitalLocation.coordinates;
    } else {
      latitude = hospitalLocation.latitude;
      longitude = hospitalLocation.longitude;
    }

    if (!latitude || !longitude) {
      throw new Error('Hospital location coordinates are required');
    }

    // Calculate eligible donors (not donated in last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const eligibleDonors = await Donor.find({
      bloodGroup: bloodGroup,
      isEligible: true,
      $or: [
        { lastDonationDate: { $lt: ninetyDaysAgo } },
        { lastDonationDate: { $exists: false } },
      ],
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusKm * 1000, // Convert km to meters
        },
      },
    })
      .select('firstName lastName phone email location lastDonationDate totalDonations')
      .limit(20);

    // Calculate distance for each donor
    const donorsWithDistance = eligibleDonors.map((donor) => {
      if (!donor.location || !donor.location.coordinates) {
        return null;
      }

      const [donorLng, donorLat] = donor.location.coordinates;
      const distance = calculateDistance(latitude, longitude, donorLat, donorLng);

      return {
        ...donor.toObject(),
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
      };
    }).filter(Boolean).sort((a, b) => a.distance - b.distance);

    return donorsWithDistance;
  } catch (error) {
    throw new Error(`Donor matching failed: ${error.message}`);
  }
};

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

