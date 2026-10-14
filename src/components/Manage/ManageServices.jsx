import DashboardShell from '../Layout/DashboardShell';

function ManageServices() {
  return (
    <DashboardShell
      title="Grooming Services"
      back
      planned={[
        'Bath, blow-drying, haircut, nail trimming, ear cleaning, full package',
        'Duration and price of each service',
        'Grooming packages',
        'Additional services: meals and transport',
      ]}
    />
  );
}

export default ManageServices;