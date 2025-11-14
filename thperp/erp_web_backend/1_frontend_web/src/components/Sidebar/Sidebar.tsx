import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../Button/Button';
import styles from './Sidebar.module.css';

function Sidebar() {
  const navigate = useNavigate();
  const { currentUser, userRole, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const sidebarClass = [styles.sidebar, collapsed ? styles.collapsed : undefined].join(' ');

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  const getRoleLabel = (role: string | null) => {
    const roleMap: Record<string, string> = {
      admin: 'Quản trị viên',
      manager: 'Quản lý',
      user: 'Người dùng',
      worker: 'Công nhân',
    };
    return roleMap[role || 'user'] || 'Người dùng';
  };

  return (
    <aside className={sidebarClass}>
      <button
        className={styles.toggle}
        aria-label={collapsed ? 'Mở menu' : 'Thu gọn menu'}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span className={styles.hamburger} />
      </button>
      <div className={styles.brand}>THP ERP</div>
      <nav className={styles.nav}>
        <NavLink
          to="/dashboard"
          title="Dashboard"
          className={({ isActive }) => [styles.link, isActive ? styles.active : undefined].join(' ')}
        >
          <span className={styles.dot} />
          <span className={styles.linkLabel}>Dashboard</span>
        </NavLink>
        <NavLink
          to="/settings/email"
          title="Cài đặt Email"
          className={({ isActive }) => [styles.link, isActive ? styles.active : undefined].join(' ')}
        >
          <span className={styles.dot} />
          <span className={styles.linkLabel}>Cài đặt Email</span>
        </NavLink>
      </nav>
      
      {!collapsed && currentUser && (
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.userName}>
              {currentUser.displayName || currentUser.email}
            </div>
            <div className={styles.userRole}>
              {getRoleLabel(userRole)}
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            Đăng xuất
          </Button>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;


