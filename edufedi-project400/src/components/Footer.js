// components/Footer.js
import React from "react";
import "./Footer.css";

function Footer() {
  return (
    <footer className="footer">
      <p>© {new Date().getFullYear()} EduFedi - A University Collaboration Platform</p>
      <p>Powered by Open Source</p>
    </footer>
  );
}

export default Footer;
