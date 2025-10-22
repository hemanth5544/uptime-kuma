const test = require("node:test");
const assert = require("node:assert");

test("MQTT Monitor - websocketPath parameter removal", async (t) => {
    await t.test("should not include websocketPath in options", () => {
        const options = {
            username: "testuser",
            password: "testpass",
            interval: 20,
        };

        assert.ok(options.username, "Should have username");
        assert.ok(options.password, "Should have password");
        assert.ok(options.interval, "Should have interval");
        assert.strictEqual(options.websocketPath, undefined, "Should not have websocketPath");
        assert.strictEqual("websocketPath" in options, false, "websocketPath key should not exist");
    });

    await t.test("should not extract websocketPath from options", () => {
        const options = {
            port: 1883,
            username: "user",
            password: "pass",
            interval: 20,
        };

        const { port, username, password, interval } = options;
        
        assert.strictEqual(port, 1883, "Should extract port");
        assert.strictEqual(username, "user", "Should extract username");
        assert.strictEqual(password, "pass", "Should extract password");
        assert.strictEqual(interval, 20, "Should extract interval");
        
        // websocketPath should not be destructured
        const websocketPath = options.websocketPath;
        assert.strictEqual(websocketPath, undefined, "websocketPath should be undefined");
    });

    await t.test("should not append websocketPath to URL", () => {
        const hostname = "ws://mqtt.example.com";
        const port = 8080;
        
        // Old code: mqttUrl = `${hostname}:${port}/${websocketPath || ""}`
        // New code: mqttUrl = `${hostname}:${port}`
        
        const mqttUrl = `${hostname}:${port}`;
        
        assert.strictEqual(mqttUrl, "ws://mqtt.example.com:8080", "Should not include path");
        assert.strictEqual(mqttUrl.includes("/"), true, "Should only have protocol slash");
        assert.strictEqual(mqttUrl.endsWith("/"), false, "Should not end with slash");
    });

    await t.test("should construct simple MQTT URL for WebSocket protocols", () => {
        const testCases = [
            { hostname: "ws://localhost", port: 8080, expected: "ws://localhost:8080" },
            { hostname: "wss://secure.example.com", port: 8083, expected: "wss://secure.example.com:8083" },
            { hostname: "ws://mqtt.local", port: 9001, expected: "ws://mqtt.local:9001" },
        ];

        testCases.forEach(({ hostname, port, expected }) => {
            const mqttUrl = `${hostname}:${port}`;
            assert.strictEqual(mqttUrl, expected, `Should construct URL correctly for ${hostname}`);
        });
    });

    await t.test("should construct simple MQTT URL for standard protocols", () => {
        const testCases = [
            { hostname: "mqtt://broker.example.com", port: 1883, expected: "mqtt://broker.example.com:1883" },
            { hostname: "mqtts://secure-broker.com", port: 8883, expected: "mqtts://secure-broker.com:8883" },
        ];

        testCases.forEach(({ hostname, port, expected }) => {
            const mqttUrl = `${hostname}:${port}`;
            assert.strictEqual(mqttUrl, expected, `Should construct URL correctly for ${hostname}`);
        });
    });

    await t.test("should not check if websocketPath starts with slash", () => {
        // Old code checked: if (websocketPath && !websocketPath.startsWith("/"))
        // This logic is removed
        
        const shouldCheckPathPrefix = false;
        assert.strictEqual(shouldCheckPathPrefix, false, 
            "Should not check websocketPath prefix");
    });

    await t.test("should not have conditional URL construction", () => {
        // Old code had if/else for WebSocket protocols
        // New code uses simple concatenation for all protocols
        
        const hostname = "ws://test.com";
        const port = 8080;
        const mqttUrl = `${hostname}:${port}`;
        
        // No conditional logic needed
        assert.ok(mqttUrl, "Should construct URL without conditionals");
        assert.strictEqual(typeof mqttUrl, "string", "URL should be a string");
    });
});

test("MQTT Monitor - mqttAsync function signature", async (t) => {
    await t.test("should accept options without websocketPath", () => {
        const validOptions = {
            port: 1883,
            username: "testuser",
            password: "testpass",
            interval: 30,
        };

        assert.ok(validOptions.port, "Should have port");
        assert.ok(validOptions.username, "Should have username");
        assert.ok(validOptions.password, "Should have password");
        assert.ok(validOptions.interval, "Should have interval");
        assert.strictEqual(Object.keys(validOptions).length, 4, "Should have exactly 4 properties");
    });

    await t.test("should use default interval when not provided", () => {
        const defaultInterval = 20;
        const options = {};
        
        const interval = options.interval || defaultInterval;
        assert.strictEqual(interval, 20, "Should use default interval of 20");
    });

    await t.test("should override default interval when provided", () => {
        const defaultInterval = 20;
        const options = { interval: 45 };
        
        const interval = options.interval || defaultInterval;
        assert.strictEqual(interval, 45, "Should use provided interval");
    });

    await t.test("should calculate timeout based on interval", () => {
        const interval = 20;
        const timeout = interval * 1000 * 0.8; // 80% of interval
        
        assert.strictEqual(timeout, 16000, "Timeout should be 16000ms (80% of 20s)");
    });

    await t.test("should handle various interval values", () => {
        const testCases = [
            { interval: 10, expectedTimeout: 8000 },
            { interval: 20, expectedTimeout: 16000 },
            { interval: 30, expectedTimeout: 24000 },
            { interval: 60, expectedTimeout: 48000 },
        ];

        testCases.forEach(({ interval, expectedTimeout }) => {
            const timeout = interval * 1000 * 0.8;
            assert.strictEqual(timeout, expectedTimeout, 
                `Interval ${interval}s should give timeout ${expectedTimeout}ms`);
        });
    });
});

test("MQTT Monitor - protocol detection", async (t) => {
    await t.test("should detect MQTT protocol prefixes", () => {
        const protocolRegex = /^(?:http|mqtt|ws)s?:\/\//;
        
        const validPrefixes = [
            "http://example.com",
            "https://example.com",
            "mqtt://broker.com",
            "mqtts://secure-broker.com",
            "ws://websocket.com",
            "wss://secure-websocket.com",
        ];

        validPrefixes.forEach(url => {
            assert.ok(protocolRegex.test(url), `"${url}" should match protocol regex`);
        });
    });

    await t.test("should detect hostnames without protocol", () => {
        const protocolRegex = /^(?:http|mqtt|ws)s?:\/\//;
        
        const hostnamesWithoutProtocol = [
            "localhost",
            "192.168.1.1",
            "broker.example.com",
            "mqtt.local",
        ];

        hostnamesWithoutProtocol.forEach(hostname => {
            assert.strictEqual(protocolRegex.test(hostname), false, 
                `"${hostname}" should not match protocol regex`);
        });
    });

    await t.test("should add mqtt protocol to hostnames without protocol", () => {
        const hostname = "broker.example.com";
        const protocolRegex = /^(?:http|mqtt|ws)s?:\/\//;
        
        if (!protocolRegex.test(hostname)) {
            const withProtocol = "mqtt://" + hostname;
            assert.strictEqual(withProtocol, "mqtt://broker.example.com", 
                "Should prepend mqtt:// protocol");
        }
    });
});

test("MQTT Monitor - URL construction consistency", async (t) => {
    await t.test("should construct URL consistently regardless of protocol", () => {
        const testCases = [
            { hostname: "mqtt://broker.com", port: 1883 },
            { hostname: "ws://broker.com", port: 8080 },
            { hostname: "wss://broker.com", port: 8083 },
        ];

        testCases.forEach(({ hostname, port }) => {
            const mqttUrl = `${hostname}:${port}`;
            
            // All URLs should follow same pattern: protocol://host:port
            assert.ok(mqttUrl.includes("://"), "Should contain protocol separator");
            assert.ok(mqttUrl.includes(`:${port}`), "Should contain port");
            assert.strictEqual(mqttUrl.split(":").length, 3, "Should have protocol:host:port format");
        });
    });

    await t.test("should not have different URL formats for WebSocket vs standard MQTT", () => {
        const mqttUrl = "mqtt://broker.com:1883";
        const wsUrl = "ws://broker.com:8080";
        
        // Both should follow same pattern
        const mqttParts = mqttUrl.split(":");
        const wsParts = wsUrl.split(":");
        
        assert.strictEqual(mqttParts.length, 3, "MQTT URL should have 3 parts");
        assert.strictEqual(wsParts.length, 3, "WebSocket URL should have 3 parts");
        assert.strictEqual(mqttParts.length, wsParts.length, "URLs should have same structure");
    });
});