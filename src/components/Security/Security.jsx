import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Form, Input } from 'antd';
import { ArrowLeftOutlined, CheckCircleFilled, CloseCircleFilled, CopyOutlined } from '@ant-design/icons';
import { API_URL, roleHome, useUser } from '../../auth';
import { AvatarImage } from '../Customer/Avatar';
import logo from '../../assets/logo.png';
import './Security.css';

// Each role keeps its own colors (the same ones its dashboard uses).
const ROLE_THEME = {
  customer: { cls: 'sec-customer', title: 'User Dashboard', profile: '/account/profile' },
  groomer: { cls: 'sec-groomer', title: 'Groomer Dashboard', profile: '/groomer/profile' },
  staff: { cls: 'sec-staff', title: 'Staff Dashboard', profile: '/staff/profile' },
  admin: { cls: 'sec-admin', title: 'Admin Dashboard', profile: '/admin/profile' },
};

// Turn two-factor authentication (authenticator app) on or off.
// Open to every logged-in role at /security.
function Security() {
  const navigate = useNavigate();
  const user = useUser(); // the route guard makes sure a user exists
  const theme = ROLE_THEME[user?.role] || ROLE_THEME.customer;
  const home = roleHome(user?.role);

  const [status, setStatus] = useState(null); // { enabled, recoveryCodesLeft }
  const [mode, setMode] = useState('idle'); // idle | password | scan | codes | disable
  const [setupData, setSetupData] = useState(null); // { secret, qr }
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [notice, setNotice] = useState(null); // { type, text }
  const [busy, setBusy] = useState(false);

  const loadStatus = () =>
    axios
      .get(`${API_URL}/2fa/status`)
      .then((response) => setStatus(response.data))
      .catch((err) => setNotice({ type: 'error', text: err.response?.data?.message || 'Could not load your security settings.' }));

  useEffect(() => {
    loadStatus();
  }, []);

  // runs a request, shows the server's error message if it fails
  const run = async (request, onDone) => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await request();
      onDone(response.data);
    } catch (err) {
      setNotice({ type: 'error', text: err.response?.data?.message || 'Could not reach the server. Please try again.' });
    } finally {
      setBusy(false);
    }
  };

  // step 1: password, then the server gives the QR code
  const startSetup = (values) =>
    run(
      () => axios.post(`${API_URL}/2fa/setup`, { password: values.password }),
      (data) => {
        setSetupData(data);
        setMode('scan');
      }
    );

  // step 2: the first code from the app turns it on
  const confirmSetup = (values) =>
    run(
      () => axios.post(`${API_URL}/2fa/enable`, { code: values.code }),
      (data) => {
        setRecoveryCodes(data.recoveryCodes);
        setSetupData(null);
        setMode('codes');
      }
    );

  const turnOff = (values) =>
    run(
      () => axios.post(`${API_URL}/2fa/disable`, { password: values.password, code: values.code }),
      () => {
        setMode('idle');
        setNotice({ type: 'success', text: 'Two-factor authentication is now off.' });
        loadStatus();
      }
    );

  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join('\n'));
      setNotice({ type: 'success', text: 'Recovery codes copied.' });
    } catch (err) {
      setNotice({ type: 'error', text: 'Could not copy. Please write the codes down.' });
    }
  };

  const finishCodes = () => {
    setRecoveryCodes([]);
    setMode('idle');
    setNotice({ type: 'success', text: 'Two-factor authentication is now on. You will be asked for a code each time you log in.' });
    loadStatus();
  };

  const cancel = () => {
    setMode('idle');
    setSetupData(null);
    setNotice(null);
  };

  // small round button used all over this page
  const Btn = ({ kind = 'solid', danger = false, loading = false, htmlType = 'button', onClick, children }) => (
    <button
      type={htmlType}
      className={`sec-btn sec-btn-${kind}${danger ? ' sec-danger' : ''}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? 'Please wait...' : children}
    </button>
  );

  return (
    <div className={`sec ${theme.cls}`}>
      {/* ---------- top bar (same as the role's dashboard) ---------- */}
      <header className="sec-top">
        <Link to={home} aria-label={theme.title}>
          <img src={logo} alt="My Pet Space" className="sec-logo" />
        </Link>
        <div className="sec-top-right">
          <span className="sec-top-title">{theme.title}</span>
          <button type="button" className="sec-back" aria-label="Back" onClick={() => navigate(-1)}>
            <ArrowLeftOutlined />
          </button>
          <Link to={theme.profile} className="sec-avatar" aria-label="My profile">
            <AvatarImage src={user?.avatar} />
          </Link>
        </div>
      </header>

      {/* ---------- page ---------- */}
      <main className="sec-main">
      
        <h1 className="sec-h1">Security</h1>
        <p className="sec-sub">Protect your account with a code from your phone.</p>

        {notice && <Alert className="sec-alert" type={notice.type} showIcon title={notice.text} />}

        <section className="sec-card">
          <div className="sec-card-head">
            <h2>Two-factor authentication</h2>
            {status && (
              <span className={`sec-badge ${status.enabled ? 'on' : 'off'}`}>
                {status.enabled ? <CheckCircleFilled /> : <CloseCircleFilled />} {status.enabled ? 'On' : 'Off'}
              </span>
            )}
          </div>

          <div className="sec-card-body">
            {!status && <p className="sec-text">Loading...</p>}

            {/* ---------- off ---------- */}
            {status && !status.enabled && mode === 'idle' && (
              <>
                <p className="sec-text">
                  Status: <strong>Off</strong>. When it is on, logging in also needs a 6-digit code from an
                  authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.
                </p>
                <div className="sec-actions">
                  <Btn onClick={() => { setNotice(null); setMode('password'); }}>Turn on two-factor authentication</Btn>
                </div>
              </>
            )}

            {mode === 'password' && (
              <Form layout="vertical" requiredMark={false} onFinish={startSetup} className="sec-form">
                <p className="sec-text">Type your password to continue.</p>
                <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
                  <Input.Password className="sec-input" placeholder="Password" autoComplete="current-password" />
                </Form.Item>
                <div className="sec-actions">
                  <Btn htmlType="submit" loading={busy}>Confirm</Btn>
                  <Btn kind="outline" onClick={cancel}>Cancel</Btn>
                </div>
              </Form>
            )}

            {mode === 'scan' && setupData && (
              <>
                <p className="sec-step"><span>1</span> Open your authenticator app and scan this QR code.</p>
                <div className="sec-qr">
                  <img src={setupData.qr} alt="QR code for your authenticator app" width={220} height={220} />
                </div>
                <p className="sec-text sec-key-note">
                  Cannot scan? Choose "enter a setup key" in the app and type this key:
                </p>
                <code className="sec-key">{setupData.secret}</code>

                <Form layout="vertical" requiredMark={false} onFinish={confirmSetup} className="sec-form">
                  <p className="sec-step"><span>2</span> Type the 6-digit code the app shows now.</p>
                  <Form.Item
                    name="code"
                    rules={[
                      { required: true, message: 'Enter the 6-digit code' },
                      { pattern: /^\s*\d{3}\s?\d{3}\s*$/, message: 'The code has 6 digits' },
                    ]}
                  >
                    <Input className="sec-input" placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" />
                  </Form.Item>
                  <div className="sec-actions">
                    <Btn htmlType="submit" loading={busy}>Turn On</Btn>
                    <Btn kind="outline" onClick={cancel}>Cancel</Btn>
                  </div>
                </Form>
              </>
            )}

            {/* ---------- recovery codes (shown once) ---------- */}
            {mode === 'codes' && (
              <>
                <Alert
                  className="sec-alert sec-alert-inner"
                  type="warning"
                  showIcon
                  title="Save these recovery codes now"
                  description="If you lose your phone, each code can be used once instead of the app code. They will not be shown again."
                />
                <ul className="sec-codes">
                  {recoveryCodes.map((code) => (
                    <li key={code}>{code}</li>
                  ))}
                </ul>
                <div className="sec-actions">
                  <Btn kind="outline" onClick={copyCodes}><CopyOutlined /> Copy codes</Btn>
                  <Btn onClick={finishCodes}>I have saved them</Btn>
                </div>
              </>
            )}

            {/* ---------- on ---------- */}
            {status && status.enabled && mode === 'idle' && (
              <>
                <p className="sec-text">
                  Status: <strong>On</strong>. Recovery codes left: <strong>{status.recoveryCodesLeft}</strong>.
                </p>
                <div className="sec-actions">
                  <Btn danger kind="outline" onClick={() => { setNotice(null); setMode('disable'); }}>
                    Turn off two-factor authentication
                  </Btn>
                </div>
              </>
            )}

            {mode === 'disable' && (
              <Form layout="vertical" requiredMark={false} onFinish={turnOff} className="sec-form">
                <p className="sec-text">To turn it off, type your password and a code from your app (or a recovery code).</p>
                <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
                  <Input.Password className="sec-input" placeholder="Password" autoComplete="current-password" />
                </Form.Item>
                <Form.Item name="code" rules={[{ required: true, message: 'Enter a code' }]}>
                  <Input className="sec-input" placeholder="6-digit code or recovery code" autoComplete="one-time-code" />
                </Form.Item>
                <div className="sec-actions">
                  <Btn danger htmlType="submit" loading={busy}>Turn Off</Btn>
                  <Btn kind="outline" onClick={cancel}>Cancel</Btn>
                </div>
              </Form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Security;