import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Drawer,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import MenuIcon from "@mui/icons-material/Menu";
import NavigationBar from "./NavigationBar";
import SearchBar from "./SearchBar";

interface HeaderProps {
  isLoggedIn: boolean;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ isLoggedIn, onLogout }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navigate = useNavigate(); // <-- useNavigate inside the component

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  return (
    <AppBar position="static" sx={{ zIndex: 1100 }}>
      <Toolbar>
        {/* Hamburger Menu for Mobile */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={toggleDrawer}
          sx={{ display: { xs: "block", md: "none" } }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo */}
        <Box sx={{ flexGrow: 1 }}>
          <img src="/logo.png" alt="Logo" style={{ height: "80px" }} />
        </Box>
        {/* App Title */}
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          EduFedi
        </Typography>
        
        
        {/* Conditional Login/Profile */}
        {isLoggedIn ? (
          <>
            {/* Search Bar */}
            <Box sx={{ p: 2, borderRadius: 1, display: { xs: "none", md: "block" } }}>
                <SearchBar />
            </Box>
            <IconButton color="inherit" onClick={handleMenuOpen}>
              <AccountCircleIcon />
            </IconButton>
            
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
              <MenuItem onClick={handleMenuClose}>My Profile</MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  onLogout();
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <><Button color="inherit" onClick={() => navigate("/signup")}>
              Sign Up
            </Button><Button color="inherit" onClick={() => navigate("/login")}>
                Login
              </Button></>
        )}
      </Toolbar>

      {/* Drawer for Mobile Navigation */}
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
        <Box
          sx={{
            width: 250,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
          role="presentation"
          onClick={toggleDrawer}
          onKeyDown={toggleDrawer}
        >
          <NavigationBar />
        </Box>
      </Drawer>
    </AppBar>
  );
};

export default Header;
