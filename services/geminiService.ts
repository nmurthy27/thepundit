
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { ProcessingResult, OnboardingData, Tone, NewsArticle } from "../types";

export const analyzeProfession = async (profession: string): Promise<OnboardingData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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

/**
 * Performs a real-time search for industry news using Google Search grounding.
 */
export const searchIndustryNews = async (keywords: string[], sources: { name: string, url: string }[]): Promise<Partial<NewsArticle>[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const sourceList = sources.map(s => s.name).join(", ");
  const keywordList = keywords.join(", ");
  
  const prompt = `
    Search for the latest industry news (last 7-14 days) related to these keywords: ${keywordList}.
    CRITICAL: Only provide articles from these specific sources: ${sourceList}.
    
    For each unique article found, you must provide:
    1. The EXACT original headline as it appears on the source website.
    2. A 2-sentence summary of the core news.
    3. The direct, canonical URL to the article.
    4. The name of the publication.
    5. A list of which keywords from the input were matched.

    Return exactly 8-10 of the most relevant results.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              link: { type: Type.STRING },
              sourceName: { type: Type.STRING },
              matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["title", "summary", "link", "sourceName", "matchedKeywords"]
          }
        }
      }
    });

    const results = JSON.parse(response.text || '[]');
    return results;
  } catch (error) {
    console.error("News search error:", error);
    return [];
  }
};

export const processNewsItem = async (input: string, keywords: string[], articleUrl: string, tone: Tone): Promise<ProcessingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: input,
      config: {
        systemInstruction: SYSTEM_PROMPT(keywords, articleUrl, tone),
        tools: [{ googleSearch: {} }],
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

export const processUrlInstant = async (url: string, keywords: string[], tone: Tone): Promise<ProcessingResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze the following URL for industry news: ${url}.
    
    If the URL is valid and contains industry-related content, generate high-impact social media posts.
    Use the following keywords as context for the brand voice: ${keywords.join(', ')}.
    
    If the link is unreachable or irrelevant, you must still attempt to generate a post based on the URL structure or general industry knowledge, or return "status": "SKIP".
    
    HEALINE RULE: Extract or guess the title from the URL or content.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT(keywords, url, tone),
        tools: [{ googleSearch: {} }],
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
    return {
      posts: data.posts || null,
      meta: {
        ...data.meta,
        status: data.status || 'PROCESSED',
        appliedTone: tone
      }
    };
  } catch (error) {
    console.error("Instant URL processing error:", error);
    throw error;
  }
};
