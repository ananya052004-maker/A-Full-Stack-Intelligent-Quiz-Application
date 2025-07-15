import React from 'react';

function Footer() {
  return (
    <footer style={styles.footer}>
      <p>© 2025 Quiz App. All rights reserved.</p>
    </footer>
  );
}

const styles = {
  footer: {
    textAlign: 'center',
    padding: '15px 0',
    backgroundColor: '#282c34',
    color: 'white',
    position: 'fixed',
    bottom: 0,
    width: '100%',
  }
};

export default Footer;
