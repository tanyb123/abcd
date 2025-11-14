import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebaseClient';
import Button from '../../components/Button/Button';
import styles from './EmailSettingsPage.module.css';

const EmailSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setEmail(userData.gmail || userData.email || '');
          setEmailNotificationsEnabled(userData.emailNotificationsEnabled !== false); // Default to true
        }
      } catch (error) {
        console.error('Error loading email settings:', error);
        setMessage({ type: 'error', text: 'Không thể tải cài đặt email' });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser?.uid) return;

    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập email' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      await updateDoc(doc(db, 'users', currentUser.uid), {
        gmail: email.trim(),
        emailNotificationsEnabled,
      });

      setMessage({ type: 'success', text: 'Đã lưu cài đặt email thành công!' });
    } catch (error: any) {
      console.error('Error saving email settings:', error);
      setMessage({ type: 'error', text: 'Không thể lưu cài đặt: ' + error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Đang tải...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Cài Đặt Email</h1>
        <p className={styles.subtitle}>
          Cấu hình email để nhận thông báo từ hệ thống
        </p>
      </div>

      {message && (
        <div
          className={`${styles.message} ${
            message.type === 'success' ? styles.success : styles.error
          }`}
        >
          {message.text}
        </div>
      )}

      <div className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="email">Email nhận thông báo</label>
          <input
            id="email"
            type="email"
            className={styles.input}
            placeholder="your-email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className={styles.hint}>
            Email này sẽ được sử dụng để gửi thông báo từ hệ thống
          </p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={emailNotificationsEnabled}
              onChange={(e) => setEmailNotificationsEnabled(e.target.checked)}
              className={styles.checkbox}
            />
            <span>Bật thông báo qua email</span>
          </label>
          <p className={styles.hint}>
            Khi bật, bạn sẽ nhận email khi có thông báo mới (dự án được mở, tin nhắn mới, v.v.)
          </p>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!email.trim()}
          >
            Lưu cài đặt
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EmailSettingsPage;

