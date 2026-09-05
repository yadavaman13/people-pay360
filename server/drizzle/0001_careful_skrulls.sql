CREATE TYPE "public"."allocation_status" AS ENUM('PENDING', 'APPROVED', 'REFUSED');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('PRESENT', 'LATE', 'ABSENT', 'HALF_DAY', 'MANUAL_CORRECTION');--> statement-breakpoint
CREATE TYPE "public"."bank_account_type" AS ENUM('SAVINGS', 'CURRENT', 'SALARY');--> statement-breakpoint
CREATE TYPE "public"."computation_type" AS ENUM('FIXED', 'PERCENTAGE', 'FORMULA');--> statement-breakpoint
CREATE TYPE "public"."contract_status" AS ENUM('DRAFT', 'ACTIVE', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."eligibility_status" AS ENUM('ELIGIBLE', 'INELIGIBLE', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."payrun_status" AS ENUM('DRAFT', 'COMPUTING', 'COMPUTED', 'VALIDATED', 'PAID', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."payslip_status" AS ENUM('DRAFT', 'COMPUTED', 'VALIDATED', 'PAID', 'SENT');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('PENDING', 'APPROVED', 'REFUSED');--> statement-breakpoint
CREATE TYPE "public"."rule_category" AS ENUM('BASIC', 'ALLOWANCE', 'GROSS', 'DEDUCTION', 'NET', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."selection_status" AS ENUM('SELECTED', 'EXCLUDED');--> statement-breakpoint
CREATE TYPE "public"."role_enum" AS ENUM('EMPLOYEE', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"description" text,
	"parent_id" uuid,
	"manager_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "job_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"code" text,
	"department_id" uuid,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "schedule_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"break_minutes" smallint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_day_of_week_range" CHECK ("schedule_lines"."day_of_week" BETWEEN 0 AND 6),
	CONSTRAINT "chk_schedule_time_order" CHECK ("schedule_lines"."start_time" < "schedule_lines"."end_time"),
	CONSTRAINT "chk_break_minutes_non_negative" CHECK ("schedule_lines"."break_minutes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "working_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"gender" text,
	"date_of_birth" date,
	"address" text,
	"hire_date" date NOT NULL,
	"termination_date" date,
	"department_id" uuid,
	"job_position_id" uuid,
	"manager_id" uuid,
	"working_schedule_id" uuid,
	"status" "employee_status" DEFAULT 'DRAFT' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code")
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_holder_name" text NOT NULL,
	"ifsc_code" text NOT NULL,
	"account_type" "bank_account_type" DEFAULT 'SAVINGS' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"salary_structure_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"wage" numeric(12, 2) NOT NULL,
	"department_id" uuid,
	"job_position_id" uuid,
	"working_schedule_id" uuid,
	"status" "contract_status" DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_contracts_wage_non_negative" CHECK ("contracts"."wage" >= 0),
	CONSTRAINT "chk_contracts_date_order" CHECK ("contracts"."end_date" IS NULL OR "contracts"."start_date" <= "contracts"."end_date")
);
--> statement-breakpoint
CREATE TABLE "attendance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"attendance_date" date NOT NULL,
	"check_in_time" timestamp with time zone,
	"check_out_time" timestamp with time zone,
	"worked_hours" numeric(5, 2),
	"status" "attendance_status" DEFAULT 'ABSENT' NOT NULL,
	"is_manually_corrected" boolean DEFAULT false NOT NULL,
	"corrected_by" uuid,
	"correction_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_attendance_time_order" CHECK ("attendance_records"."check_out_time" IS NULL OR "attendance_records"."check_in_time" < "attendance_records"."check_out_time"),
	CONSTRAINT "chk_attendance_worked_hours_non_negative" CHECK ("attendance_records"."worked_hours" IS NULL OR "attendance_records"."worked_hours" >= 0)
);
--> statement-breakpoint
CREATE TABLE "time_off_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"total_days" numeric(6, 2) NOT NULL,
	"used_days" numeric(6, 2) DEFAULT '0.00' NOT NULL,
	"validity_start" date NOT NULL,
	"validity_end" date,
	"status" "allocation_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_allocations_total_days_non_negative" CHECK ("time_off_allocations"."total_days" >= 0),
	CONSTRAINT "chk_allocations_used_days_non_negative" CHECK ("time_off_allocations"."used_days" >= 0),
	CONSTRAINT "chk_allocations_used_lte_total" CHECK ("time_off_allocations"."used_days" <= "time_off_allocations"."total_days"),
	CONSTRAINT "chk_allocations_validity_order" CHECK ("time_off_allocations"."validity_end" IS NULL OR "time_off_allocations"."validity_start" <= "time_off_allocations"."validity_end")
);
--> statement-breakpoint
CREATE TABLE "time_off_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"type_id" uuid NOT NULL,
	"allocation_id" uuid,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"number_of_days" numeric(6, 2) NOT NULL,
	"reason" text,
	"status" "request_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_time_off_requests_date_order" CHECK ("time_off_requests"."start_date" <= "time_off_requests"."end_date"),
	CONSTRAINT "chk_time_off_requests_days_positive" CHECK ("time_off_requests"."number_of_days" > 0)
);
--> statement-breakpoint
CREATE TABLE "time_off_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"allocation_required" boolean DEFAULT true NOT NULL,
	"request_approval_required" boolean DEFAULT true NOT NULL,
	"paid_time_off" boolean DEFAULT true NOT NULL,
	"max_days_per_request" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_off_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "salary_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"structure_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" "rule_category" NOT NULL,
	"sequence_order" integer NOT NULL,
	"computation_type" "computation_type" NOT NULL,
	"fixed_amount" numeric(12, 2),
	"percentage_base_code" text,
	"percentage_rate" numeric(7, 4),
	"formula_expression" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_rules_sequence_positive" CHECK ("salary_rules"."sequence_order" > 0),
	CONSTRAINT "chk_rules_fixed_amount_non_negative" CHECK ("salary_rules"."fixed_amount" IS NULL OR "salary_rules"."fixed_amount" >= 0),
	CONSTRAINT "chk_rules_percentage_rate_non_negative" CHECK ("salary_rules"."percentage_rate" IS NULL OR "salary_rules"."percentage_rate" >= 0)
);
--> statement-breakpoint
CREATE TABLE "salary_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salary_structures_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payrun_employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payrun_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"contract_id" uuid,
	"eligibility_status" "eligibility_status" DEFAULT 'ELIGIBLE' NOT NULL,
	"selection_status" "selection_status" DEFAULT 'SELECTED' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payruns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"structure_id" uuid NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"payment_date" date,
	"status" "payrun_status" DEFAULT 'DRAFT' NOT NULL,
	"total_employees" integer DEFAULT 0 NOT NULL,
	"total_gross" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_deductions" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"total_net" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"computed_at" timestamp with time zone,
	"validated_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_by" uuid,
	"validated_by" uuid,
	"paid_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payruns_period_order" CHECK ("payruns"."period_start" <= "payruns"."period_end"),
	CONSTRAINT "chk_payruns_total_gross_non_negative" CHECK ("payruns"."total_gross" >= 0),
	CONSTRAINT "chk_payruns_total_deductions_non_negative" CHECK ("payruns"."total_deductions" >= 0),
	CONSTRAINT "chk_payruns_total_net_non_negative" CHECK ("payruns"."total_net" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payslip_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payslip_id" uuid NOT NULL,
	"salary_rule_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"category" "rule_category" NOT NULL,
	"sequence_order" integer NOT NULL,
	"computation_type" "computation_type" NOT NULL,
	"fixed_amount" numeric(12, 2),
	"percentage_base_code" text,
	"percentage_rate" numeric(7, 4),
	"formula_expression" text,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payrun_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"contract_id" uuid,
	"structure_id" uuid,
	"contract_wage_snapshot" numeric(12, 2),
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"worked_days" numeric(6, 2),
	"gross_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"deduction_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"net_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"status" "payslip_status" DEFAULT 'DRAFT' NOT NULL,
	"pdf_url" text,
	"email_sent_at" timestamp with time zone,
	"computed_at" timestamp with time zone,
	"validated_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_payslips_gross_non_negative" CHECK ("payslips"."gross_amount" >= 0),
	CONSTRAINT "chk_payslips_deduction_non_negative" CHECK ("payslips"."deduction_amount" >= 0),
	CONSTRAINT "chk_payslips_net_non_negative" CHECK ("payslips"."net_amount" >= 0),
	CONSTRAINT "chk_payslips_period_order" CHECK ("payslips"."period_start" <= "payslips"."period_end")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'EMPLOYEE';--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_lines" ADD CONSTRAINT "schedule_lines_schedule_id_working_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_working_schedule_id_working_schedules_id_fk" FOREIGN KEY ("working_schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_salary_structure_id_salary_structures_id_fk" FOREIGN KEY ("salary_structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_working_schedule_id_working_schedules_id_fk" FOREIGN KEY ("working_schedule_id") REFERENCES "public"."working_schedules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_corrected_by_users_id_fk" FOREIGN KEY ("corrected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_type_id_time_off_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."time_off_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_allocations" ADD CONSTRAINT "time_off_allocations_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_type_id_time_off_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."time_off_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_allocation_id_time_off_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "public"."time_off_allocations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_off_requests" ADD CONSTRAINT "time_off_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_rules" ADD CONSTRAINT "salary_rules_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payrun_employees" ADD CONSTRAINT "payrun_employees_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_validated_by_users_id_fk" FOREIGN KEY ("validated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payruns" ADD CONSTRAINT "payruns_paid_by_users_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_payslip_id_payslips_id_fk" FOREIGN KEY ("payslip_id") REFERENCES "public"."payslips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslip_lines" ADD CONSTRAINT "payslip_lines_salary_rule_id_salary_rules_id_fk" FOREIGN KEY ("salary_rule_id") REFERENCES "public"."salary_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrun_id_payruns_id_fk" FOREIGN KEY ("payrun_id") REFERENCES "public"."payruns"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_structure_id_salary_structures_id_fk" FOREIGN KEY ("structure_id") REFERENCES "public"."salary_structures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "departments_name_idx" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE INDEX "departments_is_active_idx" ON "departments" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "departments_parent_id_idx" ON "departments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "job_positions_title_idx" ON "job_positions" USING btree ("title");--> statement-breakpoint
CREATE INDEX "job_positions_dept_id_idx" ON "job_positions" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "job_positions_is_active_idx" ON "job_positions" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "schedule_lines_sched_day_idx" ON "schedule_lines" USING btree ("schedule_id","day_of_week");--> statement-breakpoint
CREATE INDEX "schedule_lines_schedule_id_idx" ON "schedule_lines" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "working_schedules_name_idx" ON "working_schedules" USING btree ("name");--> statement-breakpoint
CREATE INDEX "working_schedules_is_active_idx" ON "working_schedules" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "employees_user_id_idx" ON "employees" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "employees_dept_status_idx" ON "employees" USING btree ("department_id","status");--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employees_is_active_idx" ON "employees" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "employees_manager_id_idx" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "bank_accounts_employee_id_idx" ON "bank_accounts" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_accounts_emp_account_unique_idx" ON "bank_accounts" USING btree ("employee_id","account_number");--> statement-breakpoint
CREATE UNIQUE INDEX "bank_accounts_one_primary_active_idx" ON "bank_accounts" USING btree ("employee_id") WHERE "bank_accounts"."is_primary" = TRUE AND "bank_accounts"."is_active" = TRUE;--> statement-breakpoint
CREATE INDEX "contracts_emp_status_idx" ON "contracts" USING btree ("employee_id","status");--> statement-breakpoint
CREATE INDEX "contracts_dates_idx" ON "contracts" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "contracts_structure_id_idx" ON "contracts" USING btree ("salary_structure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_emp_date_unique_idx" ON "attendance_records" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_emp_date_idx" ON "attendance_records" USING btree ("employee_id","attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance_records" USING btree ("attendance_date");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_off_allocations_emp_type_status_idx" ON "time_off_allocations" USING btree ("employee_id","type_id","status");--> statement-breakpoint
CREATE INDEX "time_off_allocations_employee_id_idx" ON "time_off_allocations" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "time_off_allocations_type_id_idx" ON "time_off_allocations" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "time_off_allocations_status_idx" ON "time_off_allocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_off_allocations_validity_idx" ON "time_off_allocations" USING btree ("validity_start","validity_end");--> statement-breakpoint
CREATE INDEX "time_off_requests_emp_status_idx" ON "time_off_requests" USING btree ("employee_id","status");--> statement-breakpoint
CREATE INDEX "time_off_requests_employee_id_idx" ON "time_off_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "time_off_requests_type_id_idx" ON "time_off_requests" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "time_off_requests_allocation_id_idx" ON "time_off_requests" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX "time_off_requests_dates_idx" ON "time_off_requests" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE INDEX "time_off_requests_status_idx" ON "time_off_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "time_off_types_name_idx" ON "time_off_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "time_off_types_code_idx" ON "time_off_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "time_off_types_is_active_idx" ON "time_off_types" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_rules_struct_seq_unique_idx" ON "salary_rules" USING btree ("structure_id","sequence_order");--> statement-breakpoint
CREATE UNIQUE INDEX "salary_rules_struct_code_unique_idx" ON "salary_rules" USING btree ("structure_id","code");--> statement-breakpoint
CREATE INDEX "salary_rules_structure_id_idx" ON "salary_rules" USING btree ("structure_id");--> statement-breakpoint
CREATE INDEX "salary_rules_category_idx" ON "salary_rules" USING btree ("category");--> statement-breakpoint
CREATE INDEX "salary_rules_is_active_idx" ON "salary_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "salary_structures_name_idx" ON "salary_structures" USING btree ("name");--> statement-breakpoint
CREATE INDEX "salary_structures_code_idx" ON "salary_structures" USING btree ("code");--> statement-breakpoint
CREATE INDEX "salary_structures_is_active_idx" ON "salary_structures" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "payrun_employees_unique_idx" ON "payrun_employees" USING btree ("payrun_id","employee_id");--> statement-breakpoint
CREATE INDEX "payrun_employees_payrun_id_idx" ON "payrun_employees" USING btree ("payrun_id");--> statement-breakpoint
CREATE INDEX "payrun_employees_employee_id_idx" ON "payrun_employees" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "payrun_employees_contract_id_idx" ON "payrun_employees" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "payruns_status_idx" ON "payruns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payruns_period_idx" ON "payruns" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE INDEX "payruns_structure_id_idx" ON "payruns" USING btree ("structure_id");--> statement-breakpoint
CREATE INDEX "payruns_created_by_idx" ON "payruns" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "payslip_lines_payslip_id_idx" ON "payslip_lines" USING btree ("payslip_id");--> statement-breakpoint
CREATE INDEX "payslip_lines_salary_rule_id_idx" ON "payslip_lines" USING btree ("salary_rule_id");--> statement-breakpoint
CREATE INDEX "payslip_lines_code_idx" ON "payslip_lines" USING btree ("code");--> statement-breakpoint
CREATE INDEX "payslip_lines_category_idx" ON "payslip_lines" USING btree ("category");--> statement-breakpoint
CREATE INDEX "payslip_lines_payslip_seq_idx" ON "payslip_lines" USING btree ("payslip_id","sequence_order");--> statement-breakpoint
CREATE UNIQUE INDEX "payslips_payrun_emp_unique_idx" ON "payslips" USING btree ("payrun_id","employee_id");--> statement-breakpoint
CREATE INDEX "payslips_payrun_id_idx" ON "payslips" USING btree ("payrun_id");--> statement-breakpoint
CREATE INDEX "payslips_emp_status_idx" ON "payslips" USING btree ("employee_id","status");--> statement-breakpoint
CREATE INDEX "payslips_contract_id_idx" ON "payslips" USING btree ("contract_id");--> statement-breakpoint
CREATE INDEX "payslips_period_idx" ON "payslips" USING btree ("period_start","period_end");