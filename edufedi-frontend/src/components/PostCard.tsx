import React, { useEffect, useState } from "react";
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
import axios from "axios";

const PostCard: React.FC<Post> = ({ id, name, username, content, created, like_count, liked, repost_count, reposted }) => {
    const [likedState, setLikedState] = useState(liked);
    const [likeCount, setLikeCount] = useState(Number(like_count));
    const [repostState, setRepostedState] = useState(reposted );
    const [repostCount, setRepostCount] = useState(Number(repost_count));

    const handleLike = () => {
        if (!likedState) {
            axios.post(`${process.env.REACT_APP_API_BASE_URL}/posts/${id}/like`, {}, { withCredentials: true })
            .then(() => {
                setLikedState(true);
                setLikeCount(likeCount + 1);
            });
            } else {
            axios.delete(`${process.env.REACT_APP_API_BASE_URL}/posts/${id}/like`, { withCredentials: true })
            .then(() => {
                setLikedState(false);
                setLikeCount(likeCount - 1);
            });
            }
    };

    const handleRepost = () => {
        if (!repostState) {
            axios.post(`${process.env.REACT_APP_API_BASE_URL}/posts/${id}/repost`, {}, { withCredentials: true })
            .then(() => {
                setRepostedState(true);
                setRepostCount(repostCount + 1);
            });
        } else {
            axios.delete(`${process.env.REACT_APP_API_BASE_URL}/posts/${id}/repost`, { withCredentials: true })
            .then(() => {
                setRepostedState(false);
                setRepostCount(repostCount - 1);
            });
        }
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
        <Card 
            sx={{
                marginBottom: "20px",
                borderRadius: "10px",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
                width: "100%",
                alignSelf: "center",
            }}
        >
            <CardContent             >
                {/* User Info */}
                <Box
                    display="flex"
                    alignItems="center"
                    marginBottom={2}
                    sx={{ cursor: "pointer" }}
                    onClick={() => window.location.href = `/users/${username}`}
                >
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
                <Typography variant="body1" sx={{ marginBottom: "10px", cursor: "pointer"  }} onClick={() => window.location.href = `/posts/${id}`}>
                    {renderContentWithHashtags(content)}
                </Typography>

                {/* Timestamp */}
                <Typography variant="caption" color="textSecondary">
                    {new Date(created).toLocaleString()}
                </Typography>
            </CardContent>

            {/* Post Actions */}
            <CardActions sx={{ justifyContent: "space-between", padding: "16px" }}>
                <Button
                    size="small"
                    color={likedState ? "primary" : "inherit"}
                    startIcon={likedState ? <ThumbUpIcon /> : <ThumbUpAltOutlinedIcon />}
                    onClick={handleLike}
                >
                    {likeCount}
                </Button>

                {/* Repost Button */}
                <Button
                    size="small"
                    color={repostState ? "primary" : "inherit"}
                    startIcon={repostState ? <RepeatIcon /> : <RepeatOutlinedIcon />}
                    onClick={handleRepost}
                >
                    {repostCount}
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
