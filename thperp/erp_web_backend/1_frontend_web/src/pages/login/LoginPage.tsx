import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/Button/Button';
import styles from './LoginPage.module.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, signInWithGoogle, register, resetPassword, error: authError } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isForgotPassword) {
        const success = await resetPassword(email);
        if (success) {
          setMessage('Email đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.');
          setIsForgotPassword(false);
        }
      } else if (isLogin) {
        const success = await login(email, password);
        if (success) {
          navigate('/dashboard');
        }
      } else {
        const success = await register(email, password, displayName);
        if (success) {
          setMessage('Đăng ký thành công! Đang chuyển hướng...');
          setTimeout(() => {
            navigate('/dashboard');
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Lỗi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setMessage('');

    try {
      const success = await signInWithGoogle();
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Lỗi:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <h1 className={styles.title}>Tân Hòa Phát</h1>
          <p className={styles.subtitle}>
            {isForgotPassword
              ? 'Đặt lại mật khẩu'
              : isLogin
              ? 'Đăng nhập vào tài khoản của bạn'
              : 'Tạo tài khoản mới'}
          </p>
        </div>

        {message && (
          <div className={styles.message}>{message}</div>
        )}

        {authError && (
          <div className={styles.error}>{authError}</div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {!isLogin && !isForgotPassword && (
            <div className={styles.formGroup}>
              <label htmlFor="displayName">Tên hiển thị</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên hiển thị"
                required={!isLogin}
              />
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email"
              required
            />
          </div>

          {!isForgotPassword && (
            <div className={styles.formGroup}>
              <label htmlFor="password">Mật khẩu</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className={styles.forgotPassword}>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setMessage('');
                }}
                className={styles.forgotLink}
              >
                Quên mật khẩu?
              </button>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className={styles.submitButton}
          >
            {isForgotPassword
              ? 'Gửi email đặt lại'
              : isLogin
              ? 'Đăng nhập'
              : 'Đăng ký'}
          </Button>
        </form>

        <div className={styles.divider}>
          <span>Hoặc</span>
        </div>

        <Button
          variant="secondary"
          onClick={handleGoogleSignIn}
          loading={loading}
          className={styles.googleButton}
        >
          <span className={styles.googleIcon}>🔐</span>
          Đăng nhập với Google
        </Button>

        <div className={styles.switchMode}>
          {isForgotPassword ? (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setMessage('');
              }}
              className={styles.switchLink}
            >
              Quay lại đăng nhập
            </button>
          ) : (
            <>
              {isLogin ? (
                <>
                  Chưa có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setMessage('');
                    }}
                    className={styles.switchLink}
                  >
                    Đăng ký ngay
                  </button>
                </>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setMessage('');
                    }}
                    className={styles.switchLink}
                  >
                    Đăng nhập
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

