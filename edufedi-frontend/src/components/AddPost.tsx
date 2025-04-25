import React, { useRef, useState } from "react";
import {
  Box,
  TextField,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import ImageIcon from "@mui/icons-material/Image";
import axios from "axios";

interface AddPostProps {
  isMobile: boolean;
  currentUser: {
    name: string;
    username: string;
    avatar?: string; // Optional avatar URL
  };
}

const AddPost: React.FC<AddPostProps> = ({ isMobile, currentUser }) => {
  const [postContent, setPostContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [filename, setFilename] = useState("");

  const maxCharacters = 500;

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setFilename(event.target.files[0].name);
    }
  };

  const handleImageButtonClick = () => {
    inputFileRef.current?.click();
  };
  
  const handleSubmit = () => {
    const formData = new FormData();
    formData.append("content", postContent);
    if (file) formData.append("file", file); // Use "file" as field name
  
    axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/users/${currentUser.username}/posts`,
      formData,
      { withCredentials: true }
    )
    .then(() => { setPostContent(""); setFile(null); })
    .catch(console.error);
  };

  return (
    <Box
      sx={{
        backgroundColor: "#ffffff", // Light theme background
        color: "#333333", // Dark gray text
        borderRadius: "12px",
        padding: "16px",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        marginBottom: "20px",
      }}
    >
      {/* User Info */}
      <Box display="flex" alignItems="center" marginBottom={2}>
        <Box
          sx={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            backgroundColor: currentUser.avatar ? "transparent" : "#6200ea", // Purple accent for avatar if no image
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden", // Clip avatar image
          }}
        >
          {currentUser.avatar ? (
            <img src={currentUser.avatar} alt={currentUser.name} style={{ width: "100%", height: "100%" }} />
          ) : (
            <Typography variant="h6" sx={{ color: "#fff" }}>
              {currentUser.name[0]} {/* First letter of name */}
            </Typography>
          )}
        </Box>
        <Box sx={{ marginLeft: "10px" }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {currentUser.name}
          </Typography>
          <Typography variant="subtitle2" color="textSecondary">
            @{currentUser.username}
          </Typography>
        </Box>
      </Box>

      {/* Post Input */}
      <TextField
        placeholder="What's on your mind?"
        multiline
        rows={4}
        fullWidth
        value={postContent}
        onChange={(e) => setPostContent(e.target.value)}
        sx={{
          backgroundColor: "#f7f7f7", // Light gray input background
          borderRadius: "8px",
          marginBottom: "16px",
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#ddd", // Light gray border
            },
            "&:hover fieldset": {
              borderColor: "#6200ea", // Purple accent on hover
            },
            "&.Mui-focused fieldset": {
              borderColor: "#6200ea", // Purple accent on focus
            },
          },
        }}
      />
      {/* Character Counter */}
      <Typography variant="body2" color={postContent.length > maxCharacters ? "error" : "inherit"}>
            {postContent.length}/{maxCharacters}
      </Typography> 
      {/* Hidden file input */}
      <input
        type="file"
        accept=".pdf,.doc,.docx,image/*"
        style={{ display: "none" }}
        ref={inputFileRef}
        onChange={handleFileUpload}
      />
      {/* Action Buttons */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        
        {/* Right Buttons */}
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton sx={{ color: "#6200ea" }} onClick={handleImageButtonClick}>
            <ImageIcon />
          </IconButton>
          <IconButton sx={{ color: "#6200ea" }}>
            <EmojiEmotionsIcon />
          </IconButton>
        </Box>
        {/* Show selected file */}
        {filename && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected: {filename}
          </Typography>
        )}
      </Box>
      {/* Submit Button */}
      <Button
            variant="contained"
            sx={{
              backgroundColor: "#6200ea", // Purple accent for button background
              color: "#fff",
              "&:hover": { backgroundColor: "#4b00b5" }, // Darker purple on hover
            }}
            onClick={handleSubmit}
            disabled={postContent.length === 0 || postContent.length > maxCharacters}
          >
            Post
      </Button>
    </Box>
  );
};

export default AddPost;
