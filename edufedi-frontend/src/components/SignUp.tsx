import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import axios from "axios";

interface SignupProps {
  onSignupSuccess?: () => void;
}

const Signup: React.FC<SignupProps> = ({ onSignupSuccess }) => {
  const navigate = useNavigate(); // Initialize useNavigate
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    display_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (formData.password.length > 0 && formData.password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
    } else if (
      formData.confirmPassword.length > 0 &&
      formData.password !== formData.confirmPassword
    ) {
      setPasswordError("Passwords do not match.");
    } else {
      setPasswordError(null);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/auth/signup`,
        {
          username: formData.username,
          email: formData.email,
          password: formData.password,
          display_name: formData.display_name,
        }
      );
      setMessage("Account created! Redirecting to login...");
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        display_name: "",
      });
      if (onSignupSuccess) onSignupSuccess();
      setTimeout(() => navigate("/login"), 2000); // Redirect to login page after 2 seconds
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        setError(
          err.response?.data?.error ||
            err.response?.data ||
            "Signup failed. Please try again."
        );
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        maxWidth: "400px",
        margin: "0 auto",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
        backgroundColor: "#fff",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Sign Up
      </Typography>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <form onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label="Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Display Name"
          name="display_name"
          value={formData.display_name}
          onChange={handleChange}
          margin="normal"
          required
        />
        <TextField
          fullWidth
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          margin="normal"
          required
          helperText={"At least 8 characters"}
          error={!!passwordError}
        />
        <TextField
          fullWidth
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          value={formData.confirmPassword}
          onChange={handleChange}
          margin="normal"
          required
          helperText={passwordError || ""}
          error={!!passwordError}
        />
        <Box sx={{ position: "relative", marginTop: "20px" }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading || !!passwordError}
            sx={{ paddingY: "10px" }}
          >
            {loading ? (
              <>
                <CircularProgress size={24} sx={{ color: "#fff" }} />
                &nbsp;Signing Up...
              </>
            ) : (
              "Sign Up"
            )}
          </Button>
        </Box>
      </form>
      <Box sx={{ marginTop: "20px" }}>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          onClick={() => navigate("/")}
        >
          Back to Homepage
        </Button>
      </Box>
    </Box>
  );
};

export default Signup;
