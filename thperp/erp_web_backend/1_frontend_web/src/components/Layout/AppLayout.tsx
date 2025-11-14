import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import NotificationBell from '../NotificationBell/NotificationBell';
import styles from './AppLayout.module.css';

function AppLayout() {
  return (
    <div className={styles.wrapper}>
      <Sidebar />
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>THP ERP System</h1>
            <div className={styles.headerActions}>
              <NotificationBell />
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;



