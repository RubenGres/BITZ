'use client';

import { v4 as uuidv4 } from 'uuid';

// Browser check helper
const isBrowser = typeof window !== 'undefined';

// Plain functions for use outside components
export const getUserId = () => {
  if (!isBrowser) return null;
  
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('user_id', userId);
  }
  return userId;
};

export const getConversationId = () => {
  if (!isBrowser) return null;
  
  const conversationId = localStorage.getItem('conversation_id');
  return conversationId;
};

export const createNewConversationId = () => {
  if (!isBrowser) return null;
  
  const conversationId = uuidv4();
  localStorage.setItem('conversation_id', conversationId);
  return conversationId;
};

// Initialize on first import (client-side only)
let userId = null;
let conversationId = null;

// Only run this code on the client side
if (isBrowser) {
  // Get or create user ID
  userId = getUserId();
}

export { userId, conversationId };

// React component hooks (only use these inside React components)
import { useState, useEffect } from 'react';

export function UserIdComponent({ children }) {
  const [id, setId] = useState(null);
  
  useEffect(() => {
    setId(getUserId());
  }, []);
  
  return children(id);
}
