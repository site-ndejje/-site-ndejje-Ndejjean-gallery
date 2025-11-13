
export enum Author {
  USER = 'user',
  AI = 'ai',
}

export interface Message {
  author: Author;
  text: string;
}
