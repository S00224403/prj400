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
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";
import DescriptionIcon from "@mui/icons-material/Description";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import RepeatIcon from "@mui/icons-material/Repeat";
import ReplyIcon from "@mui/icons-material/Reply";
import axios from "axios";
import { Post } from "../interface"
const Homepage: React.FC = (): React.ReactElement => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    // Fetch posts from the backend API
    axios
      .get<Post[]>("http://localhost:8080/users/matiw885/posts")
      .then((response) => setPosts(response.data))
      .catch((error) => console.error("Error fetching posts:", error));
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Container maxWidth="xl" sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <Box component="img" src="/logo.png" alt="Logo" sx={{ width: 50, height: 50, marginRight: 2 }} />
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            EduFedi
          </Typography>
          {/* Conditional Login/Profile */}
          {isLoggedIn ? (
            <>
              <IconButton color="inherit" onClick={handleMenuOpen}>
                <AccountCircleIcon />
              </IconButton>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
                <MenuItem onClick={handleMenuClose}>My Profile</MenuItem>
                <MenuItem onClick={handleMenuClose}>Settings</MenuItem>
                <MenuItem onClick={() => setIsLoggedIn(false)}>Logout</MenuItem>
              </Menu>
            </>
          ) : (
            <Button color="inherit" onClick={() => console.log("Login clicked")}>
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box sx={{ display: "flex", flexGrow: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: { xs: "100%", md: "25%" },
            padding: "20px",
            borderRight: "1px solid #ccc",
            height: "calc(100vh - 128px)", // Account for header and footer
          }}
        >
          <Typography variant="h6">Navigation</Typography>
          <Button
            fullWidth
            variant="text"
            href="/timeline"
            startIcon={<HomeIcon />}
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            EduFedi Timeline
          </Button>
          <Button
            fullWidth
            variant="text"
            href="/research"
            startIcon={<DescriptionIcon />}
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            Research Papers
          </Button>
          <Button
            fullWidth
            variant="text"
            href="/notifications"
            startIcon={<NotificationsIcon />}
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": {
                backgroundColor: "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            Notifications
          </Button>

          {/* User Profile Summary */}
          <Box sx={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <Typography variant="subtitle1">User Profile</Typography>
            <Typography variant="body2">Username: johndoe</Typography>
            <Typography variant="body2">Posts: 10</Typography>
            <Typography variant="body2">Followers: 25</Typography>
          </Box>
        </Box>

        {/* Timeline */}
        <Box
          sx={{
            width: { xs: "100%", md: "50%" },
            overflowY: "auto",
            height: "calc(100vh - 128px)", // Account for header and footer
            paddingX: "20px",
            marginY: "20px",
          }}
        >
          {posts.map((post) => (
            <Card key={post.id} style={{ marginBottom: "20px", padding: "10px", borderRadius: "10px" }}>
              <CardContent>
                {/* User Info */}
                <Box display="flex" alignItems="center" marginBottom={1}>
                  <Avatar sx={{ marginRight: 2 }}>{post.username[0]}</Avatar> {/* Placeholder Avatar */}
                  <Box>
                    <Typography variant="subtitle1">{post.name}</Typography> {/* Display name */}
                    <Typography variant="subtitle2">@{post.username}</Typography> {/* Display username */}
                  </Box>
                </Box>

                {/* Post Content */}
                <Typography variant="body1" style={{ marginBottom: "10px" }}>
                  {post.content}
                </Typography>

                {/* Timestamp */}
                <Typography variant="caption" color="textSecondary">
                  {new Date(post.created).toLocaleString()}
                </Typography>
              </CardContent>

              {/* Post Actions */}
              <CardActions>
                <Button size="small" color="primary" startIcon={<ThumbUpIcon />}>
                  Like
                </Button>
                <Button size="small" color="secondary" startIcon={<RepeatIcon />}>
                  Repost
                </Button>
                <Button size="small" color="success" startIcon={<ReplyIcon />}>
                  Reply
                </Button>
              </CardActions>
            </Card>
          ))}
        </Box>
        {/* Third Column */}
        <Box
          sx={{
            width: { xs: "100%", md: "25%" },
            paddingX: "20px",
            borderLeft: "1px solid #ccc",
            height: "calc(100vh - 128px)", // Account for header and footer
          }}
        >
          {/* Trending Topics */}
          <Box sx={{ marginBottom: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <Typography variant="h6">Trending Topics</Typography>
            <Stack spacing={1} sx={{ marginTop: "10px" }}>
              <Link href="/search?hashtag=Hackathon2025" underline="hover" color="primary">
                #Hackathon2025
              </Link>
              <Link href="/search?hashtag=CollegeEvent" underline="hover" color="primary">
                #CollegeEvent
              </Link>
              <Link href="/search?hashtag=ResearchCollab" underline="hover" color="primary">
                #ResearchCollab
              </Link>
            </Stack>
          </Box>

          {/* Notifications Summary */}
          <Box sx={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
            <Typography variant="h6">Notifications</Typography>
            <Typography>JohnDoe liked your post.</Typography>
            <Typography>JaneDoe replied to your post.</Typography>
            <Typography>CollegeClub followed you.</Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <AppBar position="static" style={{ marginTop: "20px" }}>
        <Toolbar style={{ justifyContent: "center" }}>
          <Typography variant="body2">&copy; 2025 EduFedi. All rights reserved.</Typography>
        </Toolbar>
      </AppBar>
    </Container>
  );
};

export default Homepage;
