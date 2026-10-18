// Grooming prices. Individual services cost the same for every pet. A package has a price range,
// and where the pet lands in that range depends on its weight:
//   Small  (up to 7 kg)      -> the lowest price of the range
//   Medium (over 7 to 15 kg) -> the middle of the range
//   Large  (over 15 kg)      -> the highest price of the range
// KEEP IN SYNC with server/utils/pricing.js
export const INDIVIDUAL_PRICES = {
  'Bath-Dry': 200,
  'Tear Strain': 100,
  'Eye Cleaning': 100,
  'Nail Trimming': 100,
  'Ear Cleaning': 100,
  Dematting: 300,
};
export const PACKAGE_PRICES = {
  'Basic Groom': [300, 600],
  'Full Groom': [400, 800],
  'Groom & Massage': [600, 1000],
};
export const SMALL_MAX_KG = 7;
export const MEDIUM_MAX_KG = 15;

// 0 = small, 1 = medium, 2 = large, null = the weight is not known
export const sizeOf = (kg) => {
  const w = Number(kg);
  if (!(w > 0)) return null;
  return w <= SMALL_MAX_KG ? 0 : w <= MEDIUM_MAX_KG ? 1 : 2;
};

export const SIZE_LABELS = ['Small', 'Medium', 'Large'];

// the total for the chosen services and the pet's weight (kg); 0 = cannot be worked out yet
export const groomingTotal = (services, kg) => {
  const size = sizeOf(kg);
  let total = 0;
  for (const name of services) {
    if (INDIVIDUAL_PRICES[name] !== undefined) {
      total += INDIVIDUAL_PRICES[name];
    } else if (PACKAGE_PRICES[name]) {
      if (size === null) return 0;
      const [min, max] = PACKAGE_PRICES[name];
      total += min + ((max - min) / 2) * size;
    }
  }
  return total;
};