import React, { useState, useEffect } from 'react';

const AssignmentFeedback = ({ 
  originalContent, 
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

  useEffect(() => {
    setActiveFeedbacks(feedbacks);
  }, [feedbacks]);

  const handleTextSelection = (e) => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = document.querySelector('.feedback-container');
      const containerRect = container.getBoundingClientRect();
      
      // וידוא שחלונית ההערות לא תחרוג מגבולות המסך
      let x = rect.x + window.scrollX;
      let y = rect.y + rect.height + window.scrollY;
      
      // אם החלונית תחרוג מהחלק התחתון, נציג אותה מעל הטקסט המסומן
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

    const newFeedback = {
      id: Date.now(),
      text: isGeneral ? '' : selectedText,
      comment: commentText,
      position: isGeneral ? null : position,
      timestamp: new Date().toISOString(),
      isGeneral
    };

    const updatedFeedbacks = [...activeFeedbacks, newFeedback];
    setActiveFeedbacks(updatedFeedbacks);
    onSaveFeedback(updatedFeedbacks);

    // Reset states
    setSelectedText('');
    setCommentText('');
    setShowCommentInput(false);
    setShowGeneralCommentInput(false);
  };

  const removeFeedback = (feedbackId) => {
    const updatedFeedbacks = activeFeedbacks.filter(f => f.id !== feedbackId);
    setActiveFeedbacks(updatedFeedbacks);
    onSaveFeedback(updatedFeedbacks);
  };

  // Function to format the text content for display
  const formatContentForDisplay = (content) => {
    // Check if content is already HTML or if it needs to be formatted
    if (typeof content === 'string' && !content.includes('<')) {
      return content.split('\n').map((line, index) => (
        <p key={index} className="mb-2">{line}</p>
      ));
    }
    return content;
  };

  return (
    <div className="feedback-container relative bg-white p-6 rounded-lg shadow-sm">
      {!readOnly && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowGeneralCommentInput(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            הוסף הערה כללית +
          </button>
        </div>
      )}

      {/* Modal for general comment */}
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

      {/* Original Template & Student's Response */}
      <div className="space-y-6">
        {/* Original Assignment Template */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-bold mb-3 text-lg">תבנית המשימה המקורית:</h3>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ 
              __html: typeof originalContent === 'string' ? originalContent : ''
            }}
          />
        </div>

        {/* Student's Response */}
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="font-bold mb-3 text-lg">תשובת התלמיד:</h3>
          <div
            className="prose max-w-none relative"
            onMouseUp={handleTextSelection}
            dangerouslySetInnerHTML={{ 
              __html: typeof studentContent === 'string' ? studentContent : ''
            }}
          />
        </div>
      </div>

      {/* Feedback Overlays */}
      {activeFeedbacks.map((feedback, index) => !feedback.isGeneral && feedback.position && (
        <div
          key={feedback.id}
          className="absolute bg-yellow-100 opacity-50 cursor-pointer transition-opacity hover:opacity-80"
          style={{
            left: `${feedback.position.x}px`,
            top: `${feedback.position.y - 20}px`,
          }}
          onMouseEnter={() => setHighlightedFeedback(feedback.id)}
          onMouseLeave={() => setHighlightedFeedback(null)}
        >
          <span className="text-xs bg-yellow-200 px-2 py-1 rounded">
            {index + 1}
          </span>
        </div>
      ))}

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
              }}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              onClick={() => handleSaveComment(false)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              שמור
            </button>
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

      {/* Status Buttons */}
      {!readOnly && onUpdateStatus && (
        <div className="mt-6 flex justify-end gap-4">
          <button
            onClick={() => onUpdateStatus('completed')}
            className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            סמן כהושלם
          </button>
          <button
            onClick={() => onUpdateStatus('revision')}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            דרוש תיקון
          </button>
        </div>
      )}
    </div>
  );
};

export default AssignmentFeedback;