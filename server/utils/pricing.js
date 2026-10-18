// Grooming prices.
// Individual services cost the same for every pet. A package has a price range (the shop's price list),
// and where the pet lands in that range depends on its weight:
//   Small  (up to 7 kg)      -> the lowest price of the range
//   Medium (over 7 to 15 kg) -> the middle of the range
//   Large  (over 15 kg)      -> the highest price of the range
// KEEP IN SYNC with src/data/groomingPrices.js
const INDIVIDUAL = {
  'Bath-Dry': 200,
  'Tear Strain': 100,
  'Eye Cleaning': 100,
  'Nail Trimming': 100,
  'Ear Cleaning': 100,
  Dematting: 300,
};
const PACKAGES = {
  'Basic Groom': [300, 600],
  'Full Groom': [400, 800],
  'Groom & Massage': [600, 1000],
};
const SMALL_MAX_KG = 7;
const MEDIUM_MAX_KG = 15;

// 0 = small, 1 = medium, 2 = large, null = the weight is not known
const sizeOf = (kg) => {
  const w = Number(kg);
  if (!(w > 0)) return null;
  return w <= SMALL_MAX_KG ? 0 : w <= MEDIUM_MAX_KG ? 1 : 2;
};

// the total for the chosen services and this pet's weight (kg)
// returns 0 when it cannot be worked out (a package was chosen but the pet has no weight yet)
const groomingTotal = (services, kg) => {
  const size = sizeOf(kg);
  let total = 0;
  for (const name of services) {
    if (INDIVIDUAL[name] !== undefined) {
      total += INDIVIDUAL[name];
    } else if (PACKAGES[name]) {
      if (size === null) return 0;
      const [min, max] = PACKAGES[name];
      total += min + ((max - min) / 2) * size;
    }
  }
  return total;
};

module.exports = { groomingTotal, sizeOf, SMALL_MAX_KG, MEDIUM_MAX_KG };