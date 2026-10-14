import PageShell from '../Layout/PageShell';

function AboutUs() {
  return (
    <PageShell
      title="About Us"
      subtitle="Get to know My Pet Space Hotel & Snack Bar."
      links={[
        { label: 'Our Facilities', to: '/about/facilities' },
        { label: 'Explore Our Offers', to: '/about/offers' },
      ]}
      planned={[
        'Story of My Pet Space',
        'Location, contact details and opening hours',
      ]}
    />
  );
}

export default AboutUs;