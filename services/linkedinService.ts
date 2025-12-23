
/**
 * LinkedIn API Integration Service
 * 
 * Strategy:
 * 1. Intent Sharing (Primary): Uses a specific LinkedIn URL to open the "Create Post" 
 *    modal pre-filled with the draft text. No API key required.
 * 2. Native API (Optional): Full OAuth flow for background posting. 
 *    Requires client_id and client_secret.
 */

// Placeholder values - User must replace these in their LinkedIn Dev Portal to use Native Posting
// Fix: Use explicit string type to prevent TypeScript from narrowing this to a literal type,
// which causes the "isLinkedInConfigured" check to be evaluated as unreachable code.
const CLIENT_ID: string = 'YOUR_LINKEDIN_CLIENT_ID';
const CLIENT_SECRET: string = 'YOUR_LINKEDIN_CLIENT_SECRET';
const REDIRECT_URI = window.location.origin;

export interface LinkedInProfile {
  id: string;
  name: string;
  avatar?: string;
}

/**
 * Returns true if the client ID has been configured by the user.
 */
export const isLinkedInConfigured = () => {
  // Use CLIENT_ID which is now explicitly typed as string
  return CLIENT_ID !== 'YOUR_LINKEDIN_CLIENT_ID' && CLIENT_ID.length > 5;
};

/**
 * Best method for browser-based sharing: 
 * Opens the LinkedIn feed with the share box pre-filled with text.
 */
export const getLinkedInIntentUrl = (text: string) => {
  // LinkedIn Intent for pre-filling the post body
  // Note: LinkedIn sometimes restricts this, but it's the most reliable non-API way.
  return `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`;
};

/**
 * Legacy share URL (Only shares the URL, does not pre-fill body)
 */
export const getLinkedInLegacyShareUrl = (articleUrl: string) => {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(articleUrl)}`;
};

/**
 * OAuth Authorization URL
 */
export const getLinkedInAuthUrl = () => {
  const scope = encodeURIComponent('w_member_social openid profile');
  return `https://www.linkedin.com/oauth/v2/authorization?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${scope}`;
};

/**
 * Exchange OAuth Code for Access Token
 * NOTE: This usually fails in browser due to CORS. In production, use a proxy.
 */
export const exchangeCodeForToken = async (code: string) => {
  if (!isLinkedInConfigured()) {
    throw new Error("LinkedIn Client ID not configured.");
  }
  
  // Mocking the exchange for the demo environment
  return {
    access_token: 'MOCK_TOKEN_' + Math.random().toString(36),
    expires_in: 5184000
  };
};

export const fetchLinkedInProfile = async (token: string): Promise<LinkedInProfile> => {
  return {
    id: 'urn:li:person:MOCK_ID',
    name: 'LinkedIn User',
  };
};

export const postToLinkedInNative = async (token: string, personUrn: string, text: string) => {
  console.log('Posting via LinkedIn Native API...', { personUrn });
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  return { success: true, id: 'urn:li:share:' + Math.random().toString(36) };
};
