import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    Container,
    Alert,
    Tabs,
    Tab,
    CircularProgress
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

import CloseIcon from '@mui/icons-material/Close';
import MailOutlineIcon from '@mui/icons-material/MailOutline';

const Auth = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [tab, setTab] = useState(0);

    const handleAuth = async (isSignUp) => {
        setLoading(true);
        setError(null);
        setMessage(null);

        const { data, error } = isSignUp
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            if (error.message.includes('Email not confirmed')) {
                setError("Please check your email and click the confirmation link before signing in.");
            } else {
                setError(error.message);
            }
        } else {
            if (isSignUp) {
                setMessage('Registration successful! Please Check your email for the confirmation link to activate your account.');
            } else {
                if (onClose) onClose();
            }
        }
        setLoading(false);
    };

    return (
        <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0,0,0,0.8)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)'
        }}>
            <Container component="main" maxWidth="xs">
                <Paper elevation={24} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 4, position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <Button
                        onClick={onClose}
                        sx={{ position: 'absolute', right: 8, top: 8, minWidth: 'auto', color: 'text.secondary' }}
                    >
                        <CloseIcon />
                    </Button>

                    <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
                        SNL - Security Layer
                    </Typography>

                    <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3 }}>
                        <Tab label="Login" />
                        <Tab label="Sign Up" />
                    </Tabs>

                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}
                    {message && (
                        <Alert icon={<MailOutlineIcon />} severity="success" sx={{ width: '100%', mb: 2 }}>
                            {message}
                        </Alert>
                    )}

                    <Box component="form" sx={{ mt: 1, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Email Address"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            label="Password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2, fontWeight: 'bold', fontSize: '1.1rem' }}
                            disabled={loading}
                            onClick={() => handleAuth(tab === 1)}
                            startIcon={loading ? <CircularProgress size={20} /> : tab === 0 ? <LockOutlinedIcon /> : <PersonAddIcon />}
                        >
                            {tab === 0 ? 'Login' : 'Create Account'}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Auth;
