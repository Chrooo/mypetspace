import { useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input, Tooltip } from 'antd';
import { LockOutlined, MailOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { API_URL, getUser, saveLogin } from '../../auth';
import logo from '../../assets/logo.png';
import './Login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(\+63|0)9\d{9}$/;

// the "Email or phone" field accepts either one
const checkIdentifier = (_, value) => {
  const v = (value || '').trim();
  if (!v || EMAIL_RE.test(v) || PHONE_RE.test(v.replace(/[\s-]/g, ''))) return Promise.resolve();
  return Promise.reject(new Error('Enter a valid email or a mobile number like 09123456789'));
};

// small brand icons for the social buttons
const FacebookIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="12" fill="#fff" />
    <path d="M13.4 20v-7h2.3l.4-2.8h-2.7V8.5c0-.8.3-1.3 1.4-1.3h1.4V4.7c-.3 0-1.1-.1-2.1-.1-2.1 0-3.5 1.3-3.5 3.6v2H8.3V13h2.3v7z" fill="#1877f2" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.2 5.5-4.7 7.2l7.6 5.9c4.4-4.1 6.9-10.1 6.9-17.6z" />
    <path fill="#FBBC05" d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.900-2.100 15.900-5.800l-7.600-5.900c-2.100 1.400-4.900 2.300-8.300 2.300-6.300 0-11.600-4-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z" />
  </svg>
);

function Login() {
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
      const response = await axios.post(`${API_URL}/login`, values);

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

  // step 2 of logging in
  const verifyPanel = (
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

        <Button type="primary" htmlType="submit" block loading={submitting} className="lg-submit">
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
  );

  return (
    <div className="lg-shell">
      <div className="lg-card">
        <Link to="/" className="lg-brand" aria-label="Back to home">
          <img src={logo} alt="My Pet Space pet hotel and snack bar" />
        </Link>

        <section className="lg-form">
          <h1 className="lg-title">{ticket ? 'TWO-STEP VERIFICATION' : 'LOGIN'}</h1>

          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 14 }} />}

          {ticket ? (
            verifyPanel
          ) : (
            <>
              <Form layout="vertical" requiredMark={false} onFinish={onFinish} size="large" validateDebounce={400}>
                <Form.Item
                  name="identifier"
                  validateFirst
                  rules={[
                    { required: true, message: 'Enter your email or phone number' },
                    { validator: checkIdentifier },
                  ]}
                >
                  <Input
                    className="lg-input"
                    prefix={<MailOutlined />}
                    placeholder="Email or Phone *"
                    autoComplete="username"
                  />
                </Form.Item>

                <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
                  <Input.Password
                    className="lg-input"
                    prefix={<LockOutlined />}
                    placeholder="Password *"
                    autoComplete="current-password"
                  />
                </Form.Item>

                <div className="lg-forgot">
                  <Tooltip title="Coming soon">
                    <span>Forgot Password?</span>
                  </Tooltip>
                </div>

                <Button type="primary" htmlType="submit" block loading={submitting} className="lg-submit">
                  Login
                </Button>
              </Form>

              <div className="lg-lazy">
                <span>Feeling lazy?</span>
              </div>

              <div className="lg-social">
                <Tooltip title="Coming soon">
                  <Button disabled className="lg-fb" icon={<FacebookIcon />}>
                    Facebook
                  </Button>
                </Tooltip>
                <span className="lg-or">OR</span>
                <Tooltip title="Coming soon">
                  <Button disabled className="lg-google" icon={<GoogleIcon />}>
                    Google
                  </Button>
                </Tooltip>
              </div>

              <p className="lg-switch">
                New to MyPetSpace? <Link to="/signup">Sign up here.</Link>
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default Login;