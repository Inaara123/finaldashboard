// src/components/Login.js
import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' or 'forgot'
  
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      setCurrentUser(response.user);
      navigate('/home');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setErrorMessage('Password reset email sent. Check your inbox.');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    app: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif',
      padding: '20px',
    },
    form: {
      backgroundColor: 'white',
      padding: '40px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '100%',
      maxWidth: '400px',
    },
    title: {
      fontSize: '24px',
      marginBottom: '20px',
      textAlign: 'center',
      color: '#333',
    },
    input: {
      display: 'block',
      width: '100%',
      padding: '10px',
      marginBottom: '15px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '16px',
    },
    button: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '16px',
      transition: 'background-color 0.3s',
      marginBottom: '10px',
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
    errorMessage: {
      color: 'red',
      marginTop: '10px',
      textAlign: 'center',
    },
    loader: {
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #007bff',
      borderRadius: '50%',
      width: '30px',
      height: '30px',
      animation: 'spin 1s linear infinite',
      margin: '20px auto',
    },
    link: {
      color: '#007bff',
      textDecoration: 'underline',
      cursor: 'pointer',
      marginTop: '10px',
      textAlign: 'center',
    }
  };

  return (
    <div style={styles.app}>
      <div style={styles.form}>
        <h2 style={styles.title}>
          {mode === 'login' ? 'Login' : 'Forgot Password'}
        </h2>
        <input
          type="text"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />
        {mode === 'login' && (
          <input
            type="password"
            placeholder="Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        )}
        <button
          style={{
            ...styles.button,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          onClick={mode === 'login' ? handleLogin : handleForgotPassword}
          disabled={loading}
        >
          {loading 
            ? 'Processing...' 
            : mode === 'login' 
              ? 'Sign In' 
              : 'Reset Password'}
        </button>

        {mode === 'login' ? (
          <p style={styles.link} onClick={() => setMode('forgot')}>Forgot password?</p>
        ) : (
          <p style={styles.link} onClick={() => setMode('login')}>Back to login</p>
        )}

        {loading && <div style={styles.loader}></div>}
        {errorMessage && (
          <p style={styles.errorMessage}>{errorMessage}</p>
        )}
      </div>
    </div>
  );
};

export default Login;