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
import passport from './config/passport.config.js';

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
app.use(passport.initialize());

//dev-1
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/admin', adminRouter);
app.use('/api/pdf', pdfRouter);

//dev-2

//dev-3

//dev-4
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
