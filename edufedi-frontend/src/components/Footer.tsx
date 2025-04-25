import React from "react";
import { AppBar, Box, Link, Toolbar, Typography } from "@mui/material";

const Footer: React.FC = () => {
  return (
    <AppBar position="static" color="inherit" style={{ marginTop: "20px" }} sx={{ display: { xs: "none", md: "block" } }}>
      <Toolbar style={{ justifyContent: "center" }}>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <Typography variant="body1" color="textSecondary">
            EduFedi.
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Link href="/about" color="inherit" underline="hover">
              About
            </Link>
            <Link href="https://github.com/S00224403/prj400" color="inherit" underline="hover">
              Source Code
            </Link>
          </Box>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Footer;
