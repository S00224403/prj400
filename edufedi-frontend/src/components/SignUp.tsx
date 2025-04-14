import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

// Define the expected structure of the API response
type SignUpResponse = {
  message: string;
};

type SignUpError = {
  error: string;
};

const SignUp: React.FC = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    display_name: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await axios.post<SignUpResponse>(
        `${process.env.REACT_APP_API_BASE_URL}/auth/signup`,
        formData
      );
      setMessage(response.data.message);
      setFormData({ username: "", email: "", password: "", display_name: "" });
    } catch (err) {
      if (axios.isAxiosError(err)) {
        // Handle Axios-specific errors
        const axiosError = err.response?.data as SignUpError;
        setError(axiosError?.error || "An error occurred");
      } else {
        // Handle non-Axios errors
        setError("An unexpected error occurred");
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
      <form onSubmit={handleSubmit}>
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
          label="Password"
          name="password"
          type="password"
          value={formData.password}
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
        <Box sx={{ position: "relative", marginTop: "20px" }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
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
    </Box>
  );
};

export default SignUp;
