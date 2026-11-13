import React from 'react';
import { ChatProvider } from './context/ChatContext';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { StatusBar } from './components/StatusBar';
import { RecordButton } from './components/RecordButton';
import { TextInput } from './components/TextInput';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  return (
    <ChatProvider>
      <div className="flex flex-col h-dvh w-screen bg-neutral-950 text-neutral-100 overflow-hidden">
        {/* Navigation Bar */}
        <Header />

        {/* Conversation View */}
        <main className="flex-1 flex flex-col min-h-0 relative">
          <ChatWindow />
        </main>

        {/* Bottom Interaction Console */}
        <footer className="bg-neutral-900/90 px-4 sm:px-6 py-4">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
            <StatusBar />

            {/* Voice Input Trigger */}
            <div className="py-1">
              <RecordButton />
            </div>

            {/* Text Input Fallback */}
            <div className="w-full">
              <TextInput />
            </div>
          </div>
        </footer>

        {/* Auth Modal */}
        <AuthModal />
      </div>
    </ChatProvider>
  );
};

export default App;
