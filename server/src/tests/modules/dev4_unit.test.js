import { payslipTemplate } from '../../templates/index.js';
import { makePDF } from '../../services/pdf/index.pdf.service.js';
import request from 'supertest';
import app from '../../app.js';

describe('Dev 4: Payroll Validation, Live Dashboard & Payslip Delivery', () => {
    describe('Payslip PDF Template & Engine', () => {
        const mockPayslip = {
            id: '123e4567-e89b-12d3-a456-426614174000',
            employeeCode: 'EMP-101',
            firstName: 'Aarav',
            lastName: 'Sharma',
            email: 'aarav.sharma@example.com',
            departmentName: 'Engineering',
            jobTitle: 'Senior Software Engineer',
            hireDate: '2023-01-15',
            payrunName: 'September 2026 Regular Payrun',
            periodStart: '2026-09-01',
            periodEnd: '2026-09-30',
            payrunPaymentDate: '2026-10-01',
            workedDays: '30.00',
            bankName: 'HDFC Bank',
            accountNumber: '50100234567890',
            ifscCode: 'HDFC0001234',
            structureName: 'Regular Full-Time Structure',
            grossAmount: '85000.00',
            deductionAmount: '12500.00',
            netAmount: '72500.00',
            lines: [
                {
                    code: 'BASIC',
                    name: 'Basic Salary',
                    category: 'BASIC',
                    amount: '42500.00',
                },
                {
                    code: 'HRA',
                    name: 'House Rent Allowance',
                    category: 'ALLOWANCE',
                    amount: '25500.00',
                },
                {
                    code: 'SPECIAL',
                    name: 'Special Allowance',
                    category: 'ALLOWANCE',
                    amount: '17000.00',
                },
                {
                    code: 'PF_EMP',
                    name: 'Provident Fund (Employee)',
                    category: 'DEDUCTION',
                    amount: '5100.00',
                },
                {
                    code: 'TDS',
                    name: 'Tax Deducted at Source',
                    category: 'DEDUCTION',
                    amount: '7400.00',
                },
            ],
        };

        it('should render complete HTML with company header, employee details, lines and net pay banner', () => {
            const html = payslipTemplate(mockPayslip);

            expect(html).toContain('PeoplePay360');
            expect(html).toContain('EMP-101');
            expect(html).toContain('Aarav Sharma');
            expect(html).toContain('Engineering');
            expect(html).toContain('Senior Software Engineer');
            expect(html).toContain('Basic Salary');
            expect(html).toContain('House Rent Allowance');
            expect(html).toContain('Provident Fund (Employee)');
            expect(html).toContain('72,500.00');
            expect(html).toContain('Rupees Only');
            expect(html).toContain('•••• 7890'); // Masked account
        });

        it('should generate a valid binary PDF buffer from the payslip HTML using Chromium-free makePDF', async () => {
            const html = payslipTemplate(mockPayslip);
            const pdfBuffer = await makePDF({ html });

            expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
            expect(pdfBuffer.length).toBeGreaterThan(1000);
            // PDF Magic Header %PDF
            expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');
        });
    });

    describe('Express Route Registration & Auth Guard Audit for Dev 4', () => {
        it('should route /api/payruns/:id/warnings through auth middleware (401 without token)', async () => {
            const res = await request(app).get(
                '/api/payruns/123e4567-e89b-12d3-a456-426614174000/warnings',
            );
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should route /api/payruns/:id/validate through auth middleware (401 without token)', async () => {
            const res = await request(app).post(
                '/api/payruns/123e4567-e89b-12d3-a456-426614174000/validate',
            );
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should route /api/payruns/:id/send-payslips through auth middleware (401 without token)', async () => {
            const res = await request(app).post(
                '/api/payruns/123e4567-e89b-12d3-a456-426614174000/send-payslips',
            );
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should route /api/payslips/:id/pdf through auth middleware (401 without token)', async () => {
            const res = await request(app).get(
                '/api/payslips/123e4567-e89b-12d3-a456-426614174000/pdf',
            );
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });

        it('should route /api/payslips/:id/preview through auth middleware (401 without token)', async () => {
            const res = await request(app).get(
                '/api/payslips/123e4567-e89b-12d3-a456-426614174000/preview',
            );
            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});
