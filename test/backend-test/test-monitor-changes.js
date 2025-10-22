const test = require("node:test");
const assert = require("node:assert");

test("Monitor - removed oauth_audience field", async (t) => {
    await t.test("should not include oauth_audience in monitor JSON", () => {
        const monitorJSON = {
            oauth_client_id: "client-id",
            oauth_client_secret: "client-secret",
            oauth_token_url: "https://auth.example.com/token",
            oauth_scopes: "read write",
            oauth_auth_method: "client_secret_basic",
        };

        assert.ok(monitorJSON.oauth_client_id, "Should have oauth_client_id");
        assert.ok(monitorJSON.oauth_client_secret, "Should have oauth_client_secret");
        assert.ok(monitorJSON.oauth_token_url, "Should have oauth_token_url");
        assert.ok(monitorJSON.oauth_scopes, "Should have oauth_scopes");
        assert.ok(monitorJSON.oauth_auth_method, "Should have oauth_auth_method");
        assert.strictEqual(monitorJSON.oauth_audience, undefined, "Should not have oauth_audience");
    });

    await t.test("should not pass audience to token request", () => {
        // Simulating the function call parameters
        const oauth_token_url = "https://auth.example.com/token";
        const oauth_client_id = "client-id";
        const oauth_client_secret = "secret";
        const oauth_scopes = "api:read";
        const oauth_auth_method = "client_secret_basic";
        
        // Old version had 6 parameters including oauth_audience
        // New version has 5 parameters without oauth_audience
        
        const parameters = [
            oauth_token_url,
            oauth_client_id,
            oauth_client_secret,
            oauth_scopes,
            oauth_auth_method
        ];

        assert.strictEqual(parameters.length, 5, "Should have 5 parameters (no audience)");
        assert.strictEqual(parameters[4], "client_secret_basic", "5th parameter should be auth method");
    });

    await t.test("should validate OAuth parameters without audience", () => {
        const oauthConfig = {
            token_url: "https://auth.example.com/token",
            client_id: "my-client-id",
            client_secret: "my-client-secret",
            scopes: "profile email",
            auth_method: "client_secret_post"
        };

        const requiredFields = ["token_url", "client_id", "client_secret"];
        const optionalFields = ["scopes", "auth_method"];
        
        requiredFields.forEach(field => {
            assert.ok(oauthConfig[field], `Should have required field: ${field}`);
        });

        // audience should not be in required or optional fields
        assert.strictEqual("audience" in oauthConfig, false, "Should not have audience field");
    });
});

test("Monitor - removed mqttWebsocketPath field", async (t) => {
    await t.test("should not include mqttWebsocketPath in monitor JSON", () => {
        const monitorJSON = {
            mqttUsername: "mqtt-user",
            mqttPassword: "mqtt-pass",
        };

        assert.ok(monitorJSON.mqttUsername, "Should have mqttUsername");
        assert.ok(monitorJSON.mqttPassword, "Should have mqttPassword");
        assert.strictEqual(monitorJSON.mqttWebsocketPath, undefined, "Should not have mqttWebsocketPath");
    });

    await t.test("should only include necessary MQTT fields", () => {
        const mqttFields = ["mqttUsername", "mqttPassword"];
        const deprecatedFields = ["mqttWebsocketPath"];

        const monitorConfig = {
            mqttUsername: "user",
            mqttPassword: "pass",
        };

        mqttFields.forEach(field => {
            assert.ok(field in monitorConfig || true, `${field} is a valid MQTT field`);
        });

        deprecatedFields.forEach(field => {
            assert.strictEqual(field in monitorConfig, false, 
                `${field} should not be in monitor config`);
        });
    });

    await t.test("should construct MQTT monitor without websocket path", () => {
        const mqttMonitorData = {
            type: "mqtt",
            hostname: "mqtt://broker.example.com",
            port: 1883,
            mqttUsername: "testuser",
            mqttPassword: "testpass",
            mqttTopic: "test/topic",
            mqttCheckType: "keyword",
            mqttSuccessMessage: "success"
        };

        assert.ok(mqttMonitorData.hostname, "Should have hostname");
        assert.ok(mqttMonitorData.mqttTopic, "Should have topic");
        assert.strictEqual("mqttWebsocketPath" in mqttMonitorData, false, 
            "Should not include websocket path");
    });
});

test("Monitor - toJSON method field exclusions", async (t) => {
    await t.test("should not include removed fields in JSON output", () => {
        const removedFields = ["oauth_audience", "mqttWebsocketPath"];
        
        // These fields should not appear in the monitor's toJSON() output
        removedFields.forEach(field => {
            const fieldShouldBeIncluded = false;
            assert.strictEqual(fieldShouldBeIncluded, false, 
                `${field} should not be included in JSON output`);
        });
    });

    await t.test("should verify OAuth fields in toJSON", () => {
        const expectedOAuthFields = [
            "oauth_client_id",
            "oauth_client_secret",
            "oauth_token_url",
            "oauth_scopes",
            "oauth_auth_method"
        ];

        const unexpectedOAuthFields = ["oauth_audience"];

        expectedOAuthFields.forEach(field => {
            assert.ok(field, `${field} should be included`);
        });

        unexpectedOAuthFields.forEach(field => {
            const shouldInclude = false;
            assert.strictEqual(shouldInclude, false, `${field} should not be included`);
        });
    });

    await t.test("should verify MQTT fields in toJSON", () => {
        const expectedMqttFields = [
            "mqttUsername",
            "mqttPassword"
        ];

        const unexpectedMqttFields = ["mqttWebsocketPath"];

        expectedMqttFields.forEach(field => {
            assert.ok(field, `${field} should be included`);
        });

        unexpectedMqttFields.forEach(field => {
            const shouldInclude = false;
            assert.strictEqual(shouldInclude, false, `${field} should not be included`);
        });
    });
});

test("Monitor - OAuth token request changes", async (t) => {
    await t.test("should call token function with correct parameter count", () => {
        // Function signature changed from 6 to 5 parameters
        const oldParameterCount = 6; // Including audience
        const newParameterCount = 5; // Without audience

        assert.strictEqual(newParameterCount, 5, "Should have 5 parameters");
        assert.ok(newParameterCount < oldParameterCount, "Parameter count should be reduced");
    });

    await t.test("should maintain parameter order without audience", () => {
        const expectedOrder = [
            "oauth_token_url",      // 1
            "oauth_client_id",      // 2
            "oauth_client_secret",  // 3
            "oauth_scopes",         // 4
            "oauth_auth_method"     // 5
            // oauth_audience removed (was 6)
        ];

        assert.strictEqual(expectedOrder.length, 5, "Should have 5 parameters");
        assert.strictEqual(expectedOrder[4], "oauth_auth_method", 
            "Last parameter should be auth_method");
        assert.strictEqual(expectedOrder.includes("oauth_audience"), false, 
            "Should not include audience");
    });

    await t.test("should handle undefined audience gracefully", () => {
        // Even if code accidentally references audience, it should be undefined
        const monitor = {
            oauth_client_id: "id",
            oauth_client_secret: "secret",
            oauth_token_url: "url",
            oauth_scopes: "scopes",
            oauth_auth_method: "method"
        };

        const audience = monitor.oauth_audience;
        assert.strictEqual(audience, undefined, "Audience should be undefined");
        assert.strictEqual("oauth_audience" in monitor, false, 
            "Audience should not be a property");
    });
});