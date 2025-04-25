import React from "react";
import { Box, Typography, Stack, Link } from "@mui/material";
import AddPost from "./AddPost";
import Footer from "./Footer";

const Sidebar: React.FC<{ user?: any }> = ({ user }) => (
  <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", height: "100%" }}>
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      {user && <AddPost isMobile={false} currentUser={user} />}
      
    </Box>
  </Box>
);

export default Sidebar;