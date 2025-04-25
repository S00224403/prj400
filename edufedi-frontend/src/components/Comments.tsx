import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  IconButton,
  Collapse
} from "@mui/material";
import axios from "axios";
import { useAuth } from "./AuthContext";
import ReplyIcon from "@mui/icons-material/Reply";

interface Comment {
  id: number;
  content: string;
  created: string;
  actor_id: number;
  parent_comment_id: number | null;
  username: string;
  name: string;
  replies?: Comment[];
}

export default function Comments({ postId }: { postId: number }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  // Fetch comments when component mounts or postId changes
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/posts/${postId}/comments`
        );
        setComments(buildCommentTree(response.data));
      } catch (error) {
        console.error("Failed to fetch comments:", error);
      }
    };
    fetchComments();
  }, [postId]);

  // Transform flat comments array into nested tree structure
  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const roots: Comment[] = [];
    
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
      
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        parent?.replies?.push(comment);
      } else {
        roots.push(comment);
      }
    });
    
    return roots;
  };

  const handleSubmit = async (parentCommentId: number | null = null) => {
    if (!newComment.trim()) return;
    
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/posts/${postId}/comments`,
        {
          content: newComment,
          parent_comment_id: parentCommentId
        },
        { withCredentials: true }
      );
      
      setNewComment("");
      setReplyingTo(null);
      // Refresh comments after submission
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/posts/${postId}/comments`
      );
      setComments(buildCommentTree(response.data));
    } catch (error) {
      console.error("Failed to post comment:", error);
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => (
    <Box sx={{ 
      ml: depth * 3,
      borderLeft: depth > 0 ? '2px solid #eee' : 'none',
      pl: depth > 0 ? 2 : 0
    }}>
      <ListItem alignItems="flex-start" sx={{ pt: 1, pb: 0 }}>
        <Avatar sx={{ mr: 2, bgcolor: '#6200ee' }}>
          {comment.name[0].toUpperCase()}
        </Avatar>
        <ListItemText
          primary={
            <>
              <Typography variant="subtitle2" component="span">
                {comment.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                @{comment.username}
              </Typography>
            </>
          }
          secondary={
            <>
              <Typography variant="body2" paragraph sx={{ mb: 0, whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(comment.created).toLocaleDateString()}
                </Typography>
                <IconButton
                  size="small"
                  sx={{ ml: 1, color: '#6200ee' }}
                  onClick={() => setReplyingTo(comment.id === replyingTo ? null : comment.id)}
                >
                  <ReplyIcon fontSize="small" />
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    Reply
                  </Typography>
                </IconButton>
              </Box>
            </>
          }
        />
      </ListItem>

      <Collapse in={replyingTo === comment.id}>
        <Box sx={{ ml: 6, mr: 2, mb: 2 }}>
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write your reply..."
            variant="outlined"
            sx={{ mb: 1 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => handleSubmit(comment.id)}
              sx={{ bgcolor: '#6200ee', '&:hover': { bgcolor: '#4a00c0' } }}
            >
              Post Reply
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setReplyingTo(null)}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Collapse>

      {comment.replies?.map((reply) => (
        <CommentItem 
          key={reply.id} 
          comment={reply} 
          depth={depth + 1}
        />
      ))}
    </Box>
  );

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" sx={{ mb: 2, color: '#6200ee' }}>
        Comments
      </Typography>

      {/* New comment input (top level) */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          multiline
          minRows={3}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          variant="outlined"
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
          <Button
            variant="contained"
            onClick={() => handleSubmit()}
            sx={{ bgcolor: '#6200ee', '&:hover': { bgcolor: '#4a00c0' } }}
          >
            Post Comment
          </Button>
        </Box>
      </Box>

      {/* Comments list */}
      <List sx={{ width: '100%' }}>
        {comments.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </List>
    </Box>
  );
}
