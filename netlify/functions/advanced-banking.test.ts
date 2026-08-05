import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('../logger.ts', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

jest.mock('../auth.ts', () => ({
    authenticateUser: jest.fn(),
    authorizeUser: jest.fn()
}));

jest.mock('../policy-compliance.ts', () => ({
    runComplianceChecks: jest.fn()
}));

// Import the banking module after mocking
import { handler } from '../advanced-banking.ts';

describe('Advanced Banking System', () => {
    let mockEvent: any;
    let mockContext: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext = {};

        // Mock successful authentication and authorization
        const mockAuth = require('../auth.ts');
        mockAuth.authenticateUser.mockResolvedValue({ userId: 'test-user-123' });
        mockAuth.authorizeUser.mockResolvedValue(true);

        // Mock successful compliance checks
        const mockPolicy = require('../policy-compliance.ts');
        mockPolicy.runComplianceChecks.mockResolvedValue({
            passed: true,
            checks: ['rate_limit', 'auth', 'data_privacy']
        });
    });

    describe('Account Creation', () => {
        it('should create a new bank account successfully', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountType: 'checking',
                    currency: 'USD'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(201);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('accountId');
            expect(response.data.accountType).toBe('checking');
            expect(response.data.currency).toBe('USD');
        });

        it('should reject account creation with invalid currency', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountType: 'checking',
                    currency: 'INVALID'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Invalid currency');
        });
    });

    describe('P2P Transfers', () => {
        it('should initiate P2P transfer successfully', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/transfer',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    fromAccountId: 'SI-ACCT-001',
                    toAccountId: 'SI-ACCT-002',
                    amount: 100.00,
                    description: 'Test transfer'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('transactionId');
            expect(response.data.status).toBe('pending');
        });

        it('should reject transfer with insufficient funds', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/transfer',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    fromAccountId: 'SI-ACCT-001',
                    toAccountId: 'SI-ACCT-002',
                    amount: 1000000.00, // Very large amount
                    description: 'Test transfer'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Insufficient funds');
        });

        it('should reject transfer to non-existent account', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/transfer',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    fromAccountId: 'SI-ACCT-001',
                    toAccountId: 'NON-EXISTENT',
                    amount: 100.00,
                    description: 'Test transfer'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(404);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Recipient account not found');
        });
    });

    describe('Deposit/Withdrawal Requests', () => {
        it('should create deposit request successfully', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/deposit-withdrawal',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountId: 'SI-ACCT-001',
                    type: 'deposit',
                    amount: 500.00,
                    currency: 'USD',
                    method: 'bank_transfer',
                    externalAccount: {
                        bankName: 'Test Bank',
                        accountNumber: '1234567890'
                    }
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(201);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('requestId');
            expect(response.data.status).toBe('pending_verification');
        });

        it('should create withdrawal request successfully', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/deposit-withdrawal',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountId: 'SI-ACCT-001',
                    type: 'withdrawal',
                    amount: 200.00,
                    currency: 'USD',
                    method: 'bank_transfer',
                    externalAccount: {
                        bankName: 'Test Bank',
                        accountNumber: '1234567890'
                    }
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(201);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('requestId');
            expect(response.data.status).toBe('pending_verification');
        });

        it('should reject deposit below minimum amount', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/deposit-withdrawal',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountId: 'SI-ACCT-001',
                    type: 'deposit',
                    amount: 10.00, // Below minimum
                    currency: 'USD',
                    method: 'bank_transfer'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Minimum deposit amount');
        });
    });

    describe('Account Summary', () => {
        it('should return account summary successfully', async () => {
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/summary/SI-ACCT-001',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('currentBalance');
            expect(response.data).toHaveProperty('availableBalance');
            expect(response.data).toHaveProperty('accountHealth');
        });

        it('should return 404 for non-existent account', async () => {
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/summary/NON-EXISTENT',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(404);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Account not found');
        });
    });

    describe('Transaction History', () => {
        it('should return transaction history successfully', async () => {
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/transactions',
                headers: { 'x-user-id': 'test-user-123' },
                queryStringParameters: {
                    accountId: 'SI-ACCT-001',
                    limit: '10'
                }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should filter transactions by date range', async () => {
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/transactions',
                headers: { 'x-user-id': 'test-user-123' },
                queryStringParameters: {
                    accountId: 'SI-ACCT-001',
                    startDate: '2024-01-01',
                    endDate: '2024-12-31'
                }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });
    });

    describe('User Verification', () => {
        it('should return user verification status', async () => {
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/verification',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('verificationLevel');
            expect(response.data).toHaveProperty('emailVerified');
        });

        it('should update verification documents', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/verification/upload',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    documentType: 'id_card',
                    documentData: 'base64-encoded-image-data'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(response.data).toHaveProperty('uploadId');
        });
    });

    describe('Banking Workflows', () => {
        it('should return user banking workflows', async () => {
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/workflows',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
            expect(Array.isArray(response.data)).toBe(true);
        });

        it('should update workflow status', async () => {
            mockEvent = {
                httpMethod: 'PUT',
                path: '/.netlify/functions/advanced-banking/banking/workflows/WF-001',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    status: 'completed',
                    notes: 'All verification documents uploaded'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(200);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(true);
        });
    });

    describe('Security & Compliance', () => {
        it('should enforce rate limiting', async () => {
            // Mock rate limit failure
            const mockPolicy = require('../policy-compliance.ts');
            mockPolicy.runComplianceChecks.mockResolvedValue({
                passed: false,
                checks: ['rate_limit'],
                violations: ['Rate limit exceeded']
            });

            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(429);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Rate limit exceeded');
        });

        it('should require authentication', async () => {
            // Mock authentication failure
            const mockAuth = require('../auth.ts');
            mockAuth.authenticateUser.mockRejectedValue(new Error('Invalid token'));

            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(401);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Authentication failed');
        });

        it('should enforce data privacy', async () => {
            // Mock privacy violation
            const mockPolicy = require('../policy-compliance.ts');
            mockPolicy.runComplianceChecks.mockResolvedValue({
                passed: false,
                checks: ['data_privacy'],
                violations: ['Data privacy violation detected']
            });

            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(403);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Data privacy violation');
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid JSON gracefully', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'content-type': 'application/json' },
                body: 'invalid json'
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Invalid JSON');
        });

        it('should handle missing required fields', async () => {
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    // Missing required fields
                    currency: 'USD'
                })
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(400);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Missing required fields');
        });

        it('should handle unsupported HTTP methods', async () => {
            mockEvent = {
                httpMethod: 'PATCH',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'x-user-id': 'test-user-123' }
            };

            const result = await handler(mockEvent, mockContext);

            expect(result.statusCode).toBe(405);
            const response = JSON.parse(result.body);
            expect(response.success).toBe(false);
            expect(response.error).toContain('Method not allowed');
        });
    });

    describe('Integration Tests', () => {
        it('should handle complete user onboarding flow', async () => {
            // 1. Create account
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/accounts',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountType: 'checking',
                    currency: 'USD'
                })
            };

            let result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(201);
            const accountData = JSON.parse(result.body).data;

            // 2. Check verification status
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/verification',
                headers: { 'x-user-id': 'test-user-123' }
            };

            result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(200);

            // 3. Make a deposit
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/deposit-withdrawal',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'test-user-123',
                    accountId: accountData.accountId,
                    type: 'deposit',
                    amount: 1000.00,
                    currency: 'USD',
                    method: 'bank_transfer',
                    externalAccount: {
                        bankName: 'Test Bank',
                        accountNumber: '1234567890'
                    }
                })
            };

            result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(201);

            // 4. Check account summary
            mockEvent = {
                httpMethod: 'GET',
                path: `/.netlify/functions/advanced-banking/banking/summary/${accountData.accountId}`,
                headers: { 'x-user-id': 'test-user-123' }
            };

            result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(200);
        });

        it('should handle P2P transfer flow', async () => {
            // Create two accounts first
            const createAccount = async (userId: string, accountType: string) => {
                mockEvent = {
                    httpMethod: 'POST',
                    path: '/.netlify/functions/advanced-banking/banking/accounts',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        accountType,
                        currency: 'USD'
                    })
                };
                const result = await handler(mockEvent, mockContext);
                return JSON.parse(result.body).data;
            };

            const account1 = await createAccount('user-1', 'checking');
            const account2 = await createAccount('user-2', 'checking');

            // Make deposit to first account
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/deposit-withdrawal',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'user-1',
                    accountId: account1.accountId,
                    type: 'deposit',
                    amount: 500.00,
                    currency: 'USD',
                    method: 'bank_transfer',
                    externalAccount: {
                        bankName: 'Test Bank',
                        accountNumber: '1234567890'
                    }
                })
            };

            let result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(201);

            // Perform P2P transfer
            mockEvent = {
                httpMethod: 'POST',
                path: '/.netlify/functions/advanced-banking/banking/transfer',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    userId: 'user-1',
                    fromAccountId: account1.accountId,
                    toAccountId: account2.accountId,
                    amount: 100.00,
                    description: 'Test P2P transfer'
                })
            };

            result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(200);
            const transferData = JSON.parse(result.body).data;

            // Check transaction history
            mockEvent = {
                httpMethod: 'GET',
                path: '/.netlify/functions/advanced-banking/banking/transactions',
                headers: { 'x-user-id': 'user-1' },
                queryStringParameters: {
                    accountId: account1.accountId,
                    limit: '5'
                }
            };

            result = await handler(mockEvent, mockContext);
            expect(result.statusCode).toBe(200);
            const transactions = JSON.parse(result.body).data;
            expect(transactions.some((tx: any) => tx.transactionId === transferData.transactionId)).toBe(true);
        });
    });
});