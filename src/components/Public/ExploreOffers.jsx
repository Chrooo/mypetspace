import PageShell from '../Layout/PageShell';

function ExploreOffers() {
  return (
    <PageShell
      title="Explore Our Offers"
      back="/about"
      links={[
        { label: 'Grooming Services', to: '/services/grooming' },
        { label: 'Hotel Rooms', to: '/rooms' },
      ]}
      planned={[
        'Pet Salon and Pampering Services',
        'Home Service Grooming',
        'Pet Transport',
        'Pet Merchandise',
        'Pet Meals',
      ]}
    />
  );
}

export default ExploreOffers;