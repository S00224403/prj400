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

const Homepage: React.FC = (): React.ReactElement => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [showLogin, setShowLogin] = useState<boolean>(false);
  const [showSignup, setShowSignup] = useState<boolean>(false);

  const logout = async () => {
    await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/auth/logout`,
      {},
      { withCredentials: true }
    );
    setIsLoggedIn(false);
  };

  const [user, setUser] = useState<User | null>(null);
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
    <Container maxWidth="xl" disableGutters sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Header isLoggedIn={isLoggedIn} onLogout={logout} />

      <Grid container sx={{ flexGrow: 1 }} overflow="hidden">
        {/* Sidebar */}
        <Grid
          size={{xs:12, md:3}}
          sx={{
            display: { xs: "none", md: "block" },
            padding: "20px",
            borderRight: { md: "1px solid #ccc" },
            height: "100vh",
            overflow: "hidden",
          }}
        >
          <NavigationBar />
        </Grid>

        {/* Main Timeline or Auth Forms */}
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            overflowY: "auto",
            height: { xs: "calc(100vh - 64px - 56px)", md: "calc(100vh - 128px)" },
            paddingX: "20px",
            paddingY: "20px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: isLoggedIn ? "flex-start" : "center",
          }}
        >
          
        </Grid>

        {/* Third Column */}
        {!isMobile && (
          <Grid
            size={{ xs: 12, md: 3 }}
            sx={{
              display: { xs: "none", md: "block" },
              paddingX: "20px",
              borderLeft: { md: "1px solid #ccc" },
              height: "100vh",
              overflow: "hidden",
            }}
          >
            {isLoggedIn && user && (
            <><AddPost isMobile={false} currentUser={user}/></>)}
            <Box sx={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
              <Typography variant="h6">Trending Topics</Typography>
              <Stack spacing={1} sx={{ marginTop: "10px" }}>
                <Link href="/search?hashtag=Hackathon2025" underline="hover" color="primary"> #Hackathon2025 </Link>
                <Link href="/search?hashtag=CollegeEvent" underline="hover" color="primary"> #CollegeEvent </Link>
                <Link href="/search?hashtag=ResearchCollab" underline="hover" color="primary"> #ResearchCollab </Link>
              </Stack>
            </Box>
          </Grid>
        )}
      </Grid>
      {isMobile && isLoggedIn && user && <AddPost isMobile={isMobile} currentUser={user} />}
      <Footer />
    </Container>
  );
};

export default Homepage;
