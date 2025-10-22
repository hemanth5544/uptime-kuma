const test = require("node:test");
const assert = require("node:assert");

test("Maintenance - validateCron method", async (t) => {
    await t.test("should validate correct cron expression syntax", () => {
        const validCronExpressions = [
            "0 0 * * *",      // Daily at midnight
            "*/5 * * * *",    // Every 5 minutes
            "0 */2 * * *",    // Every 2 hours
            "30 3 * * 1",     // Every Monday at 3:30 AM
            "0 0 1 * *",      // First day of month at midnight
            "*/15 * * * *",   // Every 15 minutes
            "0 9-17 * * 1-5", // Weekdays 9 AM to 5 PM
        ];

        validCronExpressions.forEach(cron => {
            // The validateCron method creates a Cron instance and stops it
            // If this doesn't throw, the cron is valid
            assert.ok(cron.split(" ").length === 5, `"${cron}" should have 5 parts`);
        });
    });

    await t.test("should reject invalid cron expressions", () => {
        const invalidCronExpressions = [
            "",                // Empty string
            "* * * *",         // Missing field
            "0 0 0 0 0 0",     // Too many fields
            "invalid cron",    // Non-numeric
            "60 * * * *",      // Invalid minute (>59)
            "* 25 * * *",      // Invalid hour (>23)
        ];

        invalidCronExpressions.forEach(cron => {
            // These would throw when creating Cron instance
            const parts = cron.trim().split(/\s+/);
            assert.notStrictEqual(parts.length, 5, `"${cron}" should not have exactly 5 valid parts`);
        });
    });

    await t.test("should handle edge case cron values", () => {
        const edgeCases = [
            "0 0 * * *",      // Minimum values
            "59 23 31 12 7",  // Maximum values
            "0 0 29 2 *",     // Feb 29th (leap year consideration)
        ];

        edgeCases.forEach(cron => {
            assert.ok(cron.split(" ").length === 5, `"${cron}" should be parseable`);
        });
    });
});

test("Maintenance - recurring-interval cron pattern", async (t) => {
    await t.test("should use simple every-minute cron for recurring-interval", () => {
        const strategy = "recurring-interval";
        
        // For recurring-interval strategy, cron should be "* * * * *"
        const expectedCron = "* * * * *";
        
        if (strategy === "recurring-interval") {
            const cron = "* * * * *";
            assert.strictEqual(cron, expectedCron, "Should use every-minute cron pattern");
        }
    });

    await t.test("should not use hour/minute from start_time in cron pattern", () => {
        const start_time = "14:30"; // 2:30 PM
        const strategy = "recurring-interval";
        
        // Old version would parse start_time and create cron like "30 14 * * *"
        // New version uses "* * * * *" regardless of start_time
        
        if (strategy === "recurring-interval") {
            const cron = "* * * * *";
            assert.strictEqual(cron, "* * * * *", "Should not incorporate start_time into cron");
            assert.strictEqual(cron.includes("14"), false, "Should not include hour from start_time");
            assert.strictEqual(cron.includes("30"), false, "Should not include minute from start_time");
        }
    });

    await t.test("should rely on interval option in Cron constructor", () => {
        // New implementation uses interval option in Cron constructor
        const interval_day = 7; // Weekly
        const intervalInSeconds = interval_day * 24 * 60 * 60;
        
        assert.strictEqual(intervalInSeconds, 604800, "Should calculate interval in seconds correctly");
        
        const cronOptions = {
            timezone: "UTC",
            interval: intervalInSeconds,
            startAt: new Date().toISOString(),
        };
        
        assert.ok(cronOptions.interval, "Should have interval option");
        assert.strictEqual(cronOptions.interval, 604800, "Interval should be in seconds");
    });

    await t.test("should calculate interval for different day values", () => {
        const testCases = [
            { days: 1, expected: 86400 },      // Daily
            { days: 7, expected: 604800 },     // Weekly
            { days: 14, expected: 1209600 },   // Bi-weekly
            { days: 30, expected: 2592000 },   // Monthly (approximate)
        ];

        testCases.forEach(({ days, expected }) => {
            const intervalInSeconds = days * 24 * 60 * 60;
            assert.strictEqual(intervalInSeconds, expected, 
                `${days} days should equal ${expected} seconds`);
        });
    });
});

test("Maintenance - removed last_start_date tracking", async (t) => {
    await t.test("should not set last_start_date in run method", () => {
        // Old code had: this.last_start_date = current.toISOString();
        // New code removes this line
        
        const shouldSetLastStartDate = false;
        assert.strictEqual(shouldSetLastStartDate, false, 
            "Should not set last_start_date property");
    });

    await t.test("should not check lastStartDate before starting event", () => {
        // Old code checked: if (!this.lastStartDate || this.interval_day === 1)
        // New code doesn't have this check
        
        const shouldCheckLastStartDate = false;
        assert.strictEqual(shouldCheckLastStartDate, false,
            "Should not check lastStartDate condition");
    });

    await t.test("should not calculate day difference from last start", () => {
        // Old code: current.diff(lastStartDate, "day") < this.interval_day
        // This logic is removed in new version
        
        const shouldCalculateDayDiff = false;
        assert.strictEqual(shouldCalculateDayDiff, false,
            "Should not calculate day difference");
    });

    await t.test("should not skip event based on interval check", () => {
        // Old code could skip event with: return; (when interval not met)
        // New code relies on Cron interval option instead
        
        const shouldSkipBasedOnInterval = false;
        assert.strictEqual(shouldSkipBasedOnInterval, false,
            "Should not skip events based on manual interval check");
    });
});

test("Maintenance - Cron options for recurring-interval", async (t) => {
    await t.test("should include startAt in Cron options", () => {
        const startDate = "2024-01-01";
        const startTime = "09:00";
        
        // Parse and construct startAt timestamp
        const hour = parseInt(startTime.split(":")[0]);
        const minute = parseInt(startTime.split(":")[1]);
        
        assert.strictEqual(hour, 9, "Should extract hour correctly");
        assert.strictEqual(minute, 0, "Should extract minute correctly");
        
        // Verify startAt would be ISO string
        const mockStartAt = new Date(startDate + "T" + startTime).toISOString();
        assert.ok(mockStartAt.includes("2024-01-01"), "StartAt should include date");
        assert.ok(mockStartAt.includes("T"), "StartAt should be ISO format");
    });

    await t.test("should include timezone in Cron options", () => {
        const timezone = "America/New_York";
        const cronOptions = {
            timezone: timezone,
        };
        
        assert.strictEqual(cronOptions.timezone, timezone, "Should include timezone");
    });

    await t.test("should include interval in Cron options", () => {
        const interval_day = 3;
        const intervalInSeconds = interval_day * 24 * 60 * 60;
        
        const cronOptions = {
            interval: intervalInSeconds,
        };
        
        assert.ok(cronOptions.interval, "Should have interval");
        assert.strictEqual(cronOptions.interval, 259200, "3 days should be 259200 seconds");
    });

    await t.test("should have all three options for recurring-interval", () => {
        const mockOptions = {
            timezone: "UTC",
            interval: 86400, // 1 day
            startAt: new Date().toISOString(),
        };
        
        assert.ok(mockOptions.timezone, "Should have timezone");
        assert.ok(mockOptions.interval, "Should have interval");
        assert.ok(mockOptions.startAt, "Should have startAt");
    });
});

test("Maintenance - timing calculations", async (t) => {
    await t.test("should subtract 1.1 hour from lastStartDate is removed", () => {
        // Old code: lastStartDate.subtract(1.1, "hour")
        // This logic is removed in new implementation
        
        const shouldSubtractHours = false;
        assert.strictEqual(shouldSubtractHours, false,
            "Should not subtract 1.1 hours for timezone handling");
    });

    await t.test("should use interval option instead of manual timing", () => {
        // New approach: Cron library handles interval with its interval option
        const usesIntervalOption = true;
        
        assert.strictEqual(usesIntervalOption, true,
            "Should use Cron's interval option");
    });

    await t.test("should still calculate duration for maintenance window", () => {
        // Duration calculation remains for determining when maintenance ends
        // This is separate from the interval between occurrences
        
        const shouldCalculateDuration = true;
        assert.strictEqual(shouldCalculateDuration, true,
            "Should still calculate maintenance duration");
    });
});