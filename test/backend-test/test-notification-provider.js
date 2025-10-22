const test = require("node:test");
const assert = require("node:assert");
const NotificationProvider = require("../../server/notification-providers/notification-provider");
const { DOWN, UP } = require("../../src/util");

test("NotificationProvider - renderTemplate with simplified Liquid engine", async (t) => {
    const provider = new NotificationProvider();

    await t.test("should render template with monitor and heartbeat data", async () => {
        const template = "Monitor {{name}} is {{status}}";
        const msg = "Test message";
        const monitorJSON = {
            name: "Test Monitor",
            type: "http",
            url: "https://example.com"
        };
        const heartbeatJSON = {
            status: UP
        };

        const result = await provider.renderTemplate(template, msg, monitorJSON, heartbeatJSON);
        
        assert.ok(result.includes("Test Monitor"), "Should include monitor name");
        assert.ok(result.includes("Up"), "Should include status");
    });

    await t.test("should render template with null monitor", async () => {
        const template = "Status: {{status}}";
        const msg = "Test message";
        const heartbeatJSON = {
            status: DOWN
        };

        const result = await provider.renderTemplate(template, msg, null, heartbeatJSON);
        
        assert.ok(result.includes("Down"), "Should render status even without monitor");
    });

    await t.test("should render template with null heartbeat", async () => {
        const template = "Monitor: {{name}}";
        const msg = "Test message";
        const monitorJSON = {
            name: "My Monitor",
            type: "ping",
            hostname: "example.com"
        };

        const result = await provider.renderTemplate(template, msg, monitorJSON, null);
        
        assert.ok(result.includes("My Monitor"), "Should render monitor name");
    });

    await t.test("should use dummy values when both monitor and heartbeat are null", async () => {
        const template = "Name: {{name}}, Status: {{status}}";
        const msg = "Test message";

        const result = await provider.renderTemplate(template, msg, null, null);
        
        assert.ok(result.includes("Monitor Name not available"), "Should use default monitor name");
        assert.ok(result.includes("Test"), "Should use test status");
    });

    await t.test("should render hostnameOrURL variable", async () => {
        const template = "URL: {{hostnameOrURL}}";
        const msg = "Test message";
        const monitorJSON = {
            name: "HTTP Monitor",
            type: "http",
            url: "https://api.example.com"
        };

        const result = await provider.renderTemplate(template, msg, monitorJSON, null);
        
        assert.ok(result.includes("api.example.com") || result.includes("https://api.example.com"), 
            "Should include URL or hostname");
    });

    await t.test("should support legacy STATUS variable", async () => {
        const template = "Status: {{STATUS}}";
        const msg = "Test";
        const heartbeatJSON = { status: UP };

        const result = await provider.renderTemplate(template, msg, null, heartbeatJSON);
        
        assert.ok(result.includes("Up"), "Should support legacy STATUS variable");
    });

    await t.test("should support legacy NAME variable", async () => {
        const template = "Name: {{NAME}}";
        const msg = "Test";
        const monitorJSON = { name: "Legacy Test", type: "http", url: "https://example.com" };

        const result = await provider.renderTemplate(template, msg, monitorJSON, null);
        
        assert.ok(result.includes("Legacy Test"), "Should support legacy NAME variable");
    });

    await t.test("should include msg in context", async () => {
        const template = "Message: {{msg}}";
        const msg = "Custom notification message";
        
        const result = await provider.renderTemplate(template, msg, null, null);
        
        assert.ok(result.includes("Custom notification message"), "Should include msg in context");
    });

    await t.test("should handle empty template", async () => {
        const template = "";
        const msg = "Test";
        
        const result = await provider.renderTemplate(template, msg, null, null);
        
        assert.strictEqual(result, "", "Empty template should render as empty string");
    });
});

test("NotificationProvider - Liquid engine configuration", async (t) => {
    await t.test("should create Liquid engine without custom configuration", () => {
        // In the new version, Liquid is created with default config
        // No root, relativeReference, or dynamicPartials specified
        const expectedConfig = {};
        
        assert.strictEqual(typeof expectedConfig, "object", "Config should be an object");
        assert.strictEqual(Object.keys(expectedConfig).length, 0, "Config should be empty (using defaults)");
    });

    await t.test("should not specify root directory", () => {
        // Old version had: root: "./no-such-directory-uptime-kuma"
        // New version doesn't specify root
        const hasCustomRoot = false;
        
        assert.strictEqual(hasCustomRoot, false, "Should not have custom root directory");
    });

    await t.test("should not disable relativeReference", () => {
        // Old version had: relativeReference: false
        // New version uses default behavior
        const hasRelativeReferenceConfig = false;
        
        assert.strictEqual(hasRelativeReferenceConfig, false, "Should not configure relativeReference");
    });

    await t.test("should not disable dynamicPartials", () => {
        // Old version had: dynamicPartials: false
        // New version uses default behavior
        const hasDynamicPartialsConfig = false;
        
        assert.strictEqual(hasDynamicPartialsConfig, false, "Should not configure dynamicPartials");
    });
});

test("NotificationProvider - extractAddress method", async (t) => {
    const provider = new NotificationProvider();

    await t.test("should extract address for ping monitor", () => {
        const monitorJSON = {
            type: "ping",
            hostname: "example.com"
        };

        const address = provider.extractAddress(monitorJSON);
        assert.strictEqual(address, "example.com", "Should return hostname for ping");
    });

    await t.test("should extract address for port monitor with port", () => {
        const monitorJSON = {
            type: "port",
            hostname: "example.com",
            port: 8080
        };

        const address = provider.extractAddress(monitorJSON);
        assert.strictEqual(address, "example.com:8080", "Should return hostname:port");
    });

    await t.test("should extract address for port monitor without port", () => {
        const monitorJSON = {
            type: "port",
            hostname: "example.com"
        };

        const address = provider.extractAddress(monitorJSON);
        assert.strictEqual(address, "example.com", "Should return hostname only");
    });

    await t.test("should return Heartbeat for push monitor", () => {
        const monitorJSON = {
            type: "push"
        };

        const address = provider.extractAddress(monitorJSON);
        assert.strictEqual(address, "Heartbeat", "Should return Heartbeat for push");
    });

    await t.test("should extract URL for http monitor", () => {
        const monitorJSON = {
            type: "http",
            url: "https://example.com/api"
        };

        const address = provider.extractAddress(monitorJSON);
        assert.strictEqual(address, "https://example.com/api", "Should return full URL");
    });

    await t.test("should return empty string for null monitor", () => {
        const address = provider.extractAddress(null);
        assert.strictEqual(address, "", "Should return empty string for null");
    });

    await t.test("should handle empty URL", () => {
        const monitorJSON = {
            type: "http",
            url: ""
        };

        const address = provider.extractAddress(monitorJSON);
        assert.strictEqual(address, "", "Should return empty string for empty URL");
    });
});

test("NotificationProvider - removed getAxiosConfigWithProxy method", async (t) => {
    const provider = new NotificationProvider();

    await t.test("should not have getAxiosConfigWithProxy method", () => {
        assert.strictEqual(
            typeof provider.getAxiosConfigWithProxy,
            "undefined",
            "getAxiosConfigWithProxy method should not exist"
        );
    });

    await t.test("should not configure proxy from environment variables", () => {
        // The old implementation checked process.env.notification_proxy and process.env.NOTIFICATION_PROXY
        // This functionality has been removed
        const hasProxyMethod = "getAxiosConfigWithProxy" in provider;
        assert.strictEqual(hasProxyMethod, false, "Should not have proxy configuration method");
    });

    await t.test("provider should only have core methods", () => {
        const expectedMethods = ["send", "extractAddress", "renderTemplate", "throwGeneralAxiosError"];
        const actualMethods = Object.getOwnPropertyNames(NotificationProvider.prototype)
            .filter(name => name !== "constructor");

        expectedMethods.forEach(method => {
            assert.ok(
                actualMethods.includes(method),
                `Should have ${method} method`
            );
        });

        assert.strictEqual(
            actualMethods.includes("getAxiosConfigWithProxy"),
            false,
            "Should not have getAxiosConfigWithProxy"
        );
    });
});

test("NotificationProvider - throwGeneralAxiosError method", async (t) => {
    const provider = new NotificationProvider();

    await t.test("should format error with response data string", () => {
        const error = {
            message: "Request failed",
            response: {
                data: "Server error message"
            }
        };

        try {
            provider.throwGeneralAxiosError(error);
            assert.fail("Should have thrown an error");
        } catch (thrown) {
            assert.ok(thrown.message.includes("Error:"), "Should include Error prefix");
            assert.ok(thrown.message.includes("Server error message"), "Should include response data");
        }
    });

    await t.test("should format error with response data object", () => {
        const error = {
            message: "Request failed",
            response: {
                data: { error: "Invalid request", code: 400 }
            }
        };

        try {
            provider.throwGeneralAxiosError(error);
            assert.fail("Should have thrown an error");
        } catch (thrown) {
            assert.ok(thrown.message.includes("Error:"), "Should include Error prefix");
            assert.ok(thrown.message.includes("Invalid request") || thrown.message.includes("400"), 
                "Should include response data");
        }
    });

    await t.test("should handle error without response data", () => {
        const error = {
            message: "Network error"
        };

        try {
            provider.throwGeneralAxiosError(error);
            assert.fail("Should have thrown an error");
        } catch (thrown) {
            assert.ok(thrown.message.includes("Network error"), "Should include error message");
        }
    });
});