import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Container,
  Grid,
  Box,
  Typography,
  Stack,
  useMediaQuery,
} from "@mui/material";
import NavigationBar from "./NavigationBar";
import Footer from "./Footer";
import PostCard from "./PostCard";
import AddPost from "./AddPost";
import Header from "./Header";
import { useAuth } from "./AuthContext"; // If using AuthContext
import axios from "axios";

const PostPage: React.FC = () => {
  const { postId } = useParams();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const isMobile = useMediaQuery("(max-width:600px)");
  const { isLoggedIn, user, logout } = useAuth(); // If using AuthContext

  useEffect(() => {
    // Fetch the post
    axios
      .get(`${process.env.REACT_APP_API_BASE_URL}/posts/${postId}`, { withCredentials: true })
      .then((res) => setPost(res.data))
      .catch((err) => console.error("Error fetching post:", err));

    // Fetch comments
    axios
      .get(`${process.env.REACT_APP_API_BASE_URL}/posts/${postId}/comments`, { withCredentials: true })
      .then((res) => setComments(res.data))
      .catch((err) => console.error("Error fetching comments:", err));
  }, [postId]);

  if (!post) return <Typography>Loading...</Typography>;

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
      {/* Header */}
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
          <NavigationBar/>
          <Box sx={{ flexShrink: 0 }}>
            <Footer />
          </Box>
        </Grid>

        {/* Main Post Content */}
        <Grid
          container
          sx={{
            flex: 1,
            minHeight: 0,
            height: '100%', // or '100vh' if this is the root
            overflow: 'auto', // Prevent horizontal scroll
            flexDirection: 'column',
            alignItems: 'stretch',
            paddingX: 2,
            paddingY: 2,
          }}
        >
          {/* Scrollable content area */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <PostCard {...post} />
            <Box mt={4}>
              <Typography variant="h6">Replies</Typography>
              <Stack spacing={2} mt={2}>
                {comments.length === 0 ? (
                  <Typography>No replies yet.</Typography>
                ) : (
                  comments.map((comment) => (
                    <Box key={comment.id} sx={{ border: "1px solid #eee", borderRadius: 2, p: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary">
                        {comment.name} @{comment.username} • {new Date(comment.created).toLocaleString()}
                      </Typography>
                      <Typography variant="body1">{comment.content}</Typography>
                    </Box>
                  ))
                )}
              </Stack>
            </Box>
            {/* Add reply form here if desired */}
          </Box>
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
            <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
              {isLoggedIn && user && (
                <AddPost isMobile={false} currentUser={user} />
              )}
              <Box sx={{ padding: "10px", border: "1px solid #ccc", borderRadius: "8px" }}>
                <Typography variant="h6">Trending Topics</Typography>
                {/* ... */}
              </Box>
            </Box>
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default PostPage;
