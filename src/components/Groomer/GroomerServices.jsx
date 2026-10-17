import GroomerLayout from './GroomerLayout';

// The price list the groomer works from. It is fixed text, so it is kept here.
const INDIVIDUAL = [
  ['Bath-Dry', 200],
  ['Tear Strain', 100],
  ['Eye Cleaning', 100],
  ['Nail Trimming', 100],
  ['Ear Cleaning', 100],
  ['Dematting', 300],
];

const PACKAGES = [
  { name: 'Basic Groom', price: '₱300-700', items: ['Bathing', 'Blow Drying', 'Nail Trimming', 'Haircut'] },
  { name: 'Full Groom', price: '₱400-800', items: ['Bathing', 'Blow Drying', 'Brushing', 'Nail Trimming', 'Ear Cleaning', 'Eye Cleaning', 'Haircut'] },
  { name: 'Groom & Massage', price: '₱600-1000', items: ['Bathing', 'Blow Drying', 'Brushing', 'Nail Trimming', 'Ear Cleaning', 'Eye Cleaning', 'Massage', 'Haircut'] },
];

const SIZES = [
  ['Small', '<5kgs'],
  ['Medium', '5.1-10kgs'],
  ['Large', '10.1-15kgs'],
  ['XLarge', '15.1-20kgs'],
  ['XXLarge', '20.1-50+ kgs'],
];

const RATES = [
  { name: 'Basic Groom', prices: [300, 400, 500, 600, 700] },
  { name: 'Full Groom', prices: [400, 500, 600, 700, 800] },
  { name: 'Groom & Massage', prices: [600, 700, 800, 900, 1000] },
];

function GroomerServices() {
  return (
    <GroomerLayout>
      <h1 className="gr-page-title">Services</h1>

      <h2 className="gr-sec">Individual Services</h2>
      <div className="gr-pill-grid">
        {INDIVIDUAL.map(([name, price]) => (
          <div key={name} className="gr-pill">
            <span>{name}</span>
            <span>₱{price}</span>
          </div>
        ))}
      </div>

      <h2 className="gr-sec">Package Service</h2>
      <div className="gr-pkg-grid">
        {PACKAGES.map((pkg) => (
          <div key={pkg.name} className="gr-pkg">
            <h3>{pkg.name}</h3>
            <div className="gr-price">{pkg.price}</div>
            <small>Inclusions:</small>
            <ul>
              {pkg.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2 className="gr-sec">Size Rates</h2>
      {RATES.map((rate) => (
        <div key={rate.name} className="gr-rates">
          <table>
            <caption>{rate.name}</caption>
            <thead>
              <tr>
                <th>Size</th>
                <th>Kgs</th>
                <th>Price</th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map(([size, kgs], i) => (
                <tr key={size}>
                  <td>{size}</td>
                  <td>{kgs}</td>
                  <td>{rate.prices[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </GroomerLayout>
  );
}

export default GroomerServices;