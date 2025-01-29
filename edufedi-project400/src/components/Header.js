// components/Header.js
import React from "react";
import "./Header.css";

function Header() {
  return (
    <header className="header">
      <h1>EduFedi</h1>
      <nav>
        <ul className="nav-links">
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#login">Login</a></li>
        </ul>
      </nav>
    </header>
  );
}

export default Header;
