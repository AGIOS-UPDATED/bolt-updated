import React, { useState, useRef, useEffect } from 'react';
import { ChatAgent } from '../../lib/agents/ChatAgent';

interface Message {
  text: string;
  sender: 'user' | 'agent';
  data?: any;
  suggestions?: string[];
}

export const CryptoChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAgent = useRef(new ChatAgent(
    process.env.PROVIDER_URL || '',
    process.env.MARKET_API_KEY || ''
  ));

  useEffect(() => {
    // Add welcome message
    setMessages([{
      text: "Hi! I'm your crypto assistant. How can I help you today?",
      sender: 'agent',
      suggestions: [
        'check price of bitcoin',
        'analyze market',
        'help'
      ]
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages(prev => [...prev, {
      text: userMessage,
      sender: 'user'
    }]);

    try {
      const response = await chatAgent.current.processMessage(userMessage);
      
      // Add agent response
      setMessages(prev => [...prev, {
        text: response.message,
        sender: 'agent',
        data: response.data,
        suggestions: response.suggestions
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        text: `Error: ${error.message}`,
        sender: 'agent',
        suggestions: ['Try another command', "Type 'help' for assistance"]
      }]);
    }

    setIsLoading(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto p-4 bg-gray-50 rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3/4 p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              <pre className="whitespace-pre-wrap font-sans">{message.text}</pre>
              
              {message.suggestions && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};
