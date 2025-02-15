import React, { useState, useEffect } from 'react';

const AssignmentFeedback = ({ 
  studentContent, 
  feedbacks = [], 
  onSaveFeedback,
  onUpdateStatus,
  readOnly = false 
}) => {
  // סטייט לטקסט שנבחר, טקסט ההערה, מיקום חלון ההוספה ועוד
  const [selectedText, setSelectedText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeFeedbacks, setActiveFeedbacks] = useState(
    feedbacks.filter(f => f.isGeneral)
  );
  const [specificFeedbacks, setSpecificFeedbacks] = useState(
    feedbacks.filter(f => !f.isGeneral)
  );
  const [showGeneralCommentInput, setShowGeneralCommentInput] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);

  // עדכון הסטייט כאשר המידע החיצוני (feedbacks) משתנה
  useEffect(() => {
    setActiveFeedbacks(feedbacks.filter(f => f.isGeneral));
    setSpecificFeedbacks(feedbacks.filter(f => !f.isGeneral));
  }, [feedbacks]);

  // טיפול בבחירת טקסט – מאפשר בחירת מספר שורות והתאמת מיקום חלון ההוספה
  const handleTextSelection = (e) => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    let text = selection.toString().trim();
    
    if (text) {
      // תמיכה בבחירת מספר שורות: החלפת רווחים מרובים ברווח יחיד
      text = text.replace(/\s+/g, ' ');
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectedText(text);
      setPosition({
        x: rect.x + window.scrollX,
        y: rect.y + rect.height + window.scrollY
      });
      setShowCommentInput(true);
    }
  };

  // שמירת הערה – אם בעריכה מעדכנים את ההערה הקיימת, אחרת יוצרים חדשה
  const handleSaveComment = (isGeneral = false) => {
    if (!commentText.trim()) return;

    if (editingFeedback) {
      if (editingFeedback.isGeneral) {
        const updatedFeedbacks = activeFeedbacks.map(f =>
          f.id === editingFeedback.id
            ? { ...f, comment: commentText, timestamp: new Date().toISOString() }
            : f
        );
        setActiveFeedbacks(updatedFeedbacks);
        onSaveFeedback([...updatedFeedbacks, ...specificFeedbacks]);
      } else {
        const updatedFeedbacks = specificFeedbacks.map(f =>
          f.id === editingFeedback.id
            ? { ...f, comment: commentText, timestamp: new Date().toISOString() }
            : f
        );
        setSpecificFeedbacks(updatedFeedbacks);
        onSaveFeedback([...activeFeedbacks, ...updatedFeedbacks]);
      }
      setEditingFeedback(null);
    } else {
      const newFeedback = {
        id: Date.now(),
        text: isGeneral ? '' : selectedText,
        comment: commentText,
        position: isGeneral ? null : position,
        timestamp: new Date().toISOString(),
        isGeneral
      };

      if (isGeneral) {
        const updatedGeneral = [...activeFeedbacks, newFeedback];
        setActiveFeedbacks(updatedGeneral);
        onSaveFeedback([...updatedGeneral, ...specificFeedbacks]);
      } else {
        const updatedSpecific = [...specificFeedbacks, newFeedback];
        setSpecificFeedbacks(updatedSpecific);
        onSaveFeedback([...activeFeedbacks, ...updatedSpecific]);
      }
    }
    // איפוס השדות והחלונות
    setCommentText('');
    setShowCommentInput(false);
    setShowGeneralCommentInput(false);
    setSelectedText('');
  };

  // מחיקת הערה – מסנן את ההערה משתי רשימות ההערות (כלליות וספציפיות)
  const removeFeedback = (id) => {
    const updatedGeneral = activeFeedbacks.filter(f => f.id !== id);
    const updatedSpecific = specificFeedbacks.filter(f => f.id !== id);
    setActiveFeedbacks(updatedGeneral);
    setSpecificFeedbacks(updatedSpecific);
    onSaveFeedback([...updatedGeneral, ...updatedSpecific]);
  };

  // עריכת הערה ספציפית – ממלא את חלון ההוספה בפרטי ההערה הקיימת
  const editFeedback = (id) => {
    const feedback = specificFeedbacks.find(f => f.id === id);
    if (feedback) {
      setEditingFeedback(feedback);
      setSelectedText(feedback.text);
      setCommentText(feedback.comment);
      setPosition(feedback.position);
      setShowCommentInput(true);
    }
  };

  // מאזין לאירועים בתוך תוכן התלמיד – מזהה לחיצות על כפתורי "מחק" ו"ערוך" בתוך הסימון
  const handleContentClick = (e) => {
    const target = e.target;
    if (target.tagName === 'BUTTON') {
      const action = target.getAttribute('data-action');
      const id = Number(target.getAttribute('data-id'));
      if (action === 'remove') {
        removeFeedback(id);
      } else if (action === 'edit') {
        editFeedback(id);
      }
    }
  };

  // פונקציה לעיבוד תוכן התלמיד והוספת סימון על טקסט עם הערה ספציפית
  const renderContent = () => {
    let content = studentContent;
    specificFeedbacks.forEach(feedback => {
      content = content.replace(feedback.text, 
        `<mark class="bg-yellow-100 group relative cursor-pointer">
          ${feedback.text}
          <span class="absolute hidden group-hover:block bg-white border p-2 rounded shadow-lg z-10 -top-2 right-full">
            ${feedback.comment}
            ${
              !readOnly
                ? `
              <button data-action="remove" data-id="${feedback.id}" class="text-red-500 hover:text-red-700 ml-2">
                מחק
              </button>
              <button data-action="edit" data-id="${feedback.id}" class="text-blue-500 hover:text-blue-700 ml-2">
                ערוך
              </button>
            `
                : ''
            }
          </span>
        </mark>`
      );
    });
    return content;
  };

  return (
    <div className="feedback-container relative bg-white p-6 rounded-lg shadow-sm">
      {/
