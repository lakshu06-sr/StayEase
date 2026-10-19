const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

async function askAI(message) {
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: message
  });

  return response.text;
}

async function recommendListings(message) {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: message,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          answer: {
            type: "string",
            description: "A short friendly explanation of the recommendation."
          },
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                listingId: {
                  type: "string",
                  description: "The exact MongoDB ID of the recommended listing."
                },
                reason: {
                  type: "string",
                  description: "Why this listing matches the user's request."
                }
              },
              required: ["listingId", "reason"]
            }
          }
        },
        required: ["answer", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text);
}

module.exports = { askAI, recommendListings };