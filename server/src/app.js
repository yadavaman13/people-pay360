import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import envConfig from './config/env.config.js';
import { authRouter, userRouter, adminRouter } from './modules/auth/index.js';
import { pdfRouter } from './modules/pdf/index.js';
import { payrollValidationRouter } from './modules/validation/index.js';
import { payslipDocumentRouter } from './modules/payslips/index.js';
import { errorHandler } from './modules/auth/middleware/errorHandler.js';

import { scheduleRouter } from './modules/schedules/index.js';
import { attendanceRouter } from './modules/attendance/index.js';
import { timeOffRouter } from './modules/time-off/index.js';

import { salaryStructureRouter } from './modules/salary-structures/index.js';
import { salaryRuleRouter } from './modules/salary-rules/index.js';
import { payrunRouter } from './modules/payruns/index.js';
import { payslipRouter } from './modules/payslips/index.js';

const app = express();

const publicPath = path.join(import.meta.dirname, 'public');

app.use(express.static(publicPath));
app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: envConfig.CLIENT_ORIGINS,
        credentials: true,
    }),
);
app.use(morgan('combined'));

//api mountings
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);

app.use('/api/pdf', pdfRouter);

app.use('/api/working-schedules', scheduleRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/time-off', timeOffRouter);

app.use('/api/salary-structures', salaryStructureRouter);
app.use('/api/salary-rules', salaryRuleRouter);
app.use('/api/payruns', payrunRouter);
app.use('/api/payslips', payslipRouter);
app.use('/api/payruns', payrollValidationRouter);
app.use('/api/payslips', payslipDocumentRouter);

//For SPA
app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
    }
    const indexPath = path.join(publicPath, 'index.html');
    res.sendFile(indexPath, (err) => {
        if (err) {
            next();
        }
    });
});

app.use(errorHandler);

export default app;
