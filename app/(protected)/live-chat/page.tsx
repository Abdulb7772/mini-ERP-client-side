"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import socketService from "@/services/socketService";
import axiosInstance from "@/services/axios";
import toast from "react-hot-toast";
import AttachmentSelector from "@/components/AttachmentSelector";
import AttachmentDetailsModal from "@/components/AttachmentDetailsModal";
import { confirmToast } from "@/utils/confirmToast";

interface Message {
  _id: string;
  chatId: string;
  senderId: {
    _id: string;
    name: string;
    email: string;
  };
  senderName?: string;
  message: string;
  text?: string;
  attachmentType?: "order" | "product" | "customer";
  attachmentId?: string;
  contextType?: "order" | "product" | "customer";
  contextId?: any;
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

interface Chat {
  _id: string;
  participants: Array<{
    _id: string;
    name: string;
    email: string;
    role: string;
  }>;
  lastMessage?: {
    message: string;
    createdAt: string;
  };
  unreadCount?: number;
  myUnreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function LiveChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [messageInfoModal, setMessageInfoModal] = useState<{ isOpen: boolean; message: Message | null }>({
    isOpen: false,
    message: null
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string[] }>({});
  const [showAttachmentSelector, setShowAttachmentSelector] = useState(false);
  const [showAttachmentDetails, setShowAttachmentDetails] = useState(false);
  const [selectedAttachmentType, setSelectedAttachmentType] = useState<"order" | "product" | "customer" | null>(null);
  const [selectedAttachmentId, setSelectedAttachmentId] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<{ type: "order" | "product" | "customer"; id: string; orderNumber?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);

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
  const selectedChatRef = useRef<Chat | null>(null);

  const getChatLabel = (chatId?: string) => {
    if (!chatId) return "Chat";
    return `Chat ${chatId.slice(-6)}`;
  };

  const dedupeMessages = (items: Message[]) => {
    const sorted = [...items].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const seen = new Set<string>();

    return sorted.filter((message, index) => {
      const messageId = typeof message._id === "string" ? message._id : "";
      const uniqueKey = messageId && !messageId.startsWith("temp-")
        ? messageId
        : `${messageId}-${message.createdAt}-${index}`;

      if (seen.has(uniqueKey)) {
        return false;
      }

      seen.add(uniqueKey);
      return true;
    });
  };

  const dedupeChats = (items: Chat[]) => {
    const seen = new Set<string>();
    return items.filter((chat) => {
      const chatId = chat?._id;
      if (!chatId || seen.has(chatId)) {
        return false;
      }
      seen.add(chatId);
      return true;
    });
  };

  const getUnreadCount = (chat: Chat) => {
    if (typeof chat?.myUnreadCount === "number") return chat.myUnreadCount;
    if (typeof chat?.unreadCount === "number") return chat.unreadCount;
    return 0;
  };

  const normalizeMessage = (message: any): Message => {
    const sender = message?.senderId;
    const normalizedSender =
      sender && typeof sender === "object"
        ? {
            _id: sender._id || "",
            name: sender.name || message?.senderName || "Support",
            email: sender.email || "",
          }
        : {
            _id: typeof sender === "string" ? sender : "",
            name: message?.senderName || "Support",
            email: "",
          };

    const resolvedBody =
      typeof message?.message === "string" && message.message.trim().length > 0
        ? message.message
        : typeof message?.text === "string"
          ? message.text
          : "";

    return {
      ...message,
      senderId: normalizedSender,
      message: resolvedBody,
      readBy: Array.isArray(message?.readBy) ? message.readBy : [],
      createdAt: message?.createdAt || new Date().toISOString(),
      updatedAt: message?.updatedAt || message?.createdAt || new Date().toISOString(),
    };
  };

  // Keep ref in sync with state
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    if (status === "authenticated" && session?.user?.accessToken && !initializedRef.current) {
      initializedRef.current = true;
      initializeChat();
    }
  }, [status, session?.user?.accessToken, router]);

  useEffect(() => {
    return () => {
      if (initializedRef.current) {
        if (selectedChatRef.current) {
          socketService.leaveChat(selectedChatRef.current._id);
        }
        socketService.disconnect();
        initializedRef.current = false;
      }
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      scrollToBottom();
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom < 120) {
      scrollToBottom();
    }
  }, [messages]);

  const initializeChat = async () => {
    try {
      // Initialize socket connection
      socketService.initialize(session?.user?.accessToken || "");

      // Set up socket listeners
      socketService.onNewMessage((data: { chatId: string; message: Message }) => {
        const incomingMessage = normalizeMessage(data.message);
        const currentChat = selectedChatRef.current;
        if (currentChat && data.chatId === currentChat._id) {
          setMessages((prev) => {
            // Ensure prev is always an array and avoid duplicates
            const prevArray = Array.isArray(prev) ? prev : [];
            // Check if message already exists by ID
            const exists = prevArray.some(msg => msg._id === incomingMessage._id);
            if (exists) return prevArray;
            // Replace optimistic message if this is from the same sender around the same time
            const filtered = prevArray.filter(msg => {
              if (!msg._id.startsWith('temp-')) return true;
              // Remove temp message if it's from us and within 2 seconds
              const msgTime = new Date(msg.createdAt).getTime();
              const newMsgTime = new Date(incomingMessage.createdAt).getTime();
              const isSameSender = msg.senderId._id === incomingMessage.senderId._id;
              return !(isSameSender && Math.abs(newMsgTime - msgTime) < 2000);
            });
            return dedupeMessages([...filtered, incomingMessage]);
          });
          socketService.markAsRead(currentChat._id);
          setChats((prev) =>
            prev.map((chat) =>
              chat._id === currentChat._id
                ? { ...chat, unreadCount: 0, myUnreadCount: 0 }
                : chat
            )
          );
        } else {
          setChats((prev) =>
            prev.map((chat) =>
              chat._id === data.chatId
                ? {
                    ...chat,
                    unreadCount: getUnreadCount(chat) + 1,
                    myUnreadCount: getUnreadCount(chat) + 1,
                  }
                : chat
            )
          );
        }
        // Update chat list to reflect new message (don't refetch if it's our own message)
        if (incomingMessage.senderId._id !== session?.user?.id) {
          fetchChats();
        }
      });

      socketService.onTyping((data) => {
        if (data.userId !== session?.user?.id && data.isTyping) {
          setTypingUsers((prev) => ({
            ...prev,
            [data.chatId]: [...(prev[data.chatId] || []), data.userName],
          }));
        }
      });

      socketService.onStopTyping((data) => {
        if (!data.isTyping) {
          setTypingUsers((prev) => ({
            ...prev,
            [data.chatId]: (prev[data.chatId] || []).filter(
              (name) => name !== data.userName
            ),
          }));
        }
      });

      socketService.onMessageRead((data) => {
        if (data.chatId === selectedChatRef.current?._id) {
          setMessages((prev) => {
            // Ensure prev is always an array
            const prevArray = Array.isArray(prev) ? prev : [];
            return prevArray.map((msg) =>
              !msg.readBy.includes(data.userId)
                ? { ...msg, readBy: [...msg.readBy, data.userId] }
                : msg
            );
          });
        }
      });

      socketService.onChatUpdate((updatedChatData) => {
        setChats((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [];
          return prevArray.map((chat) => {
            if (chat._id === updatedChatData.chatId) {
              return {
                ...chat,
                lastMessage: {
                  message: updatedChatData.lastMessage,
                  createdAt: updatedChatData.lastMessageAt.toString(),
                },
              };
            }
            return chat;
          });
        });
      });

      // Fetch initial data
      await fetchChats();
    } catch (error) {
      console.error("Error initializing chat:", error);
      toast.error("Failed to connect to chat");
    } finally {
      setLoading(false);
    }
  };

  const fetchChats = async () => {
    try {
      const response = await axiosInstance.get("/chats");
      const chatList = response.data.data;
      // Ensure we always set an array
      let chatsArray = Array.isArray(chatList) ? chatList : [];
      
      // Sort chats by most recent activity
      chatsArray = chatsArray.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.updatedAt;
        const bTime = b.lastMessage?.createdAt || b.updatedAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      const uniqueChats = dedupeChats(chatsArray);
      setChats(uniqueChats);

      // If there's a selected chat, update it with the new data from the fetched chats
      if (selectedChatRef.current) {
        const updatedSelectedChat = uniqueChats.find(c => c._id === selectedChatRef.current?._id);
        if (updatedSelectedChat) {
          setSelectedChat(updatedSelectedChat);
        }
      } else if (!selectedChat && uniqueChats.length > 0) {
        // Auto-select first chat if none selected
        selectChat(uniqueChats[0]);
      }
    } catch (error: any) {
      console.error("Error fetching chats:", error);
      if (error.response?.status !== 404) {
        toast.error("Failed to load chats");
      }
      // Set empty array on error
      setChats([]);
    }
  };

  const selectChat = async (chat: Chat) => {
    try {
      // Leave previous chat
      if (selectedChat) {
        socketService.leaveChat(selectedChat._id);
      }

      setSelectedChat(chat);
      setLoadingMessages(true);

      // Join new chat
      socketService.joinChat(chat._id);

      // Fetch messages
      const response = await axiosInstance.get(`/chats/${chat._id}/messages`);
      const messagesData = response.data.data;
      const messagesArray = Array.isArray(messagesData)
        ? messagesData
        : Array.isArray(messagesData?.messages)
          ? messagesData.messages
          : [];

      setMessages(dedupeMessages(messagesArray.map(normalizeMessage)));

      // Mark as read
      socketService.markAsRead(chat._id);
      setChats((prev) =>
        prev.map((item) =>
          item._id === chat._id
            ? { ...item, unreadCount: 0, myUnreadCount: 0 }
            : item
        )
      );
    } catch (error: any) {
      console.error("Error selecting chat:", error);
      toast.error("Failed to load messages");
      // Set empty array on error
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !pendingAttachment) || !selectedChat || sending) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic UI update - add message immediately
    const optimisticMessage: Message = {
      _id: tempId,
      chatId: selectedChat._id,
      senderId: {
        _id: session?.user?.id || "",
        name: session?.user?.name || "You",
        email: session?.user?.email || "",
      },
      message: messageText || "",
      contextType: pendingAttachment?.type,
      contextId: pendingAttachment ? {
        _id: pendingAttachment.id,
        orderNumber: pendingAttachment.orderNumber,
      } : undefined,
      readBy: [session?.user?.id || ""],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const prevArray = Array.isArray(prev) ? prev : [];
      return dedupeMessages([...prevArray, optimisticMessage]);
    });
    setNewMessage("");
    const currentAttachment = pendingAttachment;
    setPendingAttachment(null);

    try {
      setSending(true);
      socketService.sendMessage({
        chatId: selectedChat._id,
        message: messageText,
        attachmentType: currentAttachment?.type,
        attachmentId: currentAttachment?.id,
      });
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketService.stopTyping(selectedChat._id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
      // Restore the pending attachment on error
      if (currentAttachment) {
        setPendingAttachment(currentAttachment);
      }
    } finally {
      setSending(false);
    }
  };

  const handleAttachmentSelect = async (type: "order", id: string) => {
    // Fetch order details to show in preview
    try {
      const response = await axiosInstance.get(`/orders/${id}`);
      const order = response.data.data;
      setPendingAttachment({ type, id, orderNumber: order.orderNumber });
      setShowAttachmentSelector(false);
      toast.success("Order attached. Add a message and send.");
    } catch (error) {
      console.error("Error fetching order details:", error);
      // Fallback: attach without order number
      setPendingAttachment({ type, id });
      setShowAttachmentSelector(false);
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    confirmToast({
      title: "Delete Chat",
      message: "Are you sure you want to delete this chat? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/chats/${chatId}`);
          
          // Remove chat from list
          setChats((prev) => prev.filter((chat) => chat._id !== chatId));
          
              // If deleted chat was selected, clear selection
          if (selectedChat?._id === chatId) {
            setSelectedChat(null);
            setMessages([]);
          }
          
          toast.success("Chat deleted successfully");
        } catch (error) {
          console.error("Error deleting chat:", error);
          toast.error("Failed to delete chat");
        }
      },
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    confirmToast({
      title: "Delete Message",
      message: "Are you sure you want to delete this message?",
      onConfirm: async () => {
        try {
          await axiosInstance.delete(`/chats/messages/${messageId}`);
          setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
          setOpenDropdownId(null);
          toast.success("Message deleted successfully");
        } catch (error) {
          console.error("Error deleting message:", error);
          toast.error("Failed to delete message. Please try again.");
        }
      },
    });
  };

  const handleShowMessageInfo = (message: Message) => {
    setMessageInfoModal({ isOpen: true, message });
    setOpenDropdownId(null);
  };

  const startNewChat = async () => {
    if (creatingChat) return;

    try {
      setCreatingChat(true);
      const response = await axiosInstance.post("/chats/support", {});
      const newChat = response.data.data;
      
      // Add new chat to the list and select it
      setChats((prev) => dedupeChats([newChat, ...prev]));
      await selectChat(newChat);
      
      toast.success("New chat started with support team");
    } catch (error: any) {
      console.error("Error creating new chat:", error);
      toast.error("Failed to start new chat");
    } finally {
      setCreatingChat(false);
    }
  };

  const handleTyping = () => {
    if (!selectedChat) return;

    socketService.startTyping(selectedChat._id);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(selectedChat._id);
    }, 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  const openAttachmentDetails = (type: "order" | "product" | "customer", id: string) => {
    setSelectedAttachmentType(type);
    setSelectedAttachmentId(id);
    setShowAttachmentDetails(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col w-full overflow-hidden">
        {/* Header */}
        <div className="bg-linear-to-r from-purple-600 to-blue-600 shadow-2xl px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Live Support Chat
            </h1>
            <button
              onClick={() => router.back()}
              className="text-white/80 hover:text-white transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className="bg-gray-800 shadow-2xl overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Chat List Sidebar */}
            <div className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-80 border-r border-gray-700 flex-col min-h-0`}>
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white font-semibold text-lg">Conversations</h2>
                </div>
                <button
                  onClick={startNewChat}
                  disabled={creatingChat}
                  className="w-full px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {creatingChat ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      Starting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Start New Chat
                    </>
                  )}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                {!Array.isArray(chats) || chats.length === 0 ? (
                  <div className="p-6 text-center">
                    <svg className="w-12 h-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-400 text-sm">No conversations yet</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-3 border-b border-gray-700/50">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Chats</h3>
                    </div>
                    {chats.map((chat) => (
                    <div
                      key={chat._id}
                      className={`relative w-full text-left p-4 border-b border-gray-700 hover:bg-gray-700/50 transition group ${
                        selectedChat?._id === chat._id ? "bg-gray-700" : ""
                      }`}
                    >
                      <button
                        onClick={() => selectChat(chat)}
                        className="w-full"
                      >
                        <div className="flex items-center justify-between mb-2 pr-8">
                          <span className="text-white font-semibold truncate">
                            {getChatLabel(chat._id)}
                          </span>
                          <span className={`text-white text-xs font-bold px-2 py-1 rounded-full ${getUnreadCount(chat) > 0 ? "bg-red-500" : "bg-black"}`}>
                            {getUnreadCount(chat)}
                          </span>
                        </div>
                      {chat.lastMessage?.message && (
                        <div className="flex items-center justify-between">
                          <p className="text-gray-400 text-sm truncate flex-1">
                            {chat.lastMessage.message}
                          </p>
                          {chat.lastMessage?.createdAt && (
                            <span className="text-gray-500 text-xs ml-2 shrink-0">
                              {formatTime(chat.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                    {/* Delete Button */}
                    <button
                      onClick={(e) => deleteChat(chat._id, e)}
                      className="absolute top-4 right-4 p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    </div>
                  ))}
                  </>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className={`${selectedChat ? "flex" : "hidden md:flex"} flex-1 min-h-0 flex-col overflow-hidden`}>
              {selectedChat ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-700 bg-gray-750">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedChat(null)}
                        className="md:hidden text-gray-300 hover:text-white p-2 -ml-2 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {getChatLabel(selectedChat._id).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">
                          {getChatLabel(selectedChat._id)}
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Support
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                      </div>
                    ) : !Array.isArray(messages) || messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <svg className="w-16 h-16 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-gray-400 mb-2">No messages yet</p>
                        <p className="text-gray-500 text-sm">Start a conversation with support</p>
                      </div>
                    ) : (
                      <>
                        {(Array.isArray(messages) ? messages : []).map((message, index) => {
                          const isOwnMessage = message.senderId._id === session?.user?.id;
                          const showDate =
                            index === 0 ||
                            formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);

                          return (
                            <div key={`${message._id}-${message.createdAt}-${index}`}>
                              {showDate && (
                                <div className="flex items-center justify-center my-4">
                                  <span className="bg-gray-700 text-gray-400 text-xs px-3 py-1 rounded-full">
                                    {formatDate(message.createdAt)}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[70%] ${isOwnMessage ? "items-end" : "items-start"} relative group`}>
                                  {!isOwnMessage && (
                                    <p className="text-gray-400 text-xs mb-1 px-1">
                                      {getChatLabel(selectedChat._id)}
                                    </p>
                                  )}
                                  <div
                                    className={`rounded-2xl px-4 py-3 ${
                                      isOwnMessage
                                        ? "bg-purple-600 text-white rounded-br-none"
                                        : "bg-gray-700 text-white rounded-bl-none"
                                    }`}
                                  >
                                    {message.message && (
                                      <p className="wrap-break-word mb-1">{message.message}</p>
                                    )}
                                    {!message.message && message.text && (
                                      <p className="wrap-break-word mb-1">{message.text}</p>
                                    )}
                                    {message.contextType && message.contextId && (
                                      <div
                                        onClick={() =>
                                          openAttachmentDetails(
                                            message.contextType!,
                                            message.contextId?._id || message.contextId
                                          )
                                        }
                                        className={`cursor-pointer rounded-lg p-3 ${message.message ? 'mt-2' : ''} mb-2 border ${
                                          isOwnMessage
                                            ? "bg-purple-500/40 border-purple-400/50"
                                            : "bg-gray-600/40 border-gray-500/50"
                                        }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                          </svg>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold mb-0.5">Attached order</p>
                                            <p className="text-xs opacity-90">
                                              Order #{message.contextId?.orderNumber || message.contextId}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center justify-end gap-1.5 text-xs opacity-70">
                                      <span>{formatTime(message.createdAt)}</span>
                                      {isOwnMessage && (
                                        <span>{message.readBy.length > 1 ? "✓✓" : "✓"}</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Dropdown button */}
                                  <button
                                    onClick={() => setOpenDropdownId(openDropdownId === message._id ? null : message._id)}
                                    className={`absolute top-2 ${isOwnMessage ? "-left-8" : "-right-8"} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-gray-700`}
                                    title="Message options"
                                  >
                                    <svg className="w-5 h-5 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                                    </svg>
                                  </button>

                                  {/* Dropdown menu */}
                                  {openDropdownId === message._id && (
                                    <div
                                      ref={dropdownRef}
                                      className={`absolute top-8 ${
                                        isOwnMessage ? "-left-8" : "-right-8"
                                      } bg-gray-800 border border-gray-700 rounded-lg shadow-lg py-1 min-w-37.5 z-50`}
                                    >
                                      <button
                                        onClick={() => handleShowMessageInfo(message)}
                                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2 text-gray-200"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Info
                                      </button>
                                      {isOwnMessage && (
                                        <button
                                          onClick={() => handleDeleteMessage(message._id)}
                                          className="w-full text-left px-4 py-2 hover:bg-red-900/50 text-sm flex items-center gap-2 text-red-400"
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
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}

                    {/* Typing Indicator */}
                    {typingUsers[selectedChat._id]?.length > 0 && (
                      <div className="flex justify-start">
                        <div className="bg-gray-700 rounded-2xl rounded-bl-none px-4 py-2">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="p-4 border-t border-gray-700 bg-gray-750">
                    {/* Attachment Preview */}
                    {pendingAttachment && (
                      <div className="mb-3 bg-gray-700/50 rounded-lg p-3 flex items-center justify-between border border-purple-500/30">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-600/20 p-2 rounded-lg">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">Order Attached</p>
                            <p className="text-gray-400 text-xs">{pendingAttachment.orderNumber ? `#${pendingAttachment.orderNumber}` : `Order ID: ${pendingAttachment.id.slice(0, 8)}...`}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPendingAttachment(null)}
                          className="text-gray-400 hover:text-red-400 transition p-1"
                          title="Remove attachment"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="flex items-top gap-2">
                      <button
                        onClick={() => setShowAttachmentSelector(true)}
                        className="shrink-0 h-12 w-12 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                        title="Attach order"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <div className="flex-1 relative">
                        <textarea
                          value={newMessage}
                          onChange={(e) => {
                            setNewMessage(e.target.value);
                            handleTyping();
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage();
                            }
                          }}
                          placeholder="Type your message..."
                          className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none"
                          rows={1}
                          style={{ minHeight: "48px", maxHeight: "120px" }}
                        />
                      </div>
                      <button
                        onClick={sendMessage}
                        disabled={(!newMessage.trim() && !pendingAttachment) || sending}
                        className="shrink-0 h-12 w-12 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
                      >
                        {sending ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <svg className="w-20 h-20 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <h3 className="text-white text-xl font-semibold mb-2">Welcome to Live Support</h3>
                  <p className="text-gray-400">
                    {!Array.isArray(chats) || chats.length === 0
                      ? "Start a conversation by contacting our support team"
                      : "Select a conversation to start chatting"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Selector Modal */}
      <AttachmentSelector
        isOpen={showAttachmentSelector}
        onClose={() => setShowAttachmentSelector(false)}
        onSelect={handleAttachmentSelect}
      />

      {/* Attachment Details Modal */}
      <AttachmentDetailsModal
        isOpen={showAttachmentDetails}
        onClose={() => setShowAttachmentDetails(false)}
        attachmentType={selectedAttachmentType}
        attachmentId={selectedAttachmentId}
      />

      {/* Message Info Modal */}
      {messageInfoModal.isOpen && messageInfoModal.message && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Message Info</h3>
              <button
                onClick={() => setMessageInfoModal({ isOpen: false, message: null })}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Message</p>
                <p className="text-white">{messageInfoModal.message.message || messageInfoModal.message.text || "Attachment only"}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Sender</p>
                  <p className="text-white font-medium">{messageInfoModal.message.senderId.name}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-400 mb-1">Status</p>
                  <p className="text-white font-medium capitalize">
                    {messageInfoModal.message.readBy.length > 1 ? (
                      <span className="flex items-center gap-1 text-blue-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                        </svg>
                        Read
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400">
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
                <p className="text-sm text-gray-400 mb-1">Sent at</p>
                <p className="text-white">
                  {new Date(messageInfoModal.message.createdAt).toLocaleString()}
                </p>
              </div>
              
              {messageInfoModal.message.readBy && messageInfoModal.message.readBy.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Read by</p>
                  <p className="text-white">{messageInfoModal.message.readBy.length} participant(s)</p>
                </div>
              )}

              {messageInfoModal.message.contextType && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Attachment</p>
                  <p className="text-white capitalize">{messageInfoModal.message.contextType}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
