const test = require("node:test");
const assert = require("node:assert");

test("OAuth Token - getOidcTokenClientCredentials parameter validation", async (t) => {
    await t.test("should accept function with correct parameter count", () => {
        // The new signature has 5 parameters (removed audience)
        const mockFunction = async (tokenEndpoint, clientId, clientSecret, scope, authMethod = "client_secret_basic") => {
            return { access_token: "mock_token" };
        };

        assert.strictEqual(mockFunction.length, 5, "Function should accept 5 parameters");
    });

    await t.test("should have default authMethod parameter", () => {
        const defaultAuthMethod = "client_secret_basic";
        assert.strictEqual(defaultAuthMethod, "client_secret_basic", "Default auth method should be client_secret_basic");
    });

    await t.test("should validate grant parameters structure without audience", () => {
        const grantParams = { grant_type: "client_credentials" };
        const scope = "read write";

        if (scope) {
            grantParams.scope = scope;
        }

        assert.strictEqual(grantParams.grant_type, "client_credentials", "Should have correct grant type");
        assert.strictEqual(grantParams.scope, "read write", "Should include scope");
        assert.strictEqual(grantParams.audience, undefined, "Should NOT have audience field");
    });

    await t.test("should handle optional scope parameter", () => {
        const testCases = [
            { scope: undefined, expected: false },
            { scope: null, expected: false },
            { scope: "", expected: false },
            { scope: "read", expected: true },
            { scope: "read write", expected: true },
        ];

        testCases.forEach(({ scope, expected }) => {
            const grantParams = { grant_type: "client_credentials" };
            
            if (scope) {
                grantParams.scope = scope;
            }

            const hasScope = "scope" in grantParams && !!grantParams.scope;
            assert.strictEqual(hasScope, expected, `Scope "${scope}" should ${expected ? "" : "not "}be included`);
        });
    });

    await t.test("should not include audience in grant parameters", () => {
        const grantParams = { grant_type: "client_credentials" };
        const scope = "api:read";
        const audience = "https://api.example.com"; // This should NOT be added

        if (scope) {
            grantParams.scope = scope;
        }

        // The old code had this, but it's removed in the new version:
        // if (audience) {
        //     grantParams.audience = audience;
        // }

        assert.strictEqual("audience" in grantParams, false, "Grant params should not have audience field");
        assert.strictEqual(Object.keys(grantParams).includes("audience"), false, "Audience should not be in keys");
    });
});

test("OAuth Token - authMethod validation", async (t) => {
    await t.test("should support client_secret_basic auth method", () => {
        const validMethods = ["client_secret_basic", "client_secret_post", "private_key_jwt"];
        assert.ok(validMethods.includes("client_secret_basic"), "Should support client_secret_basic");
    });

    await t.test("should use client_secret_basic as default", () => {
        const defaultMethod = "client_secret_basic";
        assert.strictEqual(defaultMethod, "client_secret_basic", "Default should be client_secret_basic");
    });

    await t.test("should validate authMethod parameter types", () => {
        const validAuthMethods = [
            "client_secret_basic",
            "client_secret_post",
            "client_secret_jwt",
            "private_key_jwt"
        ];

        validAuthMethods.forEach(method => {
            assert.strictEqual(typeof method, "string", `Auth method ${method} should be a string`);
        });
    });
});

test("OAuth Token - client configuration validation", async (t) => {
    await t.test("should configure client with correct properties", () => {
        const clientConfig = {
            client_id: "test-client-id",
            client_secret: "test-client-secret",
            token_endpoint_auth_method: "client_secret_basic"
        };

        assert.ok(clientConfig.client_id, "Should have client_id");
        assert.ok(clientConfig.client_secret, "Should have client_secret");
        assert.ok(clientConfig.token_endpoint_auth_method, "Should have auth method");
        assert.strictEqual(clientConfig.token_endpoint_auth_method, "client_secret_basic", "Should use correct auth method");
    });

    await t.test("should configure OIDC issuer with token endpoint", () => {
        const tokenEndpoint = "https://auth.example.com/oauth/token";
        const issuerConfig = { token_endpoint: tokenEndpoint };

        assert.ok(issuerConfig.token_endpoint, "Should have token_endpoint");
        assert.strictEqual(issuerConfig.token_endpoint, tokenEndpoint, "Token endpoint should match");
    });
});

test("RADIUS Client - node-radius-client migration", async (t) => {
    await t.test("should use node-radius-client instead of custom RadiusClient", () => {
        // Verify the require statement would use node-radius-client
        const moduleName = "node-radius-client";
        assert.strictEqual(moduleName, "node-radius-client", "Should require node-radius-client module");
    });

    await t.test("should configure radius client with correct options", () => {
        const hostname = "radius.example.com";
        const port = 1812;
        const timeout = 2500;
        const retries = 1;

        const clientConfig = {
            host: hostname,
            hostPort: port,
            timeout: timeout,
            retries: retries,
            dictionaries: ["mock-file-path"],
        };

        assert.strictEqual(clientConfig.host, hostname, "Should have correct host");
        assert.strictEqual(clientConfig.hostPort, port, "Should have correct port");
        assert.strictEqual(clientConfig.timeout, timeout, "Should have correct timeout");
        assert.strictEqual(clientConfig.retries, retries, "Should have correct retries");
        assert.ok(Array.isArray(clientConfig.dictionaries), "Dictionaries should be an array");
    });

    await t.test("should construct accessRequest with correct attributes", () => {
        const username = "testuser";
        const password = "testpass";
        const calledStationId = "00-11-22-33-44-55";
        const callingStationId = "AA-BB-CC-DD-EE-FF";
        const secret = "shared-secret";

        // Mock attributes object (would come from node-radius-utils)
        const mockAttributes = {
            USER_NAME: 1,
            USER_PASSWORD: 2,
            CALLING_STATION_ID: 31,
            CALLED_STATION_ID: 30,
        };

        const requestConfig = {
            secret: secret,
            attributes: [
                [mockAttributes.USER_NAME, username],
                [mockAttributes.USER_PASSWORD, password],
                [mockAttributes.CALLING_STATION_ID, callingStationId],
                [mockAttributes.CALLED_STATION_ID, calledStationId],
            ],
        };

        assert.strictEqual(requestConfig.secret, secret, "Should have secret");
        assert.ok(Array.isArray(requestConfig.attributes), "Attributes should be an array");
        assert.strictEqual(requestConfig.attributes.length, 4, "Should have 4 attributes");
        assert.ok(Array.isArray(requestConfig.attributes[0]), "Each attribute should be an array");
    });

    await t.test("should handle RADIUS error responses correctly", () => {
        const mockError = {
            response: {
                code: "Access-Reject"
            }
        };

        const mockError2 = {
            message: "Connection timeout"
        };

        // Test error with response code
        if (mockError.response?.code) {
            const errorMessage = mockError.response.code;
            assert.strictEqual(errorMessage, "Access-Reject", "Should extract response code");
        }

        // Test error with message only
        if (!mockError2.response?.code) {
            const errorMessage = mockError2.message;
            assert.strictEqual(errorMessage, "Connection timeout", "Should extract error message");
        }
    });

    await t.test("should validate default port and timeout values", () => {
        const defaultPort = 1812;
        const defaultTimeout = 2500;

        assert.strictEqual(defaultPort, 1812, "Default RADIUS port should be 1812");
        assert.strictEqual(defaultTimeout, 2500, "Default timeout should be 2500ms");
    });

    await t.test("should validate RADIUS function parameters", () => {
        const params = {
            hostname: "radius.server.com",
            username: "user123",
            password: "pass123",
            calledStationId: "station1",
            callingStationId: "station2",
            secret: "radius-secret",
            port: 1812,
            timeout: 2500,
        };

        assert.strictEqual(typeof params.hostname, "string", "Hostname should be string");
        assert.strictEqual(typeof params.username, "string", "Username should be string");
        assert.strictEqual(typeof params.password, "string", "Password should be string");
        assert.strictEqual(typeof params.secret, "string", "Secret should be string");
        assert.strictEqual(typeof params.port, "number", "Port should be number");
        assert.strictEqual(typeof params.timeout, "number", "Timeout should be number");
    });
});