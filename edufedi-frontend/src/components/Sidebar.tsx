import React from "react";
import { Box, Typography, Stack, Link } from "@mui/material";
import AddPost from "./AddPost";
import Footer from "./Footer";

const Sidebar: React.FC<{ user?: any }> = ({ user }) => (
  <Box sx={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", height: "100%" }}>
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      {user && <AddPost isMobile={false} currentUser={user} />}
      <Box sx={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <Typography variant="h6">Trending Topics</Typography>
        <Stack spacing={1} sx={{ marginTop: "10px" }}>
          <Link href="/search?hashtag=Hackathon2025" underline="hover" color="primary">#Hackathon2025</Link>
          <Link href="/search?hashtag=CollegeEvent" underline="hover" color="primary">#CollegeEvent</Link>
          <Link href="/search?hashtag=ResearchCollab" underline="hover" color="primary">#ResearchCollab</Link>
        </Stack>
      </Box>
    </Box>
  </Box>
);

export default Sidebar;