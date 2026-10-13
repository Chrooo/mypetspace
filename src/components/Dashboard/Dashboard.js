import { Button, Card, Tag, Typography } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../../auth';
import logo from '../../assets/logo.png';

const { Title, Text } = Typography;

const ROLES = {
  admin: { label: 'Admin', color: '#EE2A7B' },
  staff: { label: 'Hotel Staff', color: '#0E969C' },
  groomer: { label: 'Groomer', color: '#D99A72' },
  customer: { label: 'Fur Parent', color: '#C9A58C' },
};

// Temporary page so you can check that login and roles work.
// Each role gets its own dashboard in the later modules.
function Dashboard() {
  const navigate = useNavigate();
  const user = getUser(); // ProtectedRoute makes sure the user exists
  const role = ROLES[user.role] || ROLES.customer;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <img src={logo} alt="My Pet Space" style={{ height: 72 }} />
        <Button icon={<LogoutOutlined />} onClick={handleLogout}>
          Log out
        </Button>
      </header>

      <Card>
        <Title level={3} style={{ marginTop: 0 }}>
          Hi, {user.fullName}!
        </Title>
        <Text>You're logged in as </Text>
        <Tag color={role.color} style={{ fontWeight: 700 }}>
          {role.label}
        </Tag>
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">{user.identifier}</Text>
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;