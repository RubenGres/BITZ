'use client';

import React, { useState, useRef, useEffect } from 'react';
import { API_URL } from '../Constants';
import ReactMarkdown from 'react-markdown';
import './ChatView.css';

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
  
  // Function to render message content with markdown support
  const renderMessageContent = (content: string, sender: string) => {
    if (sender === 'BITZ') {
      return (
        <div className="markdown-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      );
    } else {
      // For user messages, just display the plain text
      return <div>{content}</div>;
    }
  };

  // Loading animation component
  const LoadingDots = () => (
    <div className="loading-animation">
      <span>.</span><span>.</span><span>.</span>
    </div>
  );
  
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
          <span className="uppercase font-bold tracking-wider">ASK A QUESTION...</span>
        </div>
        <button onClick={onClose} className="text-white text-2xl hover:bg-[#d64a2d] p-1 rounded transition-colors">
          X
        </button>
      </div>
      
      {/* Messages Container */}
      <div className="flex flex-col h-[calc(100%-128px)] overflow-y-auto p-4 bg-[#f6f9ec]">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`mb-6 p-3 rounded-lg shadow-sm ${
              message.sender === 'YOU' 
              ? 'bg-[#e1f5e1] border-l-4 border-green-500 ml-8' 
              : 'bg-white border-l-4 border-[#ef5232] mr-8'
            } transition-all duration-300 ease-in-out hover:shadow-md`}
          >
            <div className={`text-sm font-bold mb-2 ${
              message.sender === 'YOU' ? 'text-green-600' : 'text-[#ef5232]'
            }`}>
              {message.sender}
            </div>
            <div className={`${
              message.sender === 'BITZ' ? 'text-gray-800' : 'text-green-800 font-medium'
            }`}>
              {isLoading && index === messages.length - 1 
                ? <LoadingDots /> 
                : renderMessageContent(message.content, message.sender)
              }
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-white p-4 shadow-lg border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your question..."
            className="flex-grow px-4 py-3 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            className={`px-6 py-3 rounded-r-lg transition-colors duration-200 font-medium ${
              isLoading 
              ? 'bg-gray-400 text-gray-100' 
              : 'bg-green-700 text-white hover:bg-green-800'
            }`}
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