import React from 'react';
import './Login.css';

function Login() {
  const handleGoogleSignIn = () => {
    // TODO: Add Firebase Google login
    alert("Google sign-in not implemented yet.");
  };

  const handleEmailLogin = (e) => {
    e.preventDefault();
    // TODO: Add Firebase email/password login
    alert("Email/password login not implemented yet.");
  };

  return (
    <div className="login-container">
      <h2>Login to Quiz App</h2>

      <form onSubmit={handleEmailLogin}>
        <input type="email" placeholder="Email" required />
        <input type="password" placeholder="Password" required />

        <button type="submit">Login</button>
        <p className="forgot-password">Forgot Password?</p>
      </form>

      <hr />
      <button className="google-btn" onClick={handleGoogleSignIn}>
        Continue with Google
      </button>
    </div>
  );
}

export default Login;
