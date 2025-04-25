import React, { useEffect, useState } from 'react';
import { Container, Grid, Box, Typography, Stack, Fab, Modal, Avatar } from '@mui/material';
import NavigationBar from './NavigationBar';
import PostCard from './PostCard';
import AddPost from './AddPost';
import Footer from './Footer';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Header from './Header';        
import { useAuth } from './AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Post, User } from '../interface';
import axios from 'axios';
import { Button, IconButton, Snackbar } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const UserPage: React.FC = () => {
    const { username } = useParams<{ username: string }>();
    const { isLoggedIn, user, setIsLoggedIn, setUser, logout } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: currentUser } = useAuth();
    const isMobile = useMediaQuery("(max-width:600px)");
    const [addPostOpen, setAddPostOpen] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const navigate = useNavigate();
    const handleDeleteAccount = async () => {
      if (!window.confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;
      try {
        await axios.delete(`${process.env.REACT_APP_API_BASE_URL}/auth/delete-account`, { withCredentials: true });
        // Optionally, clear user context and redirect to home/login
        logout(); // If you have a logout function in context
        navigate("/login");
      } catch (err) {
        alert("Failed to delete account.");
      }
    };
    useEffect(() => {
        const checkFollowStatus = async () => {
          if (!currentUser || currentUser.username === username) return;
          
          try {
            const response = await axios.get(
              `${process.env.REACT_APP_API_BASE_URL}/users/${username}/follow-status`,
              { withCredentials: true }
            );
            setIsFollowing(response.data.isFollowing);
          } catch (err) {
            console.error('Error checking follow status:', err);
          }
        };
      
    checkFollowStatus();
    }, [username, currentUser]);
      
    const handleFollow = async () => {
        if (!currentUser || !profile || isProcessing) return;
        setIsProcessing(true);
      
        const wasFollowing = isFollowing;
        setIsFollowing(!wasFollowing);
        setProfile(prev =>
          prev
            ? {
                ...prev,
                follower_count: wasFollowing
                  ? prev.follower_count as number - 1
                  : prev.follower_count as number + 1,
              }
            : prev
        );
      
        try {
          if (wasFollowing) {
            await axios.delete(
              `${process.env.REACT_APP_API_BASE_URL}/users/${username}/unfollow`,
              { withCredentials: true }
            );
            setSnackbarMessage('Unfollowed successfully');
          } else {
            await axios.post(
              `${process.env.REACT_APP_API_BASE_URL}/users/${username}/follow`,
              {},
              { withCredentials: true }
            );
            setSnackbarMessage('Followed successfully');
          }
          // Refetch profile for accurate follower count
          const profileResponse = await axios.get(
            `${process.env.REACT_APP_API_BASE_URL}/users/${username}`
          );
          setProfile(profileResponse.data);
        } catch (err) {
          // Rollback UI on error
          setIsFollowing(wasFollowing);
          setProfile(prev =>
            prev
              ? {
                  ...prev,
                  follower_count: wasFollowing
                    ? prev.follower_count as number + 1
                    : prev.follower_count as number - 1,
                }
              : prev
          );
          setSnackbarMessage('Error updating follow status');
        } finally {
          setIsProcessing(false);
          setSnackbarOpen(true);
        }
      };          
      
      // Add share handler
      const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setSnackbarMessage('Profile link copied to clipboard!');
        setSnackbarOpen(true);
      };
      
    useEffect(() => {
        const fetchProfileData = async () => {
        try {
            // Fetch user profile data
            const profileResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/users/${username}`, {withCredentials: true});
            setProfile(profileResponse.data);

            // Fetch user's posts
            const postsResponse = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/users/${username}/posts`, {withCredentials: true});
            setPosts(postsResponse.data);
            
            setLoading(false);
        } catch (err) {
            setError('Failed to load profile');
            setLoading(false);
        }
        };

        fetchProfileData();
    }, [username]);
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
                alignItems: "center",
              }}
            >
                <NavigationBar/>
                <Box sx={{ flexShrink: 0 }}>
                    <Footer />
                </Box>  
            </Grid>
    
            {/* Main Post Content */}
            <Grid
                size={{ xs: 12, md: 6 }}
                sx={{
                    height: "100%",
                    minHeight: 0,
                    overflowY: "auto",
                    paddingX: "20px",
                    paddingY: "20px",
                    display: "flex",
                    alignItems: "stretch",
                    flexDirection: "column"
                }}
                >
                {loading ? (
                    <Typography variant="body1" sx={{ textAlign: 'center' }}>
                    Loading...
                    </Typography>
                ) : !profile ? (
                    <Typography variant="body1" sx={{ textAlign: 'center' }}>
                    User not found.
                    </Typography>
                ) : (
                    <>
                    {/* Profile Header */}
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'center', sm: 'flex-start' },
                            justifyContent: { xs: 'center', sm: 'space-between' },
                            p: { xs: 2, sm: 3 },
                            mb: { xs: 3, sm: 4 },
                            borderRadius: 3,
                            boxShadow: 2,
                            background: '#fff',
                            gap: { xs: 2, sm: 3 },
                            maxWidth: '100%',
                        }}
                        >
                        {/* Avatar and Info Container */}
                        <Box 
                            sx={{
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            alignItems: { xs: 'center', sm: 'flex-start' },
                            gap: { xs: 2, sm: 3 },
                            width: '100%'
                            }}
                        >
                            {/* Avatar - Responsive sizing */}
                            <Avatar
                            src={profile?.profile_picture || undefined}
                            alt={profile?.name}
                            sx={{
                                width: { xs: 80, sm: 90 },
                                height: { xs: 80, sm: 90 },
                                fontSize: { xs: 32, sm: 40 },
                                bgcolor: theme => theme.palette.primary.light,
                            }}
                            >
                            {!profile?.profile_picture && profile?.username[0].toUpperCase()}
                            </Avatar>

                            {/* Profile Text Content */}
                            <Box sx={{ 
                            textAlign: { xs: 'center', sm: 'left' },
                            width: '100%' 
                            }}>
                            <Typography 
                                variant="h4" 
                                fontWeight={700}
                                sx={{ 
                                fontSize: { xs: '1.5rem', sm: '2rem' } 
                                }}
                            >
                                {profile?.name}
                            </Typography>
                            <Typography variant="subtitle1" color="text.secondary">
                                @{profile?.username}
                            </Typography>
                            <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ mt: 0.5 }}
                            >
                                Joined {profile?.created ? new Date(profile.created).toLocaleDateString() : ''}
                            </Typography>
                            
                            {/* Stats - Responsive spacing and layout */}
                            <Stack 
                                direction="row" 
                                spacing={{ xs: 2, sm: 3 }}
                                sx={{ 
                                mt: 1,
                                justifyContent: { xs: 'center', sm: 'flex-start' } 
                                }}
                            >
                                <Typography variant="body2">
                                <b>{profile?.post_count ?? 0}</b> Posts
                                </Typography>
                                <Typography variant="body2">
                                <b>{profile?.follower_count ?? 0}</b> Followers
                                </Typography>
                                <Typography variant="body2">
                                <b>{profile?.following_count ?? 0}</b> Following
                                </Typography>
                            </Stack>
                            </Box>
                        </Box>

                        {/* Action Buttons */}
                        <Box 
                            sx={{ 
                            display: 'flex', 
                            gap: 2,
                            width: { xs: '100%', sm: 'auto' },
                            justifyContent: { xs: 'center', sm: 'flex-end' },
                            mt: { xs: 2, sm: 0 }
                            }}
                        >
                            {currentUser && currentUser.username === profile?.username && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={handleDeleteAccount}
                                    sx={{ mt: 2 }}
                                >
                                    Delete Account
                                </Button>
                            )}
                            {currentUser && currentUser.username !== username && (
                            <Button
                                variant={isFollowing ? "outlined" : "contained"}
                                color="primary"
                                onClick={handleFollow}
                                disabled={isProcessing}
                                sx={{ 
                                minWidth: { xs: '45%', sm: 110 },
                                py: { xs: 1, sm: 'auto' }
                                }}
                            >
                                {isFollowing ? 'Unfollow' : 'Follow'}
                            </Button>
                            )}
                            <IconButton
                            onClick={handleShare}
                            aria-label="share profile"
                            sx={{ 
                                border: '1px solid', 
                                borderColor: 'divider',
                                width: { xs: 42, sm: 'auto' },
                                height: { xs: 42, sm: 'auto' }
                            }}
                            >
                            <ContentCopyIcon />
                            </IconButton>
                        </Box>
                    </Box>

                    {/* User's Posts */}
                    <Box sx={{ flexGrow: 1 }}>
                        {posts.length === 0 ? (
                        <Typography variant="body1" sx={{ textAlign: 'center' }}>
                            No posts yet.
                        </Typography>
                        ) : (
                        posts.map((post) => (
                            <PostCard key={post.id} {...post} />
                        ))
                        )}
                    </Box>
                    </>
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
        <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        />
        </Container>
      );
};

export default UserPage;