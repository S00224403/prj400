import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  AppBar,
  Toolbar,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Box,
  Avatar,
  Link,
  Stack,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
} from "@mui/material";
import ExploreIcon from "@mui/icons-material/Explore";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";
import DescriptionIcon from "@mui/icons-material/Description";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import RepeatIcon from "@mui/icons-material/Repeat";
import ReplyIcon from "@mui/icons-material/Reply";
import axios from "axios";
import { Post } from "../interface"
import Header from "./Header";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import PostCard from "./PostCard";
import AddPost from "./AddPost";
const Homepage: React.FC = (): React.ReactElement => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true); // Keep state for login status

  useEffect(() => {
    axios
      .get<Post[]>("http://localhost:8080/posts")
      .then((response) => setPosts(response.data))
      .catch((error) => console.error("Error fetching posts:", error));
  }, []);

  const isMobile = useMediaQuery("(max-width:600px)"); // Detect screen size
  // Calculate height dynamically based on header/footer presence if they are not fixed height
  // Assuming standard AppBar heights (a</Box>pprox 64px for header, 56px for footer)
  const contentHeight = "calc(100vh - 64px - 56px)"; // Adjust if your header/foot</Stack>er heights differ

  return (
    <Container maxWidth="xl" disableGutters sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Header isLoggedIn={isLoggedIn} onLogout={() => setIsLoggedIn(false)} />
      

      {/* Main Content using Grid */}
      <Grid container sx={{ flexGrow: 1}} overflow="hidden"> {/* Let Grid handle the main layout */}
        <Grid
            size={{ xs: 12, md: 3 }} // Full width on small screens, 3 columns on medium and up
            sx={{
                display: { xs: "none", md: "block" }, // Hide on small screens
                padding: "20px",
                borderRight: { md: "1px solid #ccc" },
                height: "100vh", // Adjust heights for header/footer
                overflow: "hidden",
            }}
        >
        {/* Sidebar */}
        <NavigationBar />
      </Grid>
        {/* Timeline */}
        <Grid
          size={{xs:12, md:6}}
          sx={{
            overflowY: "auto", // Enable scrolling for this section
            height: { xs: "calc(100vh - 64px - 56px)", md: "calc(100vh - 128px)" }, // Adjust heights for header/footer
            paddingX: "20px",
            paddingY: "20px",
          }}
        >
          <Grid
            sx={{
              height: { xs: "calc(100vh - 64px)", md: "calc(100vh - 128px)" },
              paddingX: "20px",
              paddingY: "20px",
            }}
          >
            {posts.map((post) => (
              <PostCard
                key={post.id}
                id={post.id}
                name={post.name}
                username={post.username}
                content={post.content}
                created={post.created} uri={post.uri} actor_id={0} url={post.url}              />
            ))}
          </Grid>
          {/* Add a loader or empty state */}
          {posts.length === 0 && <Typography>No posts yet...</Typography>}
        </Grid>

        {/* Third Column */}
        {!isMobile && (<Grid
          size={{xs:12, md:3}}
          sx={{
            display: { xs: 'none', md: 'block' },
            paddingX: "20px",
            borderLeft: { md: "1px solid #ccc" },
            height: "100vh", // Adjust heights for header/footer
            overflow: "hidden",
          }}
        >
          <AddPost isMobile={false} />

          {/* Trending Topics */}
          <Box sx={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <Typography variant="h6">Trending Topics</Typography>
            <Stack spacing={1} sx={{ marginTop: "10px" }}>
              <Link href="/search?hashtag=Hackathon2025" underline="hover" color="primary"> #Hackathon2025 </Link>
              <Link href="/search?hashtag=CollegeEvent" underline="hover" color="primary"> #CollegeEvent </Link>
              <Link href="/search?hashtag=ResearchCollab" underline="hover" color="primary"> #ResearchCollab </Link>
            </Stack>
          </Box>

          
        </Grid>)}
      </Grid>
      {/* Floating Action Button for Mobile */}
      {isMobile && <AddPost isMobile />}
    </Container>
  );
};

export default Homepage;
