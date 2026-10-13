import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import './index.css';
import App from './App';

// antd colors taken from the My Pet Space logo
const theme = {
  token: {
    colorPrimary: '#EE2A7B', // pink
    colorInfo: '#0E969C', // teal
    colorLink: '#0E969C',
    colorLinkHover: '#0A6E73',
    colorTextBase: '#6B1E2B', // maroon
    borderRadius: 12,
    fontFamily: "'Nunito', system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  components: {
    Button: { controlHeight: 46, fontWeight: 700 },
    Input: { controlHeight: 46, colorBgContainer: '#FBF8EA' },
  },
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);