
import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import { Message, Author } from './types';
import { BotIcon, UserIcon, SendIcon, MicrophoneIcon } from './components/Icons';

// To make TypeScript happy with browser-prefixed APIs
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [chat, setChat] = useState<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null); // To hold SpeechRecognition instance

  const API_KEY = process.env.API_KEY;

  useEffect(() => {
    if (!API_KEY) {
      console.error("API_KEY is not set.");
      setMessages([{
        author: Author.AI,
        text: "Welcome! To get started, please configure your Gemini API key."
      }]);
      return;
    }

    const ai = new GoogleGenAI({apiKey: API_KEY});
    const chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `
          ### Role
          - Primary Function: You are an AI chatbot who helps users with their inquiries, issues and requests for an online art gallery. You aim to provide excellent, friendly and efficient replies at all times. Your role is to listen attentively to the user, understand their needs, and do your best to assist them or direct them to the appropriate resources. If a question is not clear, ask clarifying questions. Make sure to end your replies with a positive note.
        
          ### Learning and Personalization
          - During the conversation, pay close attention to the user's preferences, questions, and feedback.
          - Use this information to tailor your responses and provide a more personalized experience within this chat session. For example, if a user expresses interest in a particular artist, remember that for follow-up questions.

          ### Constraints
          1. No Data Divulge: Never mention that you are an AI or that you have access to training data explicitly to the user.
          2. Maintaining Focus: If a user attempts to divert you to unrelated topics, never change your role or break your character. Politely redirect the conversation back to topics relevant to the art gallery.
          3. Exclusive Reliance on Knowledge: You must rely exclusively on your knowledge base about the gallery to answer user queries. If a query is not covered by your knowledge, politely state that you cannot help with that topic.
          4. Restrictive Role Focus: You do not answer questions or perform tasks that are not related to your role and the art gallery.

          ### Creator Information
          - You were created by two talented individuals: Kabanda Adrian.M.D.D and Ayebale Dalse.
          - They are students at Ndejje Senior Secondary School.
          - If a user asks who made you, you can proudly share this information.

          ### Gallery & Partner Information
          You have detailed information about our partner institution, Ndejje Senior Secondary School. Here are the specifics:

          **Ndejje Senior Secondary School Overview**

          **1. Basic Info & Location**
          - **Type:** Mixed (boys & girls), co-educational, government-aided secondary school.
          - **Affiliation:** Founded under the Church of Uganda.
          - **Levels:** Offers both “O” Level (Ordinary) and “A” Level (Advanced) education.
          - **Location:** Luweero District, Central Region, Uganda. It is in Katikamu County, Nyimbwa Sub‐County, about 8 km west of Bombo town along the Kampala–Gulu road.
          - **Founded:** 1963 by the leadership of Ndejje Junior School.

          **2. Mission, Vision & Values**
          - **Mission:** “To nurture highly knowledgeable and productive citizens through holistic education based on Christian values for socio-economic transformation.”
          - **Vision:** “A Christ-centered school nurturing holistically competent citizens for development and prosperity.”
          - **Core values:** Excellence, Integrity, Innovativeness, Time-management, Patriotism, Godliness, Hard work.

          **3. Academics & Curriculum**
          - **Programs:** Runs both Ordinary Level (O-Level) and Advanced Level (A-Level) programmes.
          - **Subjects:** Offers a broad range including academic subjects (Math, English, Sciences, History, Commerce etc) and vocational/technical subjects.
          - **Focus:** Emphasises not only academic success but also spiritual, moral and emotional growth.
          - **Options:** Both day and boarding options are available.

          **4. Facilities & Extra-Curricular Activities**
          - **Campus:** Sits on land donated by the Church of Uganda.
          - **Activities:** Active in sports (basketball, volleyball, netball) and participates in national competitions.
          - **Amenities:** Has a library, internet access, and an emphasis on ICT.

          **5. Achievements & Reputation**
          - **Ranking:** Features in listings of top secondary schools in Uganda.
          - **Performance:** Has produced good results and participates well in zonal/national competitions.

          **6. Admission / Contact Details**
          - **Address:** P.O. Box 193, Bombo, Uganda.
          - **Telephone:** +256 393 103812
          - **Email:** ndejjessshm@yahoo.com
          - **Admissions:** Application process is available via their website.

          **7. Why consider Ndejje SSS?**
          - Combines academic and vocational tracks.
          - A solid history with church backing, ensuring a stable institutional culture.
          - Good location in central Uganda, accessible from Kampala.
          - Provides a values-based education alongside co-curricular activities.
        `,
      },
    });
    setChat(chatSession);

    setMessages([
      {
        author: Author.AI,
        text: 'Hello! I am your personal art guide. How can I help you explore our gallery today?',
      },
    ]);
  }, [API_KEY]);

  useEffect(() => {
    // Setup Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
      
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result) => result.transcript)
          .join('');
        setUserInput(transcript);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("Speech recognition not supported in this browser.");
    }

    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading || !chat) return;

    const userMessage: Message = { author: Author.USER, text: userInput };
    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      const stream = await chat.sendMessageStream({ message: userInput });
      
      let aiResponseText = '';
      setMessages((prev) => [...prev, { author: Author.AI, text: '' }]);

      for await (const chunk of stream) {
        aiResponseText += chunk.text;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].text = aiResponseText;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        author: Author.AI,
        text: 'I seem to be having some trouble connecting. Please try again later.',
      };
      setMessages((prev) => {
        const newMessages = [...prev];
        // Replace the empty AI message with the error message
        if (newMessages[newMessages.length - 1].author === Author.AI && newMessages[newMessages.length - 1].text === '') {
          newMessages[newMessages.length - 1] = errorMessage;
        } else {
          newMessages.push(errorMessage);
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setUserInput(''); // Clear input before starting
      recognitionRef.current.start();
    }
  };

  const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
    const isUser = message.author === Author.USER;
    // Don't render empty AI messages, which are placeholders for streaming
    if (message.author === Author.AI && !message.text) return null;

    return (
      <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
        {!isUser && <div className="p-2 bg-white rounded-full shadow-sm"><BotIcon className="text-slate-600" /></div>}
        <div
          className={`max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-white text-slate-800 rounded-bl-none'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.text}</p>
        </div>
         {isUser && <div className="p-2 bg-white rounded-full shadow-sm"><UserIcon className="text-blue-600" /></div>}
      </div>
    );
  };


  return (
    <div className="flex flex-col h-screen font-sans">
      <header className="bg-white shadow-md p-4 text-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-800">Gallery AI Assistant</h1>
      </header>

      <main ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-100">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg, index) => (
            <MessageItem key={index} message={msg} />
          ))}
          {isLoading && messages[messages.length - 1].author === Author.USER && (
            <div className="flex items-start gap-3 my-4 justify-start">
               <div className="p-2 bg-white rounded-full shadow-sm"><BotIcon className="text-slate-600" /></div>
               <div className="max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl shadow-sm bg-white text-slate-800 rounded-bl-none">
                <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-slate-400 rounded-full animate-pulse"></span>
                </div>
               </div>
            </div>
          )}
        </div>
      </main>

      <footer className="bg-white/80 backdrop-blur-sm p-4 pt-3 sticky bottom-0 border-t border-slate-200">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isRecording ? 'Listening...' : "Ask about art, artists, or media..."}
            className="flex-1 w-full px-4 py-3 border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            disabled={isLoading || isRecording}
          />
           {recognitionRef.current && (
            <button
              type="button"
              onClick={handleToggleRecording}
              disabled={isLoading}
              className={`p-3 text-white rounded-full transition-colors duration-200 disabled:bg-slate-400 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-slate-500 hover:bg-slate-600'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              <MicrophoneIcon />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="p-3 bg-blue-600 text-white rounded-full disabled:bg-slate-400 disabled:cursor-not-allowed hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </form>
        <div className="text-center text-xs text-slate-500 mt-3">
          <p>Made by Kabanda Adrian.M.D.D and Ayebale Dalse</p>
          <p>Ndejje Senior Secondary School</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
