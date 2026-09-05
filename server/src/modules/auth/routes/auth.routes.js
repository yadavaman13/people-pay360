import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { protect, rateLimiter } from '../middleware/auth.middleware.js';
import { sendResponse } from '../../../utils/response.utlis.js';
import {
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
router.post('/register', (req, res) => {
    return sendResponse({
        res,
        statusCode: 410,
        message: 'Public registration is not available. Contact your administrator.',
        success: false,
    });
});
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

// Authenticated Routes
router.use(protect);

router.get('/get-me', authController.getMe);
router.patch('/change-password', changePasswordValidator, authController.changePassword);

export default router;
