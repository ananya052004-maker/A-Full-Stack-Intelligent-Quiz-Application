import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/api/auth/user', { withCredentials: true })
      .then(res => {
        setUser(res.data);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const handleSignIn = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const handleLogout = () => {
    axios.get('http://localhost:5000/api/auth/logout', { withCredentials: true })
      .then(() => {
        setUser(null);
        window.location.reload();
      })
      .catch(err => console.error('Logout failed', err));
  };

  return (
    <nav style={styles.nav}>
      <h2 style={styles.logo}>Quiz App</h2>
      <div style={styles.right}>
        <Link to="/" style={styles.link}>Home</Link>
        <Link to="/category" style={styles.link}>Quiz</Link>

        {loading ? (
          <div style={{ marginLeft: '20px', color: 'white' }}>Loading...</div>
        ) : user ? (
          <div style={styles.userBox}>
            <div style={styles.userName}>{user.name}</div>
            <div style={styles.userEmail}>{user.email}</div>
            <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
          </div>
        ) : (
          <button onClick={handleSignIn} style={styles.button}>Sign In</button>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: '#282c34',
    color: 'white',
  },
  logo: {
    margin: 0,
  },
  right: {
    display: 'flex',
    alignItems: 'center',
  },
  link: {
    marginLeft: '20px',
    color: 'white',
    textDecoration: 'none',
    fontWeight: 'bold',
  },
  button: {
    marginLeft: '20px',
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'white',
    color: '#282c34',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  logoutButton: {
    marginTop: '5px',
    padding: '4px 10px',
    backgroundColor: 'transparent',
    border: '1px solid white',
    color: 'white',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '0.75rem'
  },
  userBox: {
    marginLeft: '20px',
    textAlign: 'right',
    color: 'white',
  },
  userName: {
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: '0.8rem',
    opacity: 0.8
  }
};

export default Navbar;
