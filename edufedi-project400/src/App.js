// App.js
import React from "react";
import Header from "./components/Header";
import PostFeed from "./components/PostFeed";
import Footer from "./components/Footer";
import "./App.css";

function App() {
  return (
    <div className="app-container">
      <Header />
      <main>
        <PostFeed />
      </main>
      <Footer />
    </div>
  );
}

export default App;
