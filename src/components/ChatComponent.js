"use client";
import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/firebase/config';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion 
} from "firebase/firestore";

const ChatComponent = ({ assignmentId, currentUserId, userRole, teacherName = "מורה" }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setLoading(true);
        const chatRef = doc(db, "chats", assignmentId);
        const chatDoc = await getDoc(chatRef);

        if (!chatDoc.exists()) {
          const assignmentRef = doc(db, "assignments", assignmentId);
          const assignmentDoc = await getDoc(assignmentRef);
          const assignmentData = assignmentDoc.data();

          await setDoc(chatRef, {
            assignmentId,
            messages: [],
            participants: {
              teacherId: assignmentData.teacherId || "admin",
              studentId: assignmentData.studentId
            },
            lastMessage: null,
            unreadCount: {
              teacher: 0,
              student: 0
            },
            createdAt: serverTimestamp()
          });
        }

        const unsubscribe = onSnapshot(chatRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            setMessages(data.messages || []);
            scrollToBottom();

            // כאשר הצ'אט פתוח, מאפסים את ספירת ההודעות הלא נקראות עבור המשתמש הנוכחי
            if (data.messages?.length > 0) {
              updateDoc(chatRef, {
                [`unreadCount.${userRole}`]: 0
              });
            }
          }
        });

        setLoading(false);
        return () => unsubscribe();

      } catch (error) {
        console.error("Error initializing chat:", error);
        setError("שגיאה בטעינת הצ'אט");
        setLoading(false);
      }
    };

    if (assignmentId && currentUserId) {
      initializeChat();
    }
  }, [assignmentId, currentUserId, userRole]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const chatRef = doc(db, "chats", assignmentId);
      const chatDoc = await getDoc(chatRef);
      const chatData = chatDoc.data();

      const message = {
        content: newMessage.trim(),
        senderId: currentUserId,
        senderName: userRole === "teacher" ? teacherName : null,
        timestamp: new Date().toISOString(),
        senderRole: userRole,
        isRead: false
      };

      await updateDoc(chatRef, {
        messages: arrayUnion(message),
        lastMessage: {
          content: message.content,
          timestamp: message.timestamp,
          senderId: currentUserId
        },
        // מגדילים את ספירת ההודעות הלא נקראות אצל הצד השני
        [`unreadCount.${userRole === "teacher" ? "student" : "teacher"}`]: 
          (chatData?.unreadCount?.[userRole === "teacher" ? "student" : "teacher"] || 0) + 1
      });

      setNewMessage("");
      scrollToBottom();

    } catch (error) {
      console.error("Error sending message:", error);
      setError("שגיאה בשליחת ההודעה");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-4">טוען...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="flex flex-col h-[500px] bg-gray-50 rounded-lg shadow-md" dir="rtl">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex flex-col ${message.senderId === currentUserId ? "items-end" : "items-start"}`}
          >
            <span className="text-xs text-gray-500 mb-1">
              {message.senderId === currentUserId ? "אני:" : message.senderName || "מורה:"}
            </span>
            <div
              className={`max-w-[70%] p-3 rounded-lg ${
                message.senderId === currentUserId
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-white text-gray-800 rounded-bl-none shadow"
              }`}
            >
              <p className="text-sm">{message.content}</p>
              <span className="text-xs opacity-75 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString("he-IL")}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="border-t p-4 bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="הקלד/י הודעה..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            שלח
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatComponent;
