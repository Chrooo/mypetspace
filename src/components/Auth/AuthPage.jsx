import { useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Divider, Form, Input, Tooltip } from 'antd';
import { FacebookFilled, GoogleOutlined, LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { API_URL, getUser, saveLogin } from '../../auth';
import logo from '../../assets/logo.png';
import './AuthPage.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;

// the "Email or phone" field accepts either one
const checkIdentifier = (_, value) => {
  const v = (value || '').trim();
  if (!v || EMAIL_RE.test(v) || PHONE_RE.test(v.replace(/[\s-]/g, ''))) return Promise.resolve();
  return Promise.reject(new Error('Enter a valid email or a mobile number like 09123456789'));
};

const COPY = {
  login: {
    title: 'Log in',
    welcome: 'Welcome back!',
    sub: 'Your fur babies have been waiting. Log in to manage their stays and grooming.',
    button: 'Log in',
    switchText: 'New to My Pet Space?',
    switchLink: 'Sign up',
    switchTo: '/signup',
  },
  signup: {
    title: 'Sign up',
    welcome: 'Welcome to My Pet Space',
    sub: 'Create a Fur Parent account to book stays, grooming, and more for your pets.',
    button: "Let's get started!",
    switchText: 'Already a member?',
    switchLink: 'Log in',
    switchTo: '/login',
  },
};

function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const copy = COPY[mode];
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // already logged in? go straight to the dashboard
  if (getUser()) return <Navigate to="/dashboard" replace />;

  const onFinish = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/${isSignup ? 'register' : 'login'}`, values);
      saveLogin(response.data); // saves the token and the user
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        {/* Left: brand panel */}
        <aside className="auth-brand">
          <span className="ring ring-pink" />
          <span className="ring ring-cream" />
          <span className="dot dot-cream" />
          <span className="dot dot-pink" />
          <div className="auth-brand-text">
            <h1>{copy.welcome}</h1>
            <p>{copy.sub}</p>
          </div>
          <div className="auth-brand-logo">
            <img src={logo} alt="My Pet Space pet hotel and snack bar" />
          </div>
        </aside>

        {/* Right: form */}
        <main className="auth-main">
          <nav className="auth-nav">
            <Link to="/" aria-label="Back to home">
              <img src={logo} alt="My Pet Space" className="auth-nav-logo" />
            </Link>
          </nav>

          <section className="auth-form-wrap">
            <h2 className="auth-title">{copy.title}</h2>

            {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

            <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large">
              {isSignup && (
                <Form.Item name="fullName" rules={[{ required: true, message: 'Enter your full name' }]}>
                  <Input prefix={<UserOutlined />} placeholder="Full name" autoComplete="name" />
                </Form.Item>
              )}

              <Form.Item
                name="identifier"
                rules={[{ required: true, message: 'Enter your email or phone number' }, { validator: checkIdentifier }]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email or phone" autoComplete="username" />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Enter your password' },
                  ...(isSignup
                    ? [
                        { min: 8, message: 'Use at least 8 characters' },
                        { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Include at least one letter and one number' },
                      ]
                    : []),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={submitting} className="auth-submit">
                {copy.button}
              </Button>
            </Form>

            <Divider plain className="auth-divider">
              If feeling lazy?
            </Divider>

            <div className="auth-social">
              <Tooltip title="Coming soon">
                <Button block disabled icon={<FacebookFilled />} className="btn-facebook">
                  Facebook
                </Button>
              </Tooltip>
              <Tooltip title="Coming soon">
                <Button block disabled icon={<GoogleOutlined />} className="btn-google">
                  Google
                </Button>
              </Tooltip>
            </div>

            <p className="auth-switch">
              {copy.switchText} <Link to={copy.switchTo}>{copy.switchLink}</Link>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default AuthPage;
