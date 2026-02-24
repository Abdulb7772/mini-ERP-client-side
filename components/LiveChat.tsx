"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import axiosInstance from "@/services/axios";
import {
  initializeSocket,
  joinChat,
  leaveChat,
  sendMessage as socketSendMessage,
  startTyping,
  stopTyping,
  markMessagesAsRead,
  onNewMessage,
  onTypingUpdate,
  onMessagesRead,
  offNewMessage,
  offTypingUpdate,
  offMessagesRead,
  disconnectSocket,
  onChatUpdated,
  offChatUpdated,
} from "@/services/socketService";
import AttachmentSelector from "./AttachmentSelector";
import AttachmentDetailsModal from "./AttachmentDetailsModal";

interface Chat {
  _id: string;
  type: string;
  participants: Array<{ _id: string; name: string; email: string }>;
  contextType?: string;
  contextId?: any;
  lastMessage?: string;
  lastMessageAt?: string;
}

interface Message {
  _id: string;
  chatId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  text: string;
  attachments: string[];
  contextType?: string;
  contextId?: any;
  status: string;
  readBy: string[];
  createdAt: string;
}

interface LiveChatProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string; // Optional: for order-specific chat
}

export default function LiveChat({ isOpen, onClose, orderId }: LiveChatProps) {
  const { data: session } = useSession();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [contextType, setContextType] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [attachmentSelectorOpen, setAttachmentSelectorOpen] = useState(false);
  const [detailsModal, setDetailsModal] = useState<{ isOpen: boolean; type: string; data: any }>({
    isOpen: false,
    type: 'order',
    data: null
  });
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [messageInfoModal, setMessageInfoModal] = useState<{ isOpen: boolean; message: Message | null }>({
    isOpen: false,
    message: null
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket.IO
  useEffect(() => {
    if (session?.user?.accessToken && isOpen) {
      const socket = initializeSocket(session.user.accessToken);

      // Set up socket listeners
      onNewMessage((data: { chatId: string; message: Message }) => {
        if (data.chatId === chat?._id) {
          setMessages((prev) => [...prev, data.message]);
          markMessagesAsRead(data.chatId);
        }
      });

      onTypingUpdate((data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => {
        if (data.chatId === chat?._id && data.userId !== session.user.id) {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            if (data.isTyping) {
              newSet.add(data.userName);
            } else {
              newSet.delete(data.userName);
            }
            return newSet;
          });
        }
      });

      onMessagesRead((data: { chatId: string; userId: string }) => {
        if (data.chatId === chat?._id) {
          setMessages((prev) =>
            prev.map((msg) => ({
              ...msg,
              status: msg.senderId === session.user.id ? "seen" : msg.status,
            }))
          );
        }
      });

      onChatUpdated(() => {
        // Refresh chat if needed
      });

      return () => {
        offNewMessage();
        offTypingUpdate();
        offMessagesRead();
        offChatUpdated();
        if (!isOpen) {
          disconnectSocket();
        }
      };
    }
  }, [session, isOpen, chat]);

  // Load or create support chat
  useEffect(() => {
    if (isOpen && session?.user?.accessToken) {
      loadSupportChat();
    }
  }, [isOpen, session, orderId]);

  const loadSupportChat = async () => {
    setLoading(true);
    try {
      // Try to get existing chat
      const response = await axiosInstance.get("/chats", {
        params: { type: "external" },
      });

      let existingChat = null;
      if (orderId) {
        // Find chat for specific order
        existingChat = response.data.data?.find(
          (c: Chat) => c.contextType === "order" && c.contextId?._id === orderId
        );
      } else {
        // Find general support chat
        existingChat = response.data.data?.find(
          (c: Chat) => c.contextType === "general"
        );
      }

      if (existingChat) {
        setChat(existingChat);
        setInitialMessageSent(true);
        loadChatMessages(existingChat._id);
      }
    } catch (error: any) {
      console.error("Error loading support chat:", JSON.stringify(error, null, 2));
      console.error("Error details:", {
        message: error?.message || 'Unknown error',
        status: error?.status,
        success: error?.success
      });
    } finally {
      setLoading(false);
    }
  };

  const loadChatMessages = async (chatId: string) => {
    try {
      joinChat(chatId);
      const response = await axiosInstance.get(`/chats/${chatId}/messages`);
      setMessages(response.data.data.messages || []);
      await axiosInstance.patch(`/chats/${chatId}/read`);
      markMessagesAsRead(chatId);
    } catch (error: any) {
      console.error("Error loading messages:", JSON.stringify(error, null, 2));
      console.error("Error details:", {
        message: error?.message || 'Unknown error',
        status: error?.status,
        success: error?.success
      });
    }
  };

  const handleStartChat = async () => {
    if (!messageText.trim()) return;

    setLoading(true);
    try {
      const requestData: any = {
        message: messageText,
      };

      // Add context if available
      if (contextType && contextId) {
        requestData.contextType = contextType;
        requestData.contextId = contextId;
      } else if (orderId) {
        requestData.orderId = orderId;
      }

      const response = await axiosInstance.post("/chats/support", requestData);

      const newChat = response.data.data;
      setChat(newChat);
      setInitialMessageSent(true);
      setMessageText("");
      setContextType(null);
      setContextId(null);

      // Load messages
      loadChatMessages(newChat._id);
    } catch (error: any) {
      console.error("Error starting chat:", JSON.stringify(error, null, 2));
      console.error("Error details:", {
        message: error?.message || 'Unknown error',
        status: error?.status,
        success: error?.success
      });
      alert("Failed to start chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !chat) return;

    const text = messageText;
    const attachData: any = {};
    
    // Include context if it was set
    if (contextType && contextId) {
      attachData.contextType = contextType;
      attachData.contextId = contextId;
    }
    
    setMessageText("");
    setContextType(null);
    setContextId(null);

    // Stop typing indicator
    stopTyping(chat._id);

    // Send via Socket.IO
    socketSendMessage({
      chatId: chat._id,
      text,
      ...attachData,
    });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    if (!chat) return;

    // Start typing indicator
    startTyping(chat._id);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(chat._id);
    }, 2000);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Leave chat on unmount
  useEffect(() => {
    return () => {
      if (chat) {
        leaveChat(chat._id);
      }
    };
  }, [chat]);

  const handleAttachmentSelect = (id: string) => {
    setContextType("order");
    setContextId(id);
    setShowAttachMenu(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    try {
      await axiosInstance.delete(`/chats/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      setOpenDropdownId(null);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  };

  const handleShowMessageInfo = (message: Message) => {
    setMessageInfoModal({ isOpen: true, message });
    setOpenDropdownId(null);
  };

  const handleNewChat = () => {
    // Clear current chat and start fresh
    if (chat) {
      leaveChat(chat._id);
    }
    setChat(null);
    setMessages([]);
    setMessageText("");
    setInitialMessageSent(false);
    setContextType(null);
    setContextId(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/40 p-4 pt-24">
      <div className="bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-2xl shadow-2xl flex flex-col h-[600px] w-full max-w-lg overflow-hidden border border-white/50">
        {/* Header */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">Live Support</h3>
              <p className="text-xs text-white/80 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                We're here to help!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chat && initialMessageSent && (
              <button
                onClick={handleNewChat}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200 flex items-center gap-1 text-sm"
                title="Start new chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">New</span>
              </button>
            )}
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg transition-all duration-200 hover:rotate-90">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-white to-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : !initialMessageSent ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-6xl mb-6">👋</div>
                <h4 className="font-bold text-2xl text-gray-800 mb-3">Welcome to Support</h4>
                <p className="text-gray-600 mb-4 px-4">
                  {orderId ? "Ask about your order" : "How can we help you today?"}
                </p>
                <div className="inline-flex px-4 py-2 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-700 font-semibold">✨ Type a message to start chatting</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.senderId === session?.user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  <div className="relative group">
                    <div
                      className={`min-w-[200px] max-w-[80%] rounded-2xl p-4 shadow-md break-words ${
                        message.senderId === session?.user?.id
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      {message.senderId !== session?.user?.id && (
                        <p className="text-xs font-bold mb-2 text-blue-600 flex items-center gap-2">
                          <span className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs">👥</span>
                          <span className="break-words">{message.senderName}</span>
                        </p>
                      )}
                      <p className="text-sm break-words">{message.text}</p>
                      {message.contextType && message.contextId && (
                        <div 
                          className={`mt-2 p-2 rounded-lg border cursor-pointer hover:opacity-80 transition ${
                            message.senderId === session?.user?.id
                              ? "bg-blue-400 border-blue-300"
                              : "bg-gray-100 border-gray-300"
                          }`}
                          onClick={() => setDetailsModal({ 
                            isOpen: true, 
                            type: message.contextType!, 
                            data: message.contextId 
                          })}
                        >
                          <p className="text-xs font-semibold flex items-center gap-1">
                            📎 Attached {message.contextType}
                          </p>
                          <p className="text-xs mt-1">
                            {message.contextType === "order" && `Order #${message.contextId?.orderNumber || message.contextId}`}
                            {message.contextType === "product" && `${message.contextId?.name || message.contextId}`}
                            {message.contextType === "customer" && `${message.contextId?.name || message.contextId}`}
                          </p>
                        </div>
                      )}
                      <p className="text-xs mt-1 opacity-70">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {message.senderId === session?.user?.id && (
                          <span className="ml-2">
                            {message.status === "seen" ? "✓✓" : message.status === "delivered" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </p>
                    </div>
                    
                    {/* Dropdown button */}
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === message._id ? null : message._id)}
                      className="absolute top-2 right-[-30px] opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-200"
                      title="Message options"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>

                    {/* Dropdown menu */}
                    {openDropdownId === message._id && (
                      <div
                        ref={dropdownRef}
                        className={`absolute top-10 ${
                          message.senderId === session?.user?.id ? "left-[-30px]" : "right-[-30px]"
                        } bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[150px] z-50`}
                      >
                        <button
                          onClick={() => handleShowMessageInfo(message)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 text-gray-700"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Info
                        </button>
                        {message.senderId === session?.user?.id && (
                          <button
                            onClick={() => handleDeleteMessage(message._id)}
                            className="w-full text-left px-4 py-2 hover:bg-red-50 text-sm flex items-center gap-2 text-red-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-200">
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: "0ms"}}></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: "150ms"}}></span>
                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: "300ms"}}></span>
                      </span>
                      Support is typing...
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="p-5 border-t border-gray-200 bg-gradient-to-r from-white to-gray-50">
          {contextType && (
            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                📎 Attached: {contextType}
              </span>
              <button
                onClick={() => {
                  setContextType(null);
                  setContextId(null);
                }}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Attach order"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              {showAttachMenu && (
                <div className="absolute bottom-full mb-2 left-0 bg-white border rounded-lg shadow-lg py-2 min-w-[180px] z-10">
                  <button
                    onClick={() => {
                      setAttachmentSelectorOpen(true);
                      setShowAttachMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm flex items-center gap-2 text-gray-900"
                  >
                    <span>📦</span> Attach Order
                  </button>
                  {orderId && (
                    <div className="px-4 py-1 text-xs text-gray-500">
                      Current order already selected
                    </div>
                  )}
                </div>
              )}
            </div>
            <input
              type="text"
              value={messageText}
              onChange={handleTyping}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  initialMessageSent ? handleSendMessage() : handleStartChat();
                }
              }}
              placeholder={initialMessageSent ? "Type a message..." : "Start typing to begin chat..."}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-gray-900 placeholder-gray-400"
            />
            <button
              onClick={initialMessageSent ? handleSendMessage : handleStartChat}
              disabled={!messageText.trim() || loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg px-8 py-3 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-bold shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span className="flex items-center gap-2">
                {loading ? (
                  <><span className="animate-spin">⌛</span> Sending...</>
                ) : (
                  <>
                    <span>Send</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Attachment Selector Modal */}
      <AttachmentSelector
        isOpen={attachmentSelectorOpen}
        onClose={() => setAttachmentSelectorOpen(false)}
        onSelect={handleAttachmentSelect}
      />
      
      {/* Attachment Details Modal */}
      <AttachmentDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ ...detailsModal, isOpen: false })}
        type={detailsModal.type as "order" | "product" | "customer"}
        data={detailsModal.data}
      />
      
      {/* Message Info Modal */}
      {messageInfoModal.isOpen && messageInfoModal.message && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Message Info</h3>
              <button
                onClick={() => setMessageInfoModal({ isOpen: false, message: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="border-b pb-3">
                <p className="text-sm text-gray-500 mb-1">Message</p>
                <p className="text-gray-900">{messageInfoModal.message.text}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Sender</p>
                  <p className="text-gray-900 font-medium">{messageInfoModal.message.senderName}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-1">Status</p>
                  <p className="text-gray-900 font-medium capitalize">
                    {messageInfoModal.message.status === "seen" ? (
                      <span className="flex items-center gap-1 text-blue-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        Seen
                      </span>
                    ) : messageInfoModal.message.status === "delivered" ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        Delivered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Sent
                      </span>
                    )}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500 mb-1">Sent at</p>
                <p className="text-gray-900">
                  {new Date(messageInfoModal.message.createdAt).toLocaleString()}
                </p>
              </div>
              
              {messageInfoModal.message.readBy && messageInfoModal.message.readBy.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Read by</p>
                  <p className="text-gray-900">{messageInfoModal.message.readBy.length} participant(s)</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
