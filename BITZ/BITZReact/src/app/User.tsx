import { v4 as uuidv4 } from 'uuid';

// Function to get or initialize IDs
const initializeUserId = () => {
  let userId = localStorage.getItem('user_id');
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem('user_id', userId);
  }
  
  return userId;
};

const newConversationId = () => {
  let conversationId = uuidv4();
  localStorage.setItem('conversation_id', conversationId);  
  return conversationId;
};

// Export both the variable and the function
export const userId = initializeUserId();
export const conversationId = newConversationId();
export const makeNewConversationId = newConversationId;