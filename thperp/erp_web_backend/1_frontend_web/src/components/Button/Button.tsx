import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  loading?: boolean;
};

function Button({ variant = 'primary', loading = false, disabled, children, className, ...rest }: ButtonProps) {
  const isDisabled = disabled || loading;
  const classes = [styles.button, styles[variant], isDisabled ? styles.disabled : undefined, className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} disabled={isDisabled} {...rest}>
      {loading && <span className={styles.spinner} aria-hidden />}
      <span>{children}</span>
    </button>
  );
}

export default Button;



