import { describe, expect, it } from "vitest";

describe("ListenHub API Connection", () => {
  it("should successfully connect to ListenHub API and fetch speaker list", async () => {
    const apiKey = process.env.LISTENHUB_API_KEY;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");

    // Test API connection by fetching Chinese speakers
    const response = await fetch(
      "https://api.marswave.ai/openapi/v1/speakers/list?language=zh",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    
    expect(data.code).toBe(0);
    expect(data.data).toBeDefined();
    expect(data.data.items).toBeInstanceOf(Array);
    expect(data.data.items.length).toBeGreaterThan(0);

    // Check if we have at least one male and one female speaker
    const hasMale = data.data.items.some((speaker: any) => speaker.gender === "male");
    const hasFemale = data.data.items.some((speaker: any) => speaker.gender === "female");
    
    expect(hasMale).toBe(true);
    expect(hasFemale).toBe(true);

    console.log(`✅ ListenHub API connected successfully. Found ${data.data.items.length} Chinese speakers.`);
  }, 30000); // 30 second timeout
});
