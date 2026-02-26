import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000";

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;

  initialize(accessToken: string) {
    if (!accessToken) {
      return null;
    }

    const isSameToken = this.token === accessToken;

    if (this.socket) {
      if (!isSameToken) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      } else {
        if (!this.socket.connected && !this.socket.active) {
          this.socket.connect();
        }
        return this.socket;
      }
    }

    this.token = accessToken;
    this.socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("✅ Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Socket disconnected:", reason);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error.message);
    });

    return this.socket;
  }

  getSocket() {
    if (!this.socket) {
      throw new Error("Socket not initialized. Call initialize() first.");
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Join a chat
  joinChat(chatId: string) {
    this.socket?.emit("chat:join", chatId);
  }

  // Leave a chat
  leaveChat(chatId: string) {
    this.socket?.emit("chat:leave", chatId);
  }

  // Send a message
  sendMessage(data: {
    chatId: string;
    message: string;
    attachmentType?: "order" | "product" | "customer";
    attachmentId?: string;
  }) {
    // Transform to backend format
    const payload: any = {
      chatId: data.chatId,
      text: data.message,
      attachments: [],
    };
    
    // Add context if attachment is provided
    if (data.attachmentType && data.attachmentId) {
      payload.contextType = data.attachmentType;
      payload.contextId = data.attachmentId;
    }
    
    this.socket?.emit("message:send", payload);
  }

  // Typing indicator
  startTyping(chatId: string) {
    this.socket?.emit("typing:start", chatId);
  }

  stopTyping(chatId: string) {
    this.socket?.emit("typing:stop", chatId);
  }

  // Mark messages as read
  markAsRead(chatId: string) {
    this.socket?.emit("message:read", { chatId });
  }

  // Listen for new messages
  onNewMessage(callback: (data: { chatId: string; message: any }) => void) {
    this.socket?.on("message:new", callback);
  }

  // Listen for typing indicators
  onTyping(callback: (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => void) {
    this.socket?.on("typing:update", callback);
  }

  onStopTyping(callback: (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => void) {
    this.socket?.on("typing:update", callback);
  }

  // Listen for message read receipts
  onMessageRead(callback: (data: { chatId: string; userId: string }) => void) {
    this.socket?.on("messages:read", callback);
  }

  // Listen for chat updates
  onChatUpdate(callback: (data: { chatId: string; lastMessage: string; lastMessageAt: Date }) => void) {
    this.socket?.on("chat:updated", callback);
  }

  offNewMessage(callback: (data: { chatId: string; message: any }) => void) {
    this.socket?.off("message:new", callback);
  }

  offTyping(callback: (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => void) {
    this.socket?.off("typing:update", callback);
  }

  offStopTyping(callback: (data: { chatId: string; userId: string; userName: string; isTyping: boolean }) => void) {
    this.socket?.off("typing:update", callback);
  }

  offMessageRead(callback: (data: { chatId: string; userId: string }) => void) {
    this.socket?.off("messages:read", callback);
  }

  offChatUpdate(callback: (data: { chatId: string; lastMessage: string; lastMessageAt: Date }) => void) {
    this.socket?.off("chat:updated", callback);
  }

  // Remove all listeners
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

const socketService = new SocketService();
export default socketService;
