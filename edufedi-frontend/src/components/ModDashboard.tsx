import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  List, 
  ListItem, 
  ListItemText, 
  Container,
  Toolbar,
  Avatar,
  IconButton,
  AppBar,
  Link,
} from "@mui/material";
// Add at the top with other imports
import HomeIcon from "@mui/icons-material/Home";
import FlagIcon from "@mui/icons-material/Flag";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import { useSnackbar } from "notistack";
import { useAuth } from "./AuthContext";

interface Report {
  report_id: number;
  reason: string;
  report_date: string;
  post_id: number;
  post_content: string;
  author_name: string;
  author_username: string;
  reporter_name: string;
  reporter_username: string;
}

export default function ModDashboard() {
    const { isLoggedIn, user, setIsLoggedIn, setUser, logout } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_BASE_URL}/moderation/reports`,
          { withCredentials: true }
        );
        setReports(response.data);
      } catch (error) {
        enqueueSnackbar("Failed to load reports", { variant: "error" });
      }
    };
    fetchReports();
  }, []);

  const handleResolve = async (reportId: number) => {
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/moderation/reports/${reportId}/resolve`,
        {},
        { withCredentials: true }
      );
      setReports(reports.filter(r => r.report_id !== reportId));
      enqueueSnackbar("Report resolved", { variant: "success" });
    } catch (error) {
      enqueueSnackbar("Failed to resolve report", { variant: "error" });
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Navigation Bar */}
      <AppBar position="static" sx={{ backgroundColor: "#6200ea", mb: 4 }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            EduFedi Moderation
          </Typography>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button
              color="inherit"
              href="/"
              sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <HomeIcon />
            </Button>
            
            <Button
              color="inherit"
              href="/moderation"
              sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              <FlagIcon />
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar sx={{ bgcolor: "white", color: "#6200ea" }}>
                {user?.username?.[0]?.toUpperCase() || "U"}
              </Avatar>
              <Button 
                color="inherit" 
                onClick={logout}
                sx={{ textTransform: 'none' }}
              >
                Logout
              </Button>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="md" sx={{ flex: 1 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 700, 
          color: "#6200ea",
          mb: 4
        }}>
          Reported Content
        </Typography>
        
        <List sx={{ width: "100%" }}>
          {reports.map((report) => (
            <Paper 
              key={report.report_id} 
              sx={{ 
                mb: 3, 
                p: 2,
                borderRadius: "8px",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
                transition: "transform 0.2s",
                "&:hover": {
                  transform: "translateY(-2px)"
                }
              }}
            >
              <ListItem alignItems="flex-start" sx={{ p: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {report.reason}
                    </Typography>
                  }
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        {report.post_content}
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: "block", mt: 1 }}
                      >
                        Author: {report.author_name} (@{report.author_username})
                      </Typography>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                      >
                        Reported by: {report.reporter_name} (@{report.reporter_username})
                      </Typography>
                    </>
                  }
                />
              </ListItem>

              <Box sx={{ 
                display: "flex", 
                gap: 2, 
                mt: 2,
                borderTop: "1px solid #eee",
                pt: 2
              }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleResolve(report.report_id)}
                  sx={{
                    bgcolor: "#6200ea",
                    "&:hover": { bgcolor: "#4a00c0" }
                  }}
                >
                  Mark Resolved
                </Button>
                <Button
                  variant="outlined"
                  color="primary"
                  href={`/users/${report.author_username}/posts/${report.post_id}`}
                  target="_blank"
                  sx={{
                    color: "#6200ea",
                    borderColor: "#6200ea",
                    "&:hover": { 
                      borderColor: "#4a00c0",
                      backgroundColor: "rgba(98,0,234,0.05)" 
                    }
                  }}
                >
                  View Post
                </Button>
              </Box>
            </Paper>
          ))}
        </List>

        {reports.length === 0 && (
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ 
              textAlign: "center", 
              mt: 4,
              fontStyle: "italic"
            }}
          >
            No pending reports - everything looks good! 👍
          </Typography>
        )}
      </Container>
    </Box>
  );
}