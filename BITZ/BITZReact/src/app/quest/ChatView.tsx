'use client';

import React, { useState, useRef, useEffect } from 'react';

const API_URL = "https://scaling-space-carnival-qvvrrjxqgrp246pj-5000.app.github.dev"
// const API_URL = "https://oaak.rubengr.es"

interface Message {
  sender: 'YOU' | 'BITZ';
  content: string;
}

interface ChatViewProps {
  isOpen: boolean;
  analysisReply: any;
  onClose: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ isOpen, analysisReply, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{
    sender: 'BITZ',
    content: "What do you have in mind?"
  }]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Initialize empty message history for the API conversation
  const [messageHistory, setMessageHistory] = useState<Array<{role: string, content: string}>>([]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '' || isLoading) return;
    
    // Add user message
    const userMessage: Message = {
      sender: 'YOU',
      content: inputValue
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Don't add the current message to history yet - we'll add both user and AI messages after receiving the response
    // This prevents duplicate messages in history
    
    setInputValue('');
    setIsLoading(true);
    
    // Add a temporary loading message
    setMessages(prev => [...prev, {
      sender: 'BITZ',
      content: 'Thinking...'
    }]);
    
    try {
      // Make API call to the endpoint
      const response = await fetch(API_URL + '/question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.content,
          history: messageHistory, // Send existing history without current message
          analysis_reply: analysisReply
        })
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      // Parse the response as text
      const responseText = await response.text();
      
      // Update the last message with the actual response
      setMessages(prev => prev.map((msg, idx) => 
        idx === prev.length - 1 ? { sender: 'BITZ', content: responseText } : msg
      ));
      
      // Now update the message history with both the user's message and the response
      setMessageHistory(prev => [
        ...prev, 
        {role: 'user', content: userMessage.content},
        {role: 'assistant', content: responseText}
      ]);
    } catch (error) {
      console.error('Error:', error);
      // Update the last message to show the error
      setMessages(prev => prev.map((msg, idx) => 
        idx === prev.length - 1 ? { sender: 'BITZ', content: 'Sorry, there was an error processing your request.' } : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div 
      className={`fixed top-0 left-0 h-full w-full sm:w-80 bg-[#f6f9ec] z-30 transform transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
      style={{ right: 'auto', maxWidth: 'calc(100% - 32px)' }}
    >
      {/* Header */}
      <div className="bg-[#ef5232] py-4 px-4 mr-2 flex justify-between items-center">
        <div className="flex items-center text-white">
          <img 
            src="/icons/arrows_white.svg"
            alt="Arrow"
            className="h-[15px] mr-8" 
          />
          <span className="uppercase">ASK A QUESTION...</span>
        </div>
        <button onClick={onClose} className="text-white text-2xl">
          X
        </button>
      </div>
      
      {/* Messages Container */}
      <div className="flex flex-col h-[calc(100%-128px)] overflow-y-auto p-4">
        {messages.map((message, index) => (
          <div key={index} className="mb-6">
            <div className={`text-sm ${
              message.sender === 'YOU' ? 'text-green-500' : 'text-gray-700'
            }`}>
              {message.sender}
            </div>
            <div className={`mt-1 ${
              message.sender === 'BITZ' ? 'text-gray-800' : 'text-green-700'
            }`}>
              {message.content || (isLoading && index === messages.length - 1 ? '...' : '')}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question..."
            className="flex-grow px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`ml-2 ${isLoading ? 'bg-gray-400' : 'bg-green-800'} text-white px-4 py-2`}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;