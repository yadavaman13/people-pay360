import { Router } from 'express';
import { protect, restrictTo } from '../../auth/middleware/auth.middleware.js';
import * as timeOffRequestController from '../controllers/timeOffRequest.controller.js';
import {
    createRequestValidator,
    updateRequestValidator,
    requestIdParamValidator,
    approveRequestValidator,
    refuseRequestValidator,
    listRequestsValidator,
} from '../validators/timeOffRequest.validator.js';

const router = Router();

router.use(protect);

router
    .route('/')
    .get(listRequestsValidator, timeOffRequestController.getAllRequests)
    .post(createRequestValidator, timeOffRequestController.createRequest);

router
    .route('/:id/approve')
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        approveRequestValidator,
        timeOffRequestController.approveRequest,
    );

router
    .route('/:id/refuse')
    .post(
        restrictTo('HR_MANAGER', 'HR_PAYROLL_MANAGER', 'ADMIN'),
        refuseRequestValidator,
        timeOffRequestController.refuseRequest,
    );

router.route('/:id/cancel').post(requestIdParamValidator, timeOffRequestController.cancelRequest);

router
    .route('/:id')
    .get(requestIdParamValidator, timeOffRequestController.getRequestById)
    .patch(updateRequestValidator, timeOffRequestController.updateRequest)
    .delete(requestIdParamValidator, timeOffRequestController.deleteRequest);

export default router;
