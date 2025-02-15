import React, { useState, useEffect } from 'react';

const AssignmentFeedback = ({ 
  studentContent, 
  feedbacks = [], 
  onSaveFeedback,
  onUpdateStatus,
  readOnly = false 
}) => {
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

  useEffect(() => {
    setActiveFeedbacks(feedbacks.filter(f => f.isGeneral));
    setSpecificFeedbacks(feedbacks.filter(f => !f.isGeneral));
  }, [feedbacks]);

  const handleTextSelection = (e) => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    let text = selection.toString().trim();
    
    if (text) {
      // שמירה על ירידות שורה אך הסרת רווחים מיותרים
      text = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join('\n');
      
      if (text) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const container = document.querySelector('.feedback-container');
        const containerRect = container.getBoundingClientRect();
        
        let x = rect.x + window.scrollX;
        let y = rect.y + rect.height + window.scrollY;
        
        // התאמת מיקום החלונית במידה והיא חורגת מגבולות המסך
        if (y + 200 > containerRect.bottom) {
          y = rect.y - 220 + window.scrollY;
        }
        
        setSelectedText(text);
        setPosition({ x, y });
        setShowCommentInput(true);
      }
    }
  };

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

    setCommentText('');
    setShowCommentInput(false);
    setShowGeneralCommentInput(false);
    setSelectedText('');
  };

  const removeFeedback = (id) => {
    const updatedGeneral = activeFeedbacks.filter(f => f.id !== id);
    const updatedSpecific = specificFeedbacks.filter(f => f.id !== id);
    setActiveFeedbacks(updatedGeneral);
    setSpecificFeedbacks(updatedSpecific);
    onSaveFeedback([...updatedGeneral, ...updatedSpecific]);
  };

  const editFeedback = (id) => {
    const feedback = specificFeedbacks.find(f => f.id === id) || 
                     activeFeedbacks.find(f => f.id === id);
    if (feedback) {
      setEditingFeedback(feedback);
      setSelectedText(feedback.text);
      setCommentText(feedback.comment);
      if (!feedback.isGeneral) {
        setPosition(feedback.position);
        setShowCommentInput(true);
      } else {
        setShowGeneralCommentInput(true);
      }
    }
  };

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

  const renderContent = () => {
    let content = studentContent;
    
    // מיון ההערות מהארוכה לקצרה כדי למנוע החלפות חלקיות
    const sortedFeedbacks = [...specificFeedbacks].sort(
      (a, b) => b.text.length - a.text.length
    );
    
    sortedFeedbacks.forEach(feedback => {
      // מחליף את התוכן בדיוק כמו שהוא, כולל ירידות שורה
      const escapedText = feedback.text
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // המרה לאותיות מיוחדות
        .split('\n')                           // פיצול לשורות
        .map(line => line.trim())              // הסרת רווחים מיותרים
        .join('\\n?\\s*');                     // חיבור מחדש עם תמיכה בירידות שורה וברווחים
      
      try {
        const regex = new RegExp(escapedText, 'gm');  // שימוש בדגל 'm' למצב multiline
        content = content.replace(regex, match => `
          <mark class="bg-yellow-100 group relative cursor-pointer whitespace-pre-wrap">
            ${match}
            <span class="absolute hidden group-hover:block bg-white border p-2 rounded shadow-lg z-10 -top-2 right-full max-w-xs">
              ${feedback.comment}
              ${!readOnly 
                ? `<div class="flex justify-end gap-2 mt-2">
                    <button data-action="remove" data-id="${feedback.id}" class="text-red-500 hover:text-red-700 px-2 py-1">
                      מחק
                    </button>
                    <button data-action="edit" data-id="${feedback.id}" class="text-blue-500 hover:text-blue-700 px-2 py-1">
                      ערוך
                    </button>
                  </div>`
                : ''
              }
            </span>
          </mark>
        `);
      } catch (error) {
        console.error('Error replacing text:', error);
      }
    });
    
    return content;
  };

  return (
    <div className="feedback-container relative bg-white p-6 rounded-lg shadow-sm">
      {/* Student Content with Highlights */}
      <div 
        className="prose max-w-none"
        onClick={handleContentClick}
        onMouseUp={handleTextSelection}
        dangerouslySetInnerHTML={{ __html: renderContent() }}
      />

      {/* Comment Input Modal */}
      {showCommentInput && (
        <div
          className="fixed bg-white shadow-lg rounded-lg p-4 z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y + 10}px`,
            maxWidth: '90vw'
          }}
        >
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-64 h-32 p-2 border rounded-md mb-2 resize-none"
            placeholder="הוסף הערה..."
            dir="rtl"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowCommentInput(false);
                setCommentText('');
                setEditingFeedback(null);
              }}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              onClick={() => handleSaveComment(false)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {editingFeedback ? 'עדכן' : 'שמור'}
            </button>
          </div>
        </div>
      )}

      {/* General Comment Modal */}
      {showGeneralCommentInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
            <h3 className="text-lg font-bold mb-4">הוסף הערה כללית</h3>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full h-32 p-2 border rounded-md mb-4 resize-none"
              placeholder="הוסף הערה..."
              dir="rtl"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowGeneralCommentInput(false);
                  setCommentText('');
                  setEditingFeedback(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ביטול
              </button>
              <button
                onClick={() => handleSaveComment(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                {editingFeedback ? 'עדכן' : 'שמור'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* General Feedbacks List */}
      {activeFeedbacks.length > 0 && (
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-bold mb-3">הערות כלליות:</h3>
          <div className="space-y-3">
            {activeFeedbacks.map(feedback => (
              <div
                key={feedback.id}
                className="p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start">
                  <p className="text-gray-800">{feedback.comment}</p>
                  {!readOnly && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => editFeedback(feedback.id)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => removeFeedback(feedback.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        מחק
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(feedback.timestamp).toLocaleString('he-IL')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!readOnly && (
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => setShowGeneralCommentInput(true)}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            הוסף הערה כללית
          </button>
          <button
            onClick={() => onUpdateStatus('revision')}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            דרוש תיקון
          </button>
          <button
            onClick={() => onUpdateStatus('completed')}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            סמן כהושלם
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentFeedback;
