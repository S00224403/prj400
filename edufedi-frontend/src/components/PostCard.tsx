import React, { useState } from "react";
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Box,
    Avatar,
    Button,
} from "@mui/material";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbUpAltOutlinedIcon from "@mui/icons-material/ThumbUpAltOutlined";
import RepeatIcon from "@mui/icons-material/Repeat";
import RepeatOutlinedIcon from "@mui/icons-material/RepeatOutlined";
import ReplyIcon from "@mui/icons-material/Reply";
import ShareIcon from "@mui/icons-material/Share";
import { Post } from "../interface";

const PostCard: React.FC<Post> = ({ id, name, username, content, created }) => {
    const [liked, setLiked] = useState(false); // Track liked state
    const [reposted, setReposted] = useState(false); // Track reposted state

    const handleLike = () => {
        setLiked(!liked); // Toggle liked state
    };

    const handleRepost = () => {
        setReposted(!reposted); // Toggle reposted state
    };

    const handleShare = () => {
        // Copy post content or URL to clipboard
        navigator.clipboard.writeText(`${content} - @${username}`);
        alert("Post content copied to clipboard!");
    };

    const renderContentWithHashtags = (text: string) => {
        const hashtagRegex = /#(\w+)/g;
        const parts = text.split(hashtagRegex);

        return parts.map((part, index) => {
            if (index % 2 === 1) {
                // This is a hashtag
                return (
                    <a
                        key={index}
                        href={`/hashtag/${part}`}
                        style={{ color: "#6200ea", textDecoration: "none" }}
                    >
                        #{part}
                    </a>
                );
            }
            return part; // Regular text
        });
    };

    return (
        <Card sx={{ marginBottom: "20px", borderRadius: "10px", boxShadow: "0px 4px 10px rgba(0,0,0,0.1)" }}>
            <CardContent>
                {/* User Info */}
                <Box display="flex" alignItems="center" marginBottom={2}>
                    <Avatar sx={{ marginRight: "10px", backgroundColor: "#6200ea" }}>{name ? name[0] : "?"}</Avatar>
                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {name}
                        </Typography>
                        <Typography variant="subtitle2" color="textSecondary">
                            @{username}
                        </Typography>
                    </Box>
                </Box>

                {/* Post Content */}
                <Typography variant="body1" sx={{ marginBottom: "10px" }}>
                    {renderContentWithHashtags(content)}
                </Typography>

                {/* Timestamp */}
                <Typography variant="caption" color="textSecondary">
                    {new Date(created).toLocaleString()}
                </Typography>
            </CardContent>

            {/* Post Actions */}
            <CardActions>
                {/* Like Button */}
                <Button
                    size="small"
                    color={liked ? "primary" : "inherit"}
                    startIcon={liked ? <ThumbUpIcon /> : <ThumbUpAltOutlinedIcon />}
                    onClick={handleLike}
                >
                </Button>

                {/* Repost Button */}
                <Button
                    size="small"
                    color={reposted ? "primary" : "inherit"}
                    startIcon={reposted ? <RepeatIcon /> : <RepeatOutlinedIcon />}
                    onClick={handleRepost}
                >
                </Button>

                {/* Reply Button */}
                <Button size="small" color="inherit" startIcon={<ReplyIcon />}>
                </Button>

                {/* Share Button */}
                <Button size="small" color="inherit" onClick={handleShare} startIcon={<ShareIcon />}>
                </Button>
            </CardActions>
        </Card>
    );
};

export default PostCard;
