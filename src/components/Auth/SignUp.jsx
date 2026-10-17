import { useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input, Select } from 'antd';
import { API_URL, checkAvailable, getUser, saveLogin } from '../../auth';
import logo from '../../assets/logo.png';
import petPatternPink from '../../assets/pet-pattern-pink.svg';
import './Login.css'; // shared card, input and logo styles
import './SignUp.css';

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

// pet name: letters, numbers, spaces, apostrophes, periods and hyphens
const petNameRules = [
  { required: true, whitespace: true, message: "Enter your pet's name" },
  { pattern: /^[A-Za-z0-9\u00C0-\u024F][A-Za-z0-9\u00C0-\u024F .'-]*$/, message: 'Letters and numbers only, please' },
  { max: 50, message: 'Maximum of 50 characters' },
];

const breedRules = [
  { required: true, whitespace: true, message: 'Enter the breed' },
  { pattern: /^[A-Za-z\u00C0-\u024F][A-Za-z\u00C0-\u024F .'/()-]*$/, message: 'Letters only, please' },
  { max: 50, message: 'Maximum of 50 characters' },
];

// age in years: 0 to 40 (decimals such as 0.5 are fine for puppies and kittens)
const checkAge = (_, value) => {
  const v = String(value ?? '').trim();
  if (!v) return Promise.reject(new Error('Enter the age'));
  if (!/^\d+(\.\d+)?$/.test(v) || Number(v) > 40) return Promise.reject(new Error('Enter an age from 0 to 40'));
  return Promise.resolve();
};

const STEP_ONE_FIELDS = ['firstName', 'lastName', 'identifier', 'password', 'confirmPassword'];

function SignUp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = account details, 2 = register your pet
  const [form] = Form.useForm();

  // already logged in? go straight to the dashboard
  if (getUser()) return <Navigate to="/dashboard" replace />;

  // step 1 -> step 2 (only the account fields are checked here)
  const goNext = async () => {
    setError('');
    try {
      await form.validateFields(STEP_ONE_FIELDS);
      setStep(2);
    } catch (err) {
      /* the form already shows what is wrong */
    }
  };

  const goBack = () => {
    setError('');
    setStep(1);
  };

  // step 2: create the account together with the first pet
  const onFinish = async (values) => {
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        firstName: values.firstName,
        lastName: values.lastName,
        identifier: values.identifier,
        password: values.password, // the confirm field is only checked in the browser
        pet: {
          name: values.petName,
          breed: values.breed,
          age: values.age,
          gender: values.gender,
          type: values.petType,
          notes: values.notes || '',
        },
      };
      const response = await axios.post(`${API_URL}/register`, payload);
      saveLogin(response.data); // saves the token and the user
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not reach the server. Please try again.');
      // the email/phone was taken in the meantime: send them back to fix it
      if (err.response?.status === 409) setStep(1);
      setSubmitting(false);
    }
  };

  // pressing Enter on step 1 means "Next", not "create the account"
  const onKeyDown = (event) => {
    if (step === 1 && event.key === 'Enter') {
      event.preventDefault();
      goNext();
    }
  };

  return (
    <div className="lg-shell" style={{ backgroundImage: `url("${petPatternPink}")` }}>
      <div className="lg-card su-card">
        <section className={`su-form lg-form${step === 2 ? ' su-form-wide' : ''}`}>
          <h1 className="su-title">{step === 1 ? 'Create MyPetSpace Account' : 'Register Pet in your Account'}</h1>
          <p className="su-note">
            Please fill in the information below. <span>Required fields are marked *</span>
          </p>

          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 12 }} />}

          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={onFinish}
            onKeyDown={onKeyDown}
            size="large"
            validateDebounce={400}
          >
            {/* ---------- step 1: account ---------- */}
            <div hidden={step !== 1}>
              <Form.Item name="firstName" rules={nameRules('first name')}>
                <Input className="lg-input" placeholder="First Name *" autoComplete="given-name" />
              </Form.Item>

              <Form.Item name="lastName" rules={nameRules('last name')}>
                <Input className="lg-input" placeholder="Last Name *" autoComplete="family-name" />
              </Form.Item>

              <Form.Item
                name="identifier"
                validateFirst
                rules={[
                  { required: true, message: 'Enter your email or phone number' },
                  { validator: checkIdentifier },
                  { validator: checkAvailable },
                ]}
              >
                <Input className="lg-input" placeholder="Email or Phone *" autoComplete="username" />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[
                  { required: true, message: 'Enter your password' },
                  { min: 8, message: 'Use at least 8 characters' },
                  { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: 'Include at least one letter and one number' },
                ]}
              >
                <Input.Password className="lg-input" placeholder="Password *" autoComplete="new-password" />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Confirm your password' },
                  ({ getFieldValue }) => ({
                    validator: (_, value) =>
                      !value || getFieldValue('password') === value
                        ? Promise.resolve()
                        : Promise.reject(new Error('Passwords do not match')),
                  }),
                ]}
              >
                <Input.Password className="lg-input" placeholder="Confirm Password *" autoComplete="new-password" />
              </Form.Item>

              <Button type="primary" block className="su-submit" onClick={goNext}>
                Next
              </Button>
            </div>

            {/* ---------- step 2: first pet ---------- */}
            <div hidden={step !== 2}>
              <Form.Item name="petName" rules={petNameRules}>
                <Input className="lg-input" placeholder="Pet Name *" maxLength={50} />
              </Form.Item>

              <div className="su-row">
                <Form.Item name="breed" rules={breedRules}>
                  <Input className="lg-input" placeholder="Breed *" maxLength={50} />
                </Form.Item>
                <Form.Item name="age" rules={[{ validator: checkAge }]}>
                  <Input className="lg-input" placeholder="Age (years) *" inputMode="decimal" maxLength={5} />
                </Form.Item>
              </div>

              <div className="su-row">
                <Form.Item name="gender" rules={[{ required: true, message: 'Choose a gender' }]}>
                  <Select
                    className="lg-select"
                    placeholder="Gender *"
                    options={[
                      { value: 'Male', label: 'Male' },
                      { value: 'Female', label: 'Female' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="petType" rules={[{ required: true, message: 'Choose a type' }]}>
                  <Select
                    className="lg-select"
                    placeholder="Type *"
                    options={[
                      { value: 'Dog', label: 'Dog' },
                      { value: 'Cat', label: 'Cat' },
                    ]}
                  />
                </Form.Item>
              </div>

              <Form.Item name="notes" rules={[{ max: 300, message: 'Maximum of 300 characters' }]}>
                <Input className="lg-input" placeholder="Additional Note if needed (Allergies, etc.)" maxLength={300} />
              </Form.Item>

              <Button type="primary" htmlType="submit" block loading={submitting} className="su-submit su-submit-teal">
                Create MyPetSpace Account
              </Button>
              <button type="button" className="su-back" onClick={goBack} disabled={submitting}>
                ← Back
              </button>
            </div>
          </Form>

          <p className="su-switch">
            Already have MyPetSpace Account? <Link to="/login">Login here.</Link>
          </p>
        </section>

        <Link to="/" className="lg-brand" aria-label="Back to home">
          <img src={logo} alt="My Pet Space pet hotel and snack bar" />
        </Link>
      </div>
    </div>
  );
}

export default SignUp;