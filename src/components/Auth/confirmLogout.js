import { Modal } from 'antd';
import { logout } from '../../auth';

// Asks "Are you sure?" before logging out.
// onDone runs only after the user confirms (for example: send them back to the home page).
function confirmLogout(onDone) {
  Modal.confirm({
    title: 'Log out?',
    content: 'Are you sure you want to log out?',
    okText: 'Yes, log out',
    cancelText: 'No, stay',
    centered: true,
    onOk: () => {
      logout();
      if (onDone) onDone();
    },
  });
}

export default confirmLogout;