import React, { useState, useEffect } from "react";
import { 
  TextField, 
  List, 
  ListItem, 
  ListItemAvatar,
  Avatar,
  ListItemText,
  Typography,
  Paper,
  Box
} from "@mui/material";
import axios from "axios";
import { Link } from "react-router-dom";
import { SearchResult } from "../interface"; // Adjust the import path as necessary

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult>({ users: [], posts: [] });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.trim().length === 0) {
        setResults({ users: [], posts: [] });
        return;
      }
      
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/search?q=${encodeURIComponent(query)}`
        );
        setResults(response.data);
      } catch (error) {
        console.error("Search error:", error);
      }
    };

    const debounce = setTimeout(() => search(), 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <Box sx={{ position: "relative", width: "100%", maxWidth: 600, backgroundColor: "white" }}>
        <TextField
            fullWidth
            variant="outlined"
            placeholder="Search users and posts..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
                if (!results.users.length && !results.posts.length) {
                setIsOpen(false);
                }
            }}
            autoComplete="off" // Add this to prevent browser autocomplete
        />

      {isOpen && (
        <Paper 
          sx={{
            position: "absolute",
            width: "100%",
            maxHeight: 400,
            overflow: "auto",
            mt: 1,
            zIndex: 1
          }}
        >
          <List>
            {/* Users Section */}
            <Typography variant="subtitle2" sx={{ px: 2, pt: 1 }}>
              Users
            </Typography>
            {results.users.map((user) => (
                <ListItem 
                    key={user.username}
                    component={Link}
                    to={`/users/${user.username}`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur from TextField
                    onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                    }}
                >

                <ListItemAvatar>
                    <Avatar>{user.name?.[0] || "?"}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.name}
                  secondary={`@${user.username}`}
                />
              </ListItem>
            ))}

            {/* Posts Section */}
            <Typography variant="subtitle2" sx={{ px: 2, pt: 2 }}>
              Posts
            </Typography>
            {results.posts.map((post) => (
                <ListItem
                    key={post.id}
                    component={Link}
                    to={`/users/${post.username}/posts/${post.id}`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur from TextField
                    onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                    }}
                >
                    <ListItemText
                    primary={post.content}
                    secondary={`Posted by @${post.username}`}
                    />
                </ListItem>
            ))}
            {results.federated?.map(federatedUser => (
                <ListItem 
                    key={federatedUser.uri}
                    component="a"
                    href={`${federatedUser.uri}`}
                    sx={{ textDecoration: "none", color: "inherit" }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent blur from TextField
                    onClick={() => {
                    setIsOpen(false);
                    setQuery("");
                    }}
                >
                    <ListItemAvatar>
                    <Avatar>{(federatedUser.username[0]).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                    primary={federatedUser.username}
                    secondary={`Federated user on ${federatedUser.domain}`}
                    />
                </ListItem>
            ))}
            {/* No Results Message */}
            {results.users.length === 0 && results.posts.length === 0 && (
              <ListItem>
                <ListItemText primary="No results found" />
              </ListItem>
            )}
          </List>
        </Paper>
      )}
    </Box>
  );
}
