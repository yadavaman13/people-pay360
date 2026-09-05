import { Router } from 'express';
import multer from 'multer';
import * as adminController from '../controllers/admin.controller.js';
import { protect, restrictTo } from '../middleware/auth.middleware.js';
import {
    adminCreateUserValidator,
    adminListUsersQueryValidator,
    adminUpdateRoleValidator,
    adminUpdateStatusValidator,
    updateProfileValidator,
    deleteAccountValidator,
} from '../validators/user.validator.js';
import { changePasswordValidator } from '../validators/auth.validator.js';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// Protect all admin routes
router.use(protect);
router.use(restrictTo('ADMIN'));

// Admin User Management Routes
router.post('/users', adminCreateUserValidator, adminController.adminCreateUser);
router.get('/users', adminListUsersQueryValidator, adminController.adminListUsers);
router.post('/users/cleanup', adminController.adminCleanupUsers);
router.get('/users/:id', adminController.adminGetUserById);
router.patch('/users/:id/role', adminUpdateRoleValidator, adminController.adminUpdateRole);
router.patch('/users/:id/status', adminUpdateStatusValidator, adminController.adminUpdateStatus);
router.delete('/users/:id', adminController.adminDeleteUser);

// Admin Profile / Personal Routes
router.get('/get-me', adminController.getMe);
router.patch('/profile', updateProfileValidator, adminController.updateProfile);
router.patch('/profile/avatar', upload.single('avatar'), adminController.uploadAvatar);
router.patch('/change-password', changePasswordValidator, adminController.changePassword);
router.delete('/me', deleteAccountValidator, adminController.deleteAccount);

export default router;
