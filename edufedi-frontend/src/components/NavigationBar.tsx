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
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between", // Push footer to the bottom
        height: "100vh", // Ensure full height for flexbox
        padding: "16px",
        overflow: "hidden",
      }}
    >
      {/* Navigation Links */}
      <Box>
        <Typography variant="h6" sx={{ marginBottom: "16px" }}>
          Navigation
        </Typography>
        <Button
          fullWidth
          variant="text"
          href="/timeline"
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
          href="/timeline"
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
          href="/research"
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
          href="/notifications"
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

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default NavigationBar;
