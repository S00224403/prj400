import React, { useState, useEffect } from "react";
import { Box, Typography, Button, Badge } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import DescriptionIcon from "@mui/icons-material/Description";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ExploreIcon from "@mui/icons-material/Explore";
import Footer from "./Footer";

const NavigationBar: React.FC = () => {
  const [notificationCount, setNotificationCount] = useState<number>(0);

  // Fetch notifications count
  useEffect(() => {
    const fetchNotifications = async () => {
      const count = await new Promise<number>((resolve) => setTimeout(() => resolve(3), 1000)); // Simulated API response for testing
      setNotificationCount(count);
    };

    fetchNotifications();
  }, []);

  return (
    <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {/* Navigation Links */}
        <Box sx={{ position: "sticky", top: 0, zIndex: 2, bgcolor: "background.paper" }}>
          <Typography variant="h6" sx={{ marginBottom: "16px" }}>
            Navigation
          </Typography>
          <Box sx={{ flex: 1, minHeight: 0 }}>
          <Button
            fullWidth
            variant="text"
            href="/"
            startIcon={<HomeIcon />}
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              marginBottom: "10px",
            }}
          >
            Home
          </Button>
          <Button
            fullWidth
            variant="text"
            href="/"
            startIcon={<ExploreIcon />}
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              marginBottom: "10px",
            }}
          >
            EduFedi Timeline
          </Button>
          <Button
            fullWidth
            variant="text"
            startIcon={<DescriptionIcon />}
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              marginBottom: "10px",
            }}
          >
            Research Papers
          </Button>
          <Button
            fullWidth
            variant="text"
            startIcon={
              <Badge badgeContent={notificationCount} color="primary">
                <NotificationsIcon />
              </Badge>
            }
            sx={{
              color: "inherit",
              justifyContent: "flex-start",
              "&:hover": { backgroundColor: "rgba(0, 0, 0, 0.04)" },
              marginBottom: "10px",
            }}
          >
            Notifications
          </Button>
          </Box>
        </Box>
      </Box>
    </Box>
    
    
  );
};

export default NavigationBar;
