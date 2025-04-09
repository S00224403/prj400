import React, { useEffect, useState } from "react";
import axios from "axios";
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
} from "@mui/material";
import { Post } from "../interface";

const Homepage: React.FC = (): React.ReactElement => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // Fetch posts from the backend API
    axios
      .get<Post[]>("http://localhost:8080/users/matiw885/posts")
      .then((response) => setPosts(response.data))
      .catch((error) => console.error("Error fetching posts:", error));
  }, []);

  const handleAddPost = () => {
    console.log("Add Post button clicked");
  };

  return (
    <Container>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          {/* Logo Image */}
          <Box component="img" src="/logo.png" alt="Logo" sx={{ width: 50, height: 50, marginRight: 2 }} />
          <Typography variant="h6" style={{ flexGrow: 1 }}>
            EduFedi
          </Typography>
          <Button color="inherit">Login</Button>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Grid container spacing={3} style={{ marginTop: "20px" }}>
        <Grid size={{xs: 12, md: 3}}>
          <Typography variant="h6">Navigation</Typography>
          <Button fullWidth variant="contained" color="primary" href="/timeline">
            EduFedi Timeline
          </Button>
          <Button fullWidth variant="contained" color="secondary" href="/research">
            Research Papers
          </Button>
          <Button fullWidth variant="contained" color="success" href="/notifications">
            Notifications
          </Button>
        </Grid>

        {/* Timeline */}
        <Grid size={{xs: 12, md: 9}}>
          {/* Add Post Button */}
          <Button
            variant="contained"
            color="primary"
            style={{ marginBottom: "20px" }}
            onClick={handleAddPost}
          >
            Add Post
          </Button>

          {/* Timeline Header */}
          <Typography variant="h5">EduFedi Timeline</Typography>

          {/* Posts */}
          {posts.length > 0 ? (
            posts.map((post) => (
              <Card key={post.id} style={{ marginBottom: "20px" }}>
                <CardContent>
                  <Typography variant="subtitle1">@{post.username}</Typography> {/* Replace actor_id with username if available */}
                  <Typography variant="body1">{post.content}</Typography>
                </CardContent>
                <CardActions>
                  <Button size="small" color="primary">
                    Like
                  </Button>
                  <Button size="small" color="secondary">
                    Repost
                  </Button>
                  <Button size="small" color="success">
                    Reply
                  </Button>
                </CardActions>
              </Card>
            ))
          ) : (
            <Typography>No posts available.</Typography>
          )}
        </Grid>
      </Grid>

      {/* Footer */}
      <AppBar position="static" style={{ marginTop: "20px", backgroundColor: "#6200ea" }}>
        <Toolbar style={{ justifyContent: "center" }}>
          <Typography variant="body2">&copy; 2025 EduFedi. All rights reserved.</Typography>
        </Toolbar>
      </AppBar>
    </Container>
  );
};

export default Homepage;
