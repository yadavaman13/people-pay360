import { db } from '../config/database.config.js';
import { bankAccounts } from '../db/schema/bank_accounts.schema.js';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Bank Account DAO
 */

/**
 * Find all active bank accounts for an employee
 * @param {string} employeeId
 */
export async function findBankAccountsByEmployeeId(employeeId) {
    return db
        .select()
        .from(bankAccounts)
        .where(and(eq(bankAccounts.employeeId, employeeId), eq(bankAccounts.isActive, true)))
        .orderBy(desc(bankAccounts.isPrimary), desc(bankAccounts.createdAt));
}

/**
 * Find single bank account by ID
 * @param {string} id
 */
export async function findBankAccountById(id) {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
    return account || null;
}

/**
 * Create a new bank account for an employee
 * If marked primary or if it's the first account, ensure atomic primary exclusivity
 * @param {object} data
 */
export async function createBankAccount(data) {
    return db.transaction(async (tx) => {
        // If this new account is marked primary, demote any existing primary accounts
        if (data.isPrimary) {
            await tx
                .update(bankAccounts)
                .set({ isPrimary: false, updatedAt: new Date() })
                .where(
                    and(
                        eq(bankAccounts.employeeId, data.employeeId),
                        eq(bankAccounts.isPrimary, true),
                    ),
                );
        }

        const [created] = await tx.insert(bankAccounts).values(data).returning();
        return created;
    });
}

/**
 * Atomically set an account as the single primary active bank account for an employee
 * @param {string} employeeId
 * @param {string} accountId
 */
export async function setPrimaryBankAccount(employeeId, accountId) {
    return db.transaction(async (tx) => {
        // Demote all
        await tx
            .update(bankAccounts)
            .set({ isPrimary: false, updatedAt: new Date() })
            .where(and(eq(bankAccounts.employeeId, employeeId), eq(bankAccounts.isPrimary, true)));

        // Promote target
        const [updated] = await tx
            .update(bankAccounts)
            .set({ isPrimary: true, updatedAt: new Date() })
            .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.employeeId, employeeId)))
            .returning();

        return updated || null;
    });
}

/**
 * Soft-delete bank account
 * @param {string} employeeId
 * @param {string} accountId
 */
export async function deleteBankAccount(employeeId, accountId) {
    const [deleted] = await db
        .update(bankAccounts)
        .set({ isActive: false, isPrimary: false, updatedAt: new Date() })
        .where(and(eq(bankAccounts.id, accountId), eq(bankAccounts.employeeId, employeeId)))
        .returning();
    return deleted || null;
}
