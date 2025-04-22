import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Button,
  Grid,
  Box,
  Link,
  Stack,
  useMediaQuery,
  Modal,
  Fab,
} from "@mui/material";
import axios from "axios";
import { Post, User } from "../interface";
import Header from "./Header";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import PostCard from "./PostCard";
import AddPost from "./AddPost";
import Login from "./Login";
import Signup from "./SignUp";
import { useAuth } from "./AuthContext";
import Sidebar from "./Sidebar";

const Homepage: React.FC = (): React.ReactElement => {
  const { isLoggedIn, user, setIsLoggedIn, setUser, logout } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showSignup, setShowSignup] = useState<boolean>(false);
  const [addPostOpen, setAddPostOpen] = useState(false);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_BASE_URL}/auth/me`, { withCredentials: true })
      .then((res) => {
        console.log(res);
        setUser(res.data.user);
        setIsLoggedIn(true);
      })
      .catch(() => {
        
        setUser(null);
        setIsLoggedIn(false);
      });
  }, []);
  
  
  useEffect(() => {
    if (isLoggedIn) {
      axios
        .get<Post[]>(`${process.env.REACT_APP_API_BASE_URL}/posts`, { withCredentials: true })
        .then((response) => setPosts(response.data))
        .catch((error) => console.error("Error fetching posts:", error));
    }
  }, [isLoggedIn]);
  
  
  const isMobile = useMediaQuery("(max-width:600px)");

  return (
    <Container
      maxWidth="xl"
      disableGutters
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <Header isLoggedIn={isLoggedIn} onLogout={logout} />

      <Grid
        container
        sx={{
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Sidebar */}
        <Grid
          container
          size={{ xs: 12, md: 3 }}
          sx={{
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            padding: "20px",
            borderRight: { md: "1px solid #ccc" },
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <NavigationBar />
          <Box sx={{ flexShrink: 0 }}>
            <Footer />
          </Box>
        </Grid>

        {/* Timeline */}
        <Grid
          container
          size={{ xs: 12, md: 6 }}
          sx={{
            height: "100%",
            minHeight: 0,
            overflowY: "auto",
            paddingX: "20px",
            paddingY: "20px",
            display: "flex",
            alignItems: "stretch",
          }}
        >
          {isLoggedIn && posts.length > 0 ? (
            posts.map((post) => (
              <PostCard
                key={post.id}
                {...post}
              />
            ))
          ) : isLoggedIn ? (
            <Typography>No posts yet...</Typography>
          ) : (
            <Box sx={{ width: "100%", maxWidth: 400 }}>
              <Stack direction="row" spacing={2} justifyContent="center" mb={2}>
                <Typography variant="h6">Welcome! Please log in or sign up.</Typography>
              </Stack>
              {showLogin && (
                <Login
                  onLoginSuccess={() => {
                    setIsLoggedIn(true);
                    setShowLogin(false);
                  }}
                />
              )}
              {showSignup && (
                <Signup
                  onSignupSuccess={() => {
                    setShowSignup(false);
                    setShowLogin(true);
                  }}
                />
              )}
              {!showLogin && !showSignup && (
                <Stack direction="row" spacing={2} justifyContent="center" mt={2}>
                  <Box>
                    <Button onClick={() => { setShowLogin(true); setShowSignup(false); }}>Login</Button>
                  </Box>
                  <Box>
                    <Button onClick={() => { setShowSignup(true); setShowLogin(false); }}>Sign Up</Button>
                  </Box>
                </Stack>
              )}
            </Box>
          )}
        </Grid>

        {/* Third Column */}
        {!isMobile && (
          <Grid
            container
            size={{ xs: 12, md: 3 }}
            sx={{
              display: { xs: "none", md: "flex" },
              flexDirection: "column",
              paddingX: "20px",
              borderLeft: { md: "1px solid #ccc" },
              height: "100%",
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <Sidebar user={user} />
          </Grid>
        )}
      </Grid>

      {/* Mobile AddPost Modal */}
      {isMobile && isLoggedIn && user && (
        <>
          <Fab
            color="primary"
            aria-label="add"
            sx={{
              position: "fixed",
              bottom: 12,
              right: 12,
              zIndex: 1200,
            }}
            onClick={() => setAddPostOpen(true)}
          >
            +
          </Fab>
          <Modal
            open={addPostOpen}
            onClose={() => setAddPostOpen(false)}
            aria-labelledby="add-post-modal"
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Box sx={{ width: "90vw", maxWidth: 400, bgcolor: "background.paper", borderRadius: 2, boxShadow: 24, p: 2 }}>
              <AddPost isMobile={isMobile} currentUser={user} />
            </Box>
          </Modal>
        </>
      )}
    </Container>
  );
};

export default Homepage;