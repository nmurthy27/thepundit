
export type Tone = 'Authoritative' | 'Provocative' | 'Controversial' | 'AI Choice';

export interface PlatformPosts {
  linkedin: {
    hook: string;
    body: string;
    kicker: string;
    hashtags: string[];
  };
  twitter: {
    content: string;
    hashtags: string[];
  };
}

export interface User {
  uid: string;
  name: string;
  email: string;
  provider: 'google' | 'linkedin' | 'twitter' | 'email';
  avatar?: string;
}

export interface MetaData {
  sourceTopic: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  viralityScore: number;
  status: 'PROCESSED' | 'SKIP';
  appliedTone?: Tone;
}

export interface ProcessingResult {
  posts: PlatformPosts | null;
  meta: MetaData;
}

export interface FeedSource {
  id: string;
  url: string;
  name: string;
  active: boolean;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  displayUrl?: string;
  sourceName: string;
  publishedDate: string;
  matchedKeywords: string[];
  processingStatus: 'IDLE' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  result?: ProcessingResult;
}

export interface OnboardingData {
  suggestedSources: { name: string; url: string }[];
  suggestedKeywords: string[];
  suggestedCompanies: string[];
  analysis: string;
}

export enum AppView {
  LOGIN = 'LOGIN',
  ONBOARDING = 'ONBOARDING',
  INBOX = 'INBOX',
  ARCHIVE = 'ARCHIVE',
  SOURCES = 'SOURCES',
  KEYWORDS = 'KEYWORDS',
  COMPANIES = 'COMPANIES',
  POSTS = 'POSTS',
  INSTANT_REVIEW = 'INSTANT_REVIEW'
}

export enum ProcessingPhase {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYSIS = 'ANALYSIS',
  OPINION = 'OPINION',
  DRAFTING = 'DRAFTING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}
