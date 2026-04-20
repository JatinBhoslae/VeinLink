import { addDays } from 'date-fns';

/**
 * Calculate the next eligible donation date based on gender and last donation date.
 * Rules:
 * - Male: 90 days after last donation
 * - Female/Other: 120 days after last donation
 * 
 * @param {Date} lastDonationDate 
 * @param {String} gender 
 * @returns {Date}
 */
export const calculateNextEligibleDate = (lastDonationDate, gender) => {
  if (!lastDonationDate) return new Date();
  
  const daysToAdd = gender?.toLowerCase() === 'male' ? 90 : 120;
  return addDays(new Date(lastDonationDate), daysToAdd);
};
