'use client';

import React from 'react';
import ChatWindow from '@/components/chat/ChatWindow';

export default function PatientChatPage() {
  return (
    <div className="h-[calc(100vh-120px)] w-full">
      <ChatWindow />
    </div>
  );
}
