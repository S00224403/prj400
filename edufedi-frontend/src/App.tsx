import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Homepage from "./components/Homepage";
import SignUp from "./components/SignUp";
import Login from "./components/Login";
import PostPage from "./components/PostPage";
import { AuthProvider } from "./components/AuthContext";
import UserPage from "./components/UserPage";
import ModDashboard from "./components/ModDashboard";

const App: React.FC = () => (
  <>
    <AuthProvider>
      <Routes>
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/users/:username/posts/:postId" element={<PostPage />} />
        <Route path="/users/:username" element={<UserPage />} />
        <Route path="/moderation" element={<ModDashboard />} />

      </Routes>
    </AuthProvider>
    
  </>
);

export default App;
