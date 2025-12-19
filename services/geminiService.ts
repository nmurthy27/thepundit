
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { ProcessingResult, OnboardingData, Tone } from "../types";

export const analyzeProfession = async (profession: string): Promise<OnboardingData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    A user is setting up an automated personal branding app called "ThePundit".
    The user's profession/interest is: "${profession}".
    
    Based on this, perform an exhaustive analysis and provide:
    1. Exactly 20 high-quality industry news sites, publications, or RSS feeds with their specific website URLs. Focus on top-tier global and niche specialty sources.
    2. Exactly 20 strategic keywords that are essential for content tracking in this niche to establish thought leadership.
    3. Exactly 20 major companies, startups, or market leaders in this space to monitor for competitive intel.
    4. A short 2-sentence analysis of why this specific collection of 60 data points is the right engine for building professional authority.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedSources: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  url: { type: Type.STRING }
                },
                required: ["name", "url"]
              }
            },
            suggestedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedCompanies: { type: Type.ARRAY, items: { type: Type.STRING } },
            analysis: { type: Type.STRING }
          },
          required: ["suggestedSources", "suggestedKeywords", "suggestedCompanies", "analysis"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini onboarding error:", error);
    throw error;
  }
};

export const processNewsItem = async (input: string, keywords: string[], articleUrl: string, tone: Tone): Promise<ProcessingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction: SYSTEM_PROMPT(keywords, articleUrl, tone),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            meta: {
              type: Type.OBJECT,
              properties: {
                sourceTopic: { type: Type.STRING },
                sentiment: { type: Type.STRING },
                viralityScore: { type: Type.NUMBER }
              },
              required: ["sourceTopic", "sentiment", "viralityScore"]
            },
            posts: {
              type: Type.OBJECT,
              properties: {
                linkedin: {
                  type: Type.OBJECT,
                  properties: {
                    hook: { type: Type.STRING },
                    body: { type: Type.STRING },
                    kicker: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["hook", "body", "kicker", "hashtags"]
                },
                twitter: {
                  type: Type.OBJECT,
                  properties: {
                    content: { type: Type.STRING },
                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["content", "hashtags"]
                }
              },
              required: ["linkedin", "twitter"]
            }
          },
          required: ["status", "meta"]
        }
      }
    });

    const data = JSON.parse(response.text || '{}');

    if (data.status === 'SKIP') {
      return {
        posts: null,
        meta: {
          status: 'SKIP',
          sourceTopic: 'Unknown',
          sentiment: 'Neutral',
          viralityScore: 0,
          appliedTone: tone
        }
      };
    }

    return {
      posts: data.posts,
      meta: {
        ...data.meta,
        status: 'PROCESSED',
        appliedTone: tone
      }
    };
  } catch (error) {
    console.error("Gemini processing error:", error);
    throw error;
  }
};
