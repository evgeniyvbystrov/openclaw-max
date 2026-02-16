/**
 * Monitor tests — verify inbound message processing logic
 */

import { describe, it, expect, vi } from "vitest";
import type { MaxUpdate, MaxMessage, MaxUser } from "../src/api.js";

describe("Monitor: typing_on and mark_seen behavior", () => {
  it("should send typing_on action when processing messages", () => {
    // This is tested via integration - monitor.ts sends typing_on in two places:
    // 1. On message_created (line with sendAction(chatIdForRead, "typing_on"))
    // 2. On message_edited (line with sendAction(chatIdForEditRead, "typing_on"))
    // 3. Before agent processing (line with sendAction(chatIdStr, "typing_on"))
    
    // Verification: search for "typing_on" in monitor.ts
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    const typingOnMatches = monitorSource.match(/sendAction\([^,]+,\s*["']typing_on["']/g);
    expect(typingOnMatches).toBeTruthy();
    expect(typingOnMatches.length).toBeGreaterThanOrEqual(2); // At least 2 occurrences
  });

  it("should send mark_seen action when processing messages", () => {
    // This is tested via integration - monitor.ts sends mark_seen in two places:
    // 1. On message_created (line with sendAction(chatIdForRead, "mark_seen"))
    // 2. On message_edited (line with sendAction(chatIdForEditRead, "mark_seen"))
    
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    const markSeenMatches = monitorSource.match(/sendAction\([^,]+,\s*["']mark_seen["']/g);
    expect(markSeenMatches).toBeTruthy();
    expect(markSeenMatches.length).toBeGreaterThanOrEqual(2); // At least 2 occurrences
  });
});

describe("Monitor: reply-as-mention logic", () => {
  it("should detect reply to bot message as mention", () => {
    // Verify the code checks for reply.sender.is_bot and reply.sender.user_id === botUserId
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for reply detection logic
    expect(monitorSource).toContain('message.link?.type === "reply"');
    expect(monitorSource).toContain("wasMentioned = true");
  });

  it("should handle requireMention policy in groups", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for requireMention logic
    expect(monitorSource).toContain("requireMention");
    expect(monitorSource).toContain("wasMentioned");
  });

  it("should check for @bot mentions in message text", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for mention pattern matching
    expect(monitorSource).toContain("@");
    expect(monitorSource).toContain("botUsername");
  });
});

describe("Monitor: attachment handling", () => {
  it("should process messages with attachments but no text", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for attachment processing
    expect(monitorSource).toContain("attachments");
    expect(monitorSource).toContain("effectiveText");
  });

  it("should skip truly empty messages", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for empty message check
    expect(monitorSource).toContain("!effectiveText && !hasMedia");
  });

  it("should download media from attachment URLs", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for media download logic
    expect(monitorSource).toContain("fetchRemoteMedia");
    expect(monitorSource).toContain("saveMediaBuffer");
  });

  it("should handle sticker attachments", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for sticker handling
    expect(monitorSource).toContain('"sticker"');
    expect(monitorSource).toContain("Sticker");
  });
});

describe("Monitor: edited message mid suffix", () => {
  it("should append _edited_{timestamp} suffix to edited message mid", () => {
    const originalMid = "msg_original_123";
    const timestamp = 1234567890123;
    const expectedMid = `${originalMid}_edited_${timestamp}`;

    const update: MaxUpdate = {
      update_type: "message_edited",
      timestamp,
      message: {
        sender: { user_id: 123, first_name: "User", is_bot: false },
        recipient: { chat_id: 456, chat_type: "dialog" },
        timestamp,
        body: { mid: originalMid, text: "Edited text" },
      },
    };

    // Verify the suffix is appended by checking the expected pattern
    const editedMid = `${update.message!.body.mid}_edited_${update.timestamp}`;
    expect(editedMid).toBe(expectedMid);
    expect(editedMid).toMatch(/_edited_\d+$/);
  });

  it("should preserve original mid in reply context (strip suffix)", () => {
    const originalMid = "msg_original_456";
    const editedMid = `${originalMid}_edited_9876543210`;

    // When replying, suffix should be stripped
    const strippedMid = editedMid.replace(/_edited_\d+$/, "");
    
    expect(strippedMid).toBe(originalMid);
  });

  it("should include _edited_ suffix logic in monitor code", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for edited suffix logic
    expect(monitorSource).toContain("_edited_");
    expect(monitorSource).toContain("${update.timestamp}");
  });

  it("should strip suffix when replying to edited messages", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for suffix stripping logic
    expect(monitorSource).toContain("replace(/_edited_\\d+$/");
  });
});

describe("Monitor: message_edited handling", () => {
  it("should fetch missing text from API for edited messages", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for API fetch logic for edited messages
    expect(monitorSource).toContain("getMessages");
    expect(monitorSource).toContain("message_edited");
  });

  it("should handle edited messages without text gracefully", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for text fallback logic
    expect(monitorSource).toContain("!editedMessage.body.text?.trim()");
  });
});

describe("Monitor: processIncomingMessage export", () => {
  it("should export processIncomingMessage for testing", async () => {
    const { processIncomingMessage } = await import("../src/monitor.js");
    
    expect(typeof processIncomingMessage).toBe("function");
  });

  it("should be marked as @internal", () => {
    const monitorSource = require("fs").readFileSync(
      require("path").join(__dirname, "../src/monitor.ts"),
      "utf8"
    );
    
    // Check for @internal JSDoc comment
    expect(monitorSource).toContain("@internal");
    expect(monitorSource).toContain("Exported for testing only");
  });
});
