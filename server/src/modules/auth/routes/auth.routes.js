import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';
import { protect, rateLimiter } from '../middleware/auth.middleware.js';
import envConfig from '../../../config/env.config.js';
import {
    registerValidator,
    loginValidator,
    changePasswordValidator,
    forgotPasswordValidator,
    sendVerificationOtpValidator,
    resetPasswordValidator,
    recoverAccountValidator,
    verifyRecoverAccountValidator,
    verifyForgotPasswordOtpValidator,
} from '../validators/auth.validator.js';

const router = Router();

const authRateLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 6 }); //rate limiting

// Public Routes
router.post('/register', authRateLimiter, registerValidator, authController.register);
router.post(
    '/send-verification-otp',
    authRateLimiter,
    sendVerificationOtpValidator,
    authController.sendVerificationOtp,
);
router.post('/login', authRateLimiter, loginValidator, authController.login);
router.post(
    '/forgot-password',
    authRateLimiter,
    forgotPasswordValidator,
    authController.forgotPassword,
);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);
router.post(
    '/verify-forgot-password-otp',
    verifyForgotPasswordOtpValidator,
    authController.verifyForgotPasswordOtp,
);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-otp', authController.resendOtpHandler);
router.post('/logout', authController.logout);
router.post(
    '/recover-account/request',
    authRateLimiter,
    recoverAccountValidator,
    authController.requestAccountRecovery,
);
router.post(
    '/recover-account/verify',
    verifyRecoverAccountValidator,
    authController.verifyAccountRecovery,
);
// Google OAuth routes
router.get('/google', (req, res, next) => {
    const state = JSON.stringify({ mode: 'login' });
    res.cookie('google_oauth_mode', 'login', {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state,
    })(req, res, next);
});

router.get('/google/register', (req, res, next) => {
    const role = (req.query.role || 'USER').toUpperCase();
    const state = JSON.stringify({ mode: 'register', role });
    res.cookie('google_oauth_mode', 'register', {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });
    res.cookie('google_oauth_role', role, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
    });
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        session: false,
        state,
    })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) {
            console.error('Google OAuth callback error:', err);
            return res.redirect(`${envConfig.CLIENT_ORIGIN}/login?error=google_auth_failed`);
        }
        if (!user) {
            if (info?.message === 'no_account') {
                return res.redirect(`${envConfig.CLIENT_ORIGIN}/login?error=no_google_account`);
            }
            if (info?.message === 'account_exists') {
                return res.redirect(`${envConfig.CLIENT_ORIGIN}/login?error=google_account_exists`);
            }
            if (info?.message === 'account_deleted') {
                return res.redirect(`${envConfig.CLIENT_ORIGIN}/login?error=account_deleted`);
            }
            return res.redirect(`${envConfig.CLIENT_ORIGIN}/login?error=google_auth_failed`);
        }
        req.user = user;
        req.authInfo = info;
        return authController.googleCallback(req, res, next);
    })(req, res, next);
});

// Authenticated Routes
router.use(protect);

router.get('/get-me', authController.getMe);
router.patch('/change-password', changePasswordValidator, authController.changePassword);

export default router;
