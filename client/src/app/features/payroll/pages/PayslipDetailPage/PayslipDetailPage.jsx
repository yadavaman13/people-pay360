import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { usePayslipDetail } from '../../hooks/usePayslipDetail';
import PayslipActionBar from '../../components/PayslipActionBar/PayslipActionBar';
import PayslipSummaryGrid from '../../components/PayslipSummaryGrid/PayslipSummaryGrid';
import SalaryComputationTable from '../../components/SalaryComputationTable/SalaryComputationTable';
import Breadcrumbs from '@/components/Shared/Navigation/Breadcrumbs/Breadcrumbs';
import Spinner from '@/components/Shared/Feedback/Spinner/Spinner';
import Button from '@/components/Shared/Buttons/Button/Button';
import { Alert, AlertTitle, AlertDescription } from '@/components/Shared/Feedback/Alert/Alert';
import './PayslipDetailPage.scss';

function PayslipDetailPage() {
    const { id: payslipId } = useParams();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Determine current role segment for navigation
    const roleSegment = pathname.includes('/admin/') ? 'admin' : 'user';

    const {
        payslip,
        breakdown,
        isLoading,
        isComputing,
        isPrinting,
        error,
        handleRecompute,
        handlePrint,
        reloadPayslip,
    } = usePayslipDetail(payslipId);

    const handleBackToList = () => {
        navigate(`/dashboard/${roleSegment}/payroll/payslips`);
    };

    if (isLoading && !payslip) {
        return (
            <div className="payslip-detail-page__loading">
                <Spinner label="Loading payslip computation..." size="lg" />
            </div>
        );
    }

    if (error && !payslip) {
        return (
            <div className="payslip-detail-page payslip-detail-page--error">
                <Alert variant="danger">
                    <AlertTitle>Unable to load payslip</AlertTitle>
                    <AlertDescription>
                        {error}
                        <div className="payslip-detail-page__retry-action">
                            <Button variant="outline" onClick={reloadPayslip} size="sm">
                                Retry
                            </Button>
                            <Button variant="ghost" onClick={handleBackToList} size="sm">
                                Back to Payslips
                            </Button>
                        </div>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const employeeName =
        `${payslip?.firstName || ''} ${payslip?.lastName || ''}`.trim() || 'Employee';
    const periodMonth =
        payslip?.payrunName ||
        (payslip?.periodStart
            ? new Date(payslip.periodStart).toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
              })
            : 'Period');

    const titleText = `Payslip / ${employeeName} / ${periodMonth}`;

    const breadcrumbItems = [
        { label: 'Payroll', path: `/dashboard/${roleSegment}/payroll/payruns` },
        { label: 'Payslips', path: `/dashboard/${roleSegment}/payroll/payslips` },
        { label: titleText },
    ];

    return (
        <div className="payslip-detail-page">
            {/* Top Hierarchical Breadcrumb Navigation */}
            <div className="payslip-detail-page__breadcrumb-wrapper">
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            {/* Header with Title/Subtitle on Left & Actions aligned horizontally in a line on the Right */}
            <header className="payslip-detail-page__header">
                <div className="payslip-detail-page__header-info">
                    <div className="payslip-detail-page__back-nav">
                        <button
                            type="button"
                            className="payslip-detail-page__back-btn"
                            onClick={handleBackToList}
                        >
                            <ArrowLeft size={16} />
                            <span>Back to Payslips</span>
                        </button>
                    </div>
                    <h1 className="payslip-detail-page__title">{titleText}</h1>
                    <p className="payslip-detail-page__subtitle">
                        Detailed salary computation for one employee
                    </p>
                </div>

                <div className="payslip-detail-page__header-actions">
                    <PayslipActionBar
                        status={payslip?.status}
                        payrunStatus={payslip?.payrunStatus}
                        payrunId={payslip?.payrunId}
                        payrunName={payslip?.payrunName}
                        onCompute={handleRecompute}
                        onPrintPdf={handlePrint}
                        isComputing={isComputing}
                        isPrinting={isPrinting}
                    />
                </div>
            </header>

            {/* Metadata Summary Container (2-col desktop, 1-col mobile) */}
            <div className="payslip-detail-page__summary">
                <PayslipSummaryGrid payslip={payslip} />
            </div>

            {/* Salary Computation Table */}
            <SalaryComputationTable
                lines={payslip?.lines || []}
                breakdown={breakdown}
                grossAmount={payslip?.grossAmount}
                deductionAmount={payslip?.deductionAmount}
                netAmount={payslip?.netAmount}
                isLoading={isComputing}
            />
        </div>
    );
}

export default PayslipDetailPage;
