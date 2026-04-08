import type { Brand } from '@/shared/types/brand';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface AssistantSendInput {
  message: string;
  brand?: Brand;
  history: AssistantMessage[];
}

export interface AssistantReply {
  content: string;
  /** Suggested actions the user can click on */
  actions?: Array<{ label: string; href?: string }>;
}

export interface AssistantProvider {
  name: string;
  send: (input: AssistantSendInput) => Promise<AssistantReply>;
}
