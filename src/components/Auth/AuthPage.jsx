import { useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Divider, Form, Input, Tooltip } from 'antd';
import { FacebookFilled, GoogleOutlined, LockOutlined, MailOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { API_URL, checkAvailable, getUser, saveLogin } from '../../auth';
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

// first / last name: letters, spaces, apostrophes, periods and hyphens
const nameRules = (label) => [
  { required: true, whitespace: true, message: `Enter your ${label}` },
  { pattern: /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'-]*$/, message: 'Letters only, please' },
  { max: 50, message: 'Maximum of 50 characters' },
];

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
  const [ticket, setTicket] = useState(null); // set after the password is right and the account uses 2FA
  const [useRecovery, setUseRecovery] = useState(false); // typing a recovery code instead of the app code

  // already logged in? go straight to the dashboard
  if (getUser()) return <Navigate to="/dashboard" replace />;

  const onFinish = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/${isSignup ? 'register' : 'login'}`, values);

      // two-factor is on for this account: ask for the code before logging in
      if (response.data.twoFactorRequired) {
        setTicket(response.data.twoFactorToken);
        setSubmitting(false);
        return;
      }

      saveLogin(response.data); // saves the token and the user
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  };

  // step 2 of logging in: the 6-digit code (or a recovery code)
  const onVerify = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/login/2fa`, { twoFactorToken: ticket, code: values.code });
      saveLogin(response.data);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
      setSubmitting(false);
    }
  };

  const backToLogin = () => {
    setTicket(null);
    setUseRecovery(false);
    setError('');
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
            <h2 className="auth-title">{ticket ? 'Two-step verification' : copy.title}</h2>

            {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}

            {ticket ? (
              <>
                <p style={{ margin: '0 0 16px', textAlign: 'center', lineHeight: 1.5 }}>
                  {useRecovery
                    ? 'Enter one of your recovery codes. Each code works only once.'
                    : 'Open your authenticator app and enter the 6-digit code for My Pet Space.'}
                </p>

                <Form key={useRecovery ? 'recovery' : 'app'} layout="vertical" requiredMark={false} onFinish={onVerify} size="large">
                  <Form.Item
                    name="code"
                    rules={[
                      { required: true, message: useRecovery ? 'Enter a recovery code' : 'Enter the 6-digit code' },
                      ...(useRecovery ? [] : [{ pattern: /^\s*\d{3}\s?\d{3}\s*$/, message: 'The code has 6 digits' }]),
                    ]}
                  >
                    <Input
                      prefix={<SafetyCertificateOutlined />}
                      placeholder={useRecovery ? 'Recovery code (like a1b2c-3d4e5)' : '6-digit code'}
                      inputMode={useRecovery ? 'text' : 'numeric'}
                      autoComplete="one-time-code"
                      autoFocus
                    />
                  </Form.Item>

                  <Button type="primary" htmlType="submit" block loading={submitting} className="auth-submit">
                    Verify
                  </Button>
                </Form>

                <p style={{ margin: '22px 0 0', textAlign: 'center', fontSize: 14 }}>
                  <Button type="link" onClick={() => { setUseRecovery(!useRecovery); setError(''); }}>
                    {useRecovery ? 'Use my authenticator app' : 'Use a recovery code instead'}
                  </Button>
                  <br />
                  <Button type="link" onClick={backToLogin}>Back to login</Button>
                </p>
              </>
            ) : (
              <>
            <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large" validateDebounce={400}>
              {isSignup && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item name="firstName" rules={nameRules('first name')} hasFeedback style={{ flex: 1 }}>
                    <Input prefix={<UserOutlined />} placeholder="First name" autoComplete="given-name" />
                  </Form.Item>
                  <Form.Item name="lastName" rules={nameRules('last name')} hasFeedback style={{ flex: 1 }}>
                    <Input placeholder="Last name" autoComplete="family-name" />
                  </Form.Item>
                </div>
              )}

              <Form.Item
                name="identifier"
                validateFirst
                hasFeedback={isSignup}
                rules={[
                  { required: true, message: 'Enter your email or phone number' },
                  { validator: checkIdentifier },
                  ...(isSignup ? [{ validator: checkAvailable }] : []),
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email or phone" autoComplete="username" />
              </Form.Item>

              <Form.Item
                name="password"
                hasFeedback={isSignup}
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
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AuthPage;