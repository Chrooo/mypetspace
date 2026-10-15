import { useEffect, useState } from 'react';
import axios from 'axios';
import { Alert, Button, Card, Form, Input } from 'antd';
import DashboardShell from '../Layout/DashboardShell';
import { API_URL } from '../../auth';

// Turn two-factor authentication (authenticator app) on or off.
// Open to every logged-in role at /security.
function Security() {
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

  return (
    <DashboardShell title="Security" subtitle="Protect your account with a code from your phone." back>
      {notice && <Alert type={notice.type} showIcon title={notice.text} style={{ maxWidth: 520, marginBottom: 16 }} />}

      <Card title="Two-factor authentication" style={{ maxWidth: 520 }}>
        {!status && <p>Loading...</p>}

        {/* ---------- off ---------- */}
        {status && !status.enabled && mode === 'idle' && (
          <>
            <p>
              Status: <strong>Off</strong>. When it is on, logging in also needs a 6-digit code from an
              authenticator app such as Google Authenticator, Microsoft Authenticator or Authy.
            </p>
            <Button type="primary" onClick={() => { setNotice(null); setMode('password'); }}>
              Turn on two-factor authentication
            </Button>
          </>
        )}

        {mode === 'password' && (
          <Form layout="vertical" requiredMark={false} onFinish={startSetup}>
            <p>Type your password to continue.</p>
            <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password placeholder="Password" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={busy}>Continue</Button>{' '}
            <Button onClick={cancel}>Cancel</Button>
          </Form>
        )}

        {mode === 'scan' && setupData && (
          <>
            <p>
              1. Open your authenticator app and scan this QR code.
            </p>
            <img src={setupData.qr} alt="QR code for your authenticator app" width={220} height={220} />
            <p>
              Cannot scan? Choose "enter a setup key" in the app and type this key:
              <br />
              <code style={{ wordBreak: 'break-all' }}>{setupData.secret}</code>
            </p>
            <Form layout="vertical" requiredMark={false} onFinish={confirmSetup}>
              <p>2. Type the 6-digit code the app shows now.</p>
              <Form.Item
                name="code"
                rules={[
                  { required: true, message: 'Enter the 6-digit code' },
                  { pattern: /^\s*\d{3}\s?\d{3}\s*$/, message: 'The code has 6 digits' },
                ]}
              >
                <Input placeholder="6-digit code" inputMode="numeric" autoComplete="one-time-code" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={busy}>Turn on</Button>{' '}
              <Button onClick={cancel}>Cancel</Button>
            </Form>
          </>
        )}

        {/* ---------- recovery codes (shown once) ---------- */}
        {mode === 'codes' && (
          <>
            <Alert
              type="warning"
              showIcon
              title="Save these recovery codes now"
              description="If you lose your phone, each code can be used once instead of the app code. They will not be shown again."
              style={{ marginBottom: 16 }}
            />
            <ul style={{ fontFamily: 'monospace', fontSize: 16, lineHeight: 1.9, paddingLeft: 20 }}>
              {recoveryCodes.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
            <Button onClick={copyCodes}>Copy codes</Button>{' '}
            <Button type="primary" onClick={finishCodes}>I have saved them</Button>
          </>
        )}

        {/* ---------- on ---------- */}
        {status && status.enabled && mode === 'idle' && (
          <>
            <p>
              Status: <strong>On</strong>. Recovery codes left: <strong>{status.recoveryCodesLeft}</strong>.
            </p>
            <Button danger onClick={() => { setNotice(null); setMode('disable'); }}>
              Turn off two-factor authentication
            </Button>
          </>
        )}

        {mode === 'disable' && (
          <Form layout="vertical" requiredMark={false} onFinish={turnOff}>
            <p>To turn it off, type your password and a code from your app (or a recovery code).</p>
            <Form.Item name="password" rules={[{ required: true, message: 'Enter your password' }]}>
              <Input.Password placeholder="Password" autoComplete="current-password" />
            </Form.Item>
            <Form.Item name="code" rules={[{ required: true, message: 'Enter a code' }]}>
              <Input placeholder="6-digit code or recovery code" autoComplete="one-time-code" />
            </Form.Item>
            <Button danger type="primary" htmlType="submit" loading={busy}>Turn off</Button>{' '}
            <Button onClick={cancel}>Cancel</Button>
          </Form>
        )}
      </Card>
    </DashboardShell>
  );
}

export default Security;