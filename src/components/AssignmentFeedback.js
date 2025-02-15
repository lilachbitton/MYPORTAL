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
  const [activeFeedbacks, setActiveFeedbacks] = useState(feedbacks);
  const [highlightedFeedback, setHighlightedFeedback] = useState(null);
  const [showGeneralCommentInput, setShowGeneralCommentInput] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null); // משתנה חדש לעריכת הערה קיימת

  useEffect(() => {
    setActiveFeedbacks(feedbacks);
  }, [feedbacks]);

  // פונקציה להוספת סימון צבעוני לטקסט שיש עליו הערה
  const highlightContentWithFeedbacks = (content) => {
    let highlightedContent = content;
    activeFeedbacks.forEach(feedback => {
      if (!feedback.isGeneral && feedback.text) {
        const re = new RegExp(`(${feedback.text})`, 'g');
        highlightedContent = highlightedContent.replace(
          re,
          `<span class="bg-yellow-100 cursor-pointer" data-feedback-id="${feedback.id}">$1</span>`
        );
      }
    });
    return highlightedContent;
  };

  const handleTextSelection = (e) => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    // בדיקה אם נלחץ על טקסט מסומן קיים
    const clickedElement = e.target;
    if (clickedElement.hasAttribute('data-feedback-id')) {
      const feedbackId = clickedElement.getAttribute('data-feedback-id');
      const feedback = activeFeedbacks.find(f => f.id.toString() === feedbackId);
      if (feedback) {
        const rect = clickedElement.getBoundingClientRect();
        setPosition({
          x: rect.x + window.scrollX,
          y: rect.y + rect.height + window.scrollY
        });
        setSelectedText(feedback.text);
        setCommentText(feedback.comment);
        setEditingFeedback(feedback);
        setShowCommentInput(true);
        return;
      }
    }
    
    if (selectedText) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = document.querySelector('.feedback-container');
      const containerRect = container.getBoundingClientRect();
      
      let x = rect.x + window.scrollX;
      let y = rect.y + rect.height + window.scrollY;
      
      if (y + 200 > containerRect.bottom) {
        y = rect.y - 220 + window.scrollY;
      }
      
      setSelectedText(selectedText);
      setPosition({ x, y });
      setShowCommentInput(true);
    }
  };

  const handleSaveComment = (isGeneral = false) => {
    if (!commentText.trim()) return;

    let updatedFeedbacks;

    if (editingFeedback) {
      // עדכון הערה קיימת
      updatedFeedbacks = activeFeedbacks.map(feedback => 
        feedback.id === editingFeedback.id 
          ? { ...feedback, comment: commentText, timestamp: new Date().toISOString() }
          : feedback
      );
    } else {
      // יצירת הערה חדשה
      const newFeedback = {
        id: Date.now(),
        text: isGeneral ? '' : selectedText,
        comment: commentText,
        position: isGeneral ? null : position,
        timestamp: new Date().toISOString(),
        isGeneral
      };
      updatedFeedbacks = [...activeFeedbacks, newFeedback];
    }

    setActiveFeedbacks(updatedFeedbacks);
    onSaveFeedback(updatedFeedbacks);

    // איפוס השדות
    setSelectedText('');
    setCommentText('');
    setShowCommentInput(false);
    setShowGeneralCommentInput(false);
    setEditingFeedback(null);
  };

  const removeFeedback = (feedbackId) => {
    const updatedFeedbacks = activeFeedbacks.filter(f => f.id !== feedbackId);
    setActiveFeedbacks(updatedFeedbacks);
    onSaveFeedback(updatedFeedbacks);
  };

  return (
    <div className="feedback-container relative bg-white p-6 rounded-lg shadow-sm">
      {/* Student's Response with Highlights */}
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-bold mb-3 text-lg">תשובת התלמיד:</h3>
        <div
          className="prose max-w-none relative"
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ 
            __html: highlightContentWithFeedbacks(studentContent)
          }}
        />
      </div>

      {/* Comment Input Popup */}
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
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                ביטול
              </button>
              <button
                onClick={() => handleSaveComment(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h3 className="font-bold mb-4 text-lg">הערות ({activeFeedbacks.length}):</h3>
        <div className="space-y-3">
          {activeFeedbacks.map((feedback, index) => (
            <div
              key={feedback.id}
              className={`p-4 rounded-lg transition-colors ${
                highlightedFeedback === feedback.id
                  ? 'bg-yellow-50 border border-yellow-200'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium text-gray-700">
                  {feedback.isGeneral ? 'הערה כללית' : `הערה ${index + 1}#`}
                </span>
                {!readOnly && (
                  <button
                    onClick={() => removeFeedback(feedback.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="מחק הערה"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-2">
                {!feedback.isGeneral && feedback.text && (
                  <p className="text-sm text-gray-600 mb-2">
                    טקסט מסומן: "{feedback.text}"
                  </p>
                )}
                <p className="text-gray-800">{feedback.comment}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(feedback.timestamp).toLocaleString('he-IL')}
                </p>
              </div>
            </div>
          ))}
          
          {activeFeedbacks.length === 0 && (
            <div className="text-gray-500 text-center py-4">
              אין הערות עדיין
            </div>
          )}
        </div>
      </div>

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