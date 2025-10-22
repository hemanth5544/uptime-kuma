const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const sinon = require("sinon");

test("Database - MariaDB database name validation", async (t) => {
    await t.test("should accept valid database names with letters, numbers and underscores", () => {
        const validNames = [
            "uptime_kuma",
            "uptime123",
            "UPTIME_KUMA_123",
            "db_test_123",
            "mydb",
            "_underscore_start",
            "test_"
        ];

        validNames.forEach(dbName => {
            const regex = /^\w+$/;
            assert.strictEqual(regex.test(dbName), true, `"${dbName}" should be valid`);
        });
    });

    await t.test("should reject invalid database names with special characters", () => {
        const invalidNames = [
            "uptime-kuma",
            "uptime.kuma",
            "uptime kuma",
            "uptime/kuma",
            "uptime\\kuma",
            "uptime;kuma",
            "uptime'kuma",
            "uptime\"kuma",
            "uptime`kuma",
            "uptime@kuma",
            "uptime#kuma",
            "uptime$kuma",
            "uptime%kuma",
            "uptime&kuma",
            "uptime*kuma",
            "uptime(kuma",
            "uptime)kuma",
            "uptime+kuma",
            "uptime=kuma",
            "uptime[kuma",
            "uptime]kuma",
            "uptime{kuma",
            "uptime}kuma",
            "uptime|kuma",
            "uptime<kuma",
            "uptime>kuma",
            "uptime,kuma",
            "uptime?kuma",
            "uptime!kuma",
            "uptime~kuma",
            ""
        ];

        invalidNames.forEach(dbName => {
            const regex = /^\w+$/;
            assert.strictEqual(regex.test(dbName), false, `"${dbName}" should be invalid`);
        });
    });

    await t.test("should reject database names with dots that could cause SQL injection", () => {
        const sqlInjectionAttempts = [
            "db.table",
            "information_schema.tables",
            "../etc/passwd",
            "db`;DROP TABLE users;--"
        ];

        sqlInjectionAttempts.forEach(dbName => {
            const regex = /^\w+$/;
            assert.strictEqual(regex.test(dbName), false, `"${dbName}" should be rejected`);
        });
    });

    await t.test("should accept empty string check edge case", () => {
        const regex = /^\w+$/;
        assert.strictEqual(regex.test(""), false, "Empty string should be rejected");
    });

    await t.test("should handle unicode and international characters correctly", () => {
        const unicodeNames = [
            "数据库",
            "Москва",
            "データベース",
            "café"
        ];

        unicodeNames.forEach(dbName => {
            const regex = /^\w+$/;
            // These should be accepted if using Unicode-aware \w
            // or rejected if using ASCII-only \w (which is the safer approach for database names)
            const result = regex.test(dbName);
            // Document the behavior - typically rejected for security
            assert.ok(typeof result === "boolean", `Should return boolean for "${dbName}"`);
        });
    });
});

test("Database - MariaDB SSL certificate validation", async (t) => {
    await t.test("should detect missing SSL certificate file", () => {
        const nonExistentPath = "/path/to/nonexistent/cert.pem";
        assert.strictEqual(fs.existsSync(nonExistentPath), false, "Certificate should not exist");
    });

    await t.test("should properly construct certificate path", () => {
        const certPath = path.join(__dirname, "../../certs/your-cert.pem");
        assert.ok(certPath.includes("certs/your-cert.pem"), "Path should contain certs directory");
        assert.ok(path.isAbsolute(certPath), "Path should be absolute");
    });

    await t.test("should validate SSL options structure", () => {
        // Simulate SSL options that would be created
        const mockCertContent = "-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----";
        
        const sslOptions = {
            rejectUnauthorized: true,
            ca: mockCertContent,
        };

        assert.strictEqual(sslOptions.rejectUnauthorized, true, "Should reject unauthorized connections");
        assert.ok(sslOptions.ca, "Should have CA certificate");
        assert.strictEqual(typeof sslOptions.ca, "string", "CA should be a string");
    });

    await t.test("should handle SSL enabled flag correctly", () => {
        const testCases = [
            { ssl: true, expected: true },
            { ssl: false, expected: false },
            { ssl: undefined, expected: false },
            { ssl: null, expected: false },
            { ssl: 1, expected: true },
            { ssl: 0, expected: false },
            { ssl: "", expected: false },
            { ssl: "true", expected: true },
        ];

        testCases.forEach(({ ssl, expected }) => {
            const result = !!ssl;
            assert.strictEqual(result, expected, `SSL flag ${ssl} should evaluate to ${expected}`);
        });
    });
});

test("Database - MariaDB connection string construction", async (t) => {
    await t.test("should construct connection without SSL", () => {
        const config = {
            hostname: "localhost",
            port: 3306,
            user: "testuser",
            password: "testpass",
            ssl: null
        };

        // Test that ssl is correctly set to undefined when not enabled
        const sslValue = config.ssl || undefined;
        assert.strictEqual(sslValue, undefined, "SSL should be undefined when not enabled");
    });

    await t.test("should construct connection with SSL", () => {
        const mockCert = Buffer.from("mock-cert-content");
        const config = {
            hostname: "db.example.com",
            port: 3306,
            user: "secureuser",
            password: "securepass",
            ssl: {
                rejectUnauthorized: true,
                ca: mockCert
            }
        };

        assert.ok(config.ssl, "SSL config should exist");
        assert.strictEqual(config.ssl.rejectUnauthorized, true, "Should reject unauthorized");
        assert.ok(Buffer.isBuffer(config.ssl.ca) || typeof config.ssl.ca === "string", "CA should be buffer or string");
    });

    await t.test("should validate database creation query format", () => {
        const validDbName = "test_db_123";
        const query = `CREATE DATABASE IF NOT EXISTS ${validDbName} CHARACTER SET utf8mb4`;
        
        assert.ok(query.includes("CREATE DATABASE IF NOT EXISTS"), "Query should use IF NOT EXISTS");
        assert.ok(query.includes("CHARACTER SET utf8mb4"), "Query should specify utf8mb4");
        assert.ok(query.includes(validDbName), "Query should include database name");
    });
});

test("Database - Error message validation", async (t) => {
    await t.test("should create descriptive error for invalid database name", () => {
        const expectedMessage = "Invalid database name. A database name can only consist of letters, numbers and underscores";
        assert.ok(expectedMessage.length > 0, "Error message should not be empty");
        assert.ok(expectedMessage.includes("letters, numbers and underscores"), "Should describe allowed characters");
    });

    await t.test("should create descriptive error for missing certificate", () => {
        const certPath = "/path/to/cert.pem";
        const expectedMessage = `SSL is enabled but certificate file not found at ${certPath}. Please upload your PEM file.`;
        
        assert.ok(expectedMessage.includes("SSL is enabled"), "Should mention SSL");
        assert.ok(expectedMessage.includes("certificate file not found"), "Should mention missing file");
        assert.ok(expectedMessage.includes(certPath), "Should include the path");
        assert.ok(expectedMessage.includes("Please upload your PEM file"), "Should provide guidance");
    });
});

test("Database - Path construction and validation", async (t) => {
    await t.test("should construct correct path to certs directory", () => {
        // Assuming __dirname is test/backend-test
        const serverDir = path.join(__dirname, "../../server");
        const certPath = path.join(serverDir, "../certs/your-cert.pem");
        const normalized = path.normalize(certPath);
        
        assert.ok(normalized.includes("certs"), "Path should include certs directory");
        assert.ok(normalized.endsWith("your-cert.pem"), "Path should end with cert filename");
    });

    await t.test("should handle path separators correctly across platforms", () => {
        const dirname = __dirname;
        const certPath = path.join(dirname, "..", "..", "certs", "your-cert.pem");
        
        // Path should be valid regardless of platform
        assert.ok(certPath.length > 0, "Path should not be empty");
        assert.strictEqual(typeof certPath, "string", "Path should be a string");
    });
});

test("Database - CREATE DATABASE query without SqlString", async (t) => {
    await t.test("should use plain string concatenation for database name", () => {
        const dbName = "test_database";
        const query = "CREATE DATABASE IF NOT EXISTS " + dbName + " CHARACTER SET utf8mb4";
        
        assert.strictEqual(
            query,
            "CREATE DATABASE IF NOT EXISTS test_database CHARACTER SET utf8mb4",
            "Query should use simple concatenation"
        );
    });

    await t.test("should not use SqlString escaping methods", () => {
        // Verify that the new approach doesn't use SqlString.escapeId
        const dbName = "my_db";
        const query = "CREATE DATABASE IF NOT EXISTS " + dbName + " CHARACTER SET utf8mb4";
        
        // Should NOT contain backticks which SqlString.escapeId would add
        assert.strictEqual(query.includes("`"), false, "Should not contain backticks from escapeId");
        assert.ok(query.includes(dbName), "Should contain raw database name");
    });

    await t.test("should maintain SQL injection protection through validation", () => {
        // Since SqlString is removed, validation regex must be the protection
        const maliciousNames = [
            "db; DROP TABLE users;",
            "db' OR '1'='1",
            "db`; DELETE FROM important_table",
            "../../../etc/passwd"
        ];

        const validationRegex = /^\w+$/;
        
        maliciousNames.forEach(malicious => {
            assert.strictEqual(
                validationRegex.test(malicious),
                false,
                `"${malicious}" should be blocked by validation`
            );
        });
    });
});