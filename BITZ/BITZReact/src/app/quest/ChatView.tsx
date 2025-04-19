'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Message {
  sender: 'YOU' | 'BITZ';
  content: string;
}

interface ChatViewProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatView: React.FC<ChatViewProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([{
    sender: 'BITZ',
    content: "What do you want to know?"
  }]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Sample responses from BITZ
  const sampleResponses = [
    "It attracts bees, butterflies, spiders, beetles, worms.",
    "Bees and butterflies.",
    "They're attracted to the fungi's moisture and nutrients.",
    "The relationship is symbiotic - insects help spread spores."
  ];
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (inputValue.trim() === '') return;
    
    // Add user message
    const userMessage: Message = {
      sender: 'YOU',
      content: inputValue
    };
    
    setMessages([...messages, userMessage]);
    setInputValue('');
    
    // Simulate BITZ response after a short delay
    setTimeout(() => {
      const randomResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
      const bitzMessage: Message = {
        sender: 'BITZ',
        content: randomResponse
      };
      
      setMessages(prev => [...prev, bitzMessage]);
    }, 1000);
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
              {message.content}
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
          />
          <button
            type="submit"
            className="ml-2 bg-green-800 text-white px-4 py-2"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;