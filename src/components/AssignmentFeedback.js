import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

const AssignmentFeedback = ({ 
  originalContent, 
  studentContent, 
  feedbacks = [], 
  onSaveFeedback, 
  readOnly = false 
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [commentText, setCommentText] = useState('');
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeFeedbacks, setActiveFeedbacks] = useState(feedbacks);
  const [highlightedFeedback, setHighlightedFeedback] = useState(null);

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
      
      setSelectedText(selectedText);
      setPosition({
        x: rect.x + window.scrollX,
        y: rect.y + rect.height + window.scrollY
      });
      setShowCommentInput(true);
    }
  };

  const handleSaveComment = () => {
    if (!commentText.trim()) return;

    const newFeedback = {
      id: Date.now(),
      text: selectedText,
      comment: commentText,
      position: position,
      timestamp: new Date().toISOString()
    };

    const updatedFeedbacks = [...activeFeedbacks, newFeedback];
    setActiveFeedbacks(updatedFeedbacks);
    onSaveFeedback(updatedFeedbacks);

    // Reset states
    setSelectedText('');
    setCommentText('');
    setShowCommentInput(false);
  };

  const removeFeedback = (feedbackId) => {
    const updatedFeedbacks = activeFeedbacks.filter(f => f.id !== feedbackId);
    setActiveFeedbacks(updatedFeedbacks);
    onSaveFeedback(updatedFeedbacks);
  };

  return (
    <div className="relative">
      {/* Original Assignment Template */}
      <Card className="p-4 mb-4 bg-gray-50">
        <h3 className="font-bold mb-2">תבנית המשימה המקורית:</h3>
        <div 
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: originalContent }}
        />
      </Card>

      {/* Student's Response */}
      <Card className="p-4 bg-white">
        <h3 className="font-bold mb-2">תשובת התלמיד:</h3>
        <div
          className="prose max-w-none relative"
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ __html: studentContent }}
        />
      </Card>

      {/* Feedback Overlay */}
      {activeFeedbacks.map((feedback, index) => (
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

      {/* Comment Input Modal */}
      {showCommentInput && (
        <div
          className="fixed bg-white shadow-lg rounded-lg p-4 z-50"
          style={{
            left: `${position.x}px`,
            top: `${position.y + 10}px`
          }}
        >
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="w-64 h-32 p-2 border rounded-md mb-2"
            placeholder="הוסף הערה..."
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCommentInput(false)}
              className="px-3 py-1 text-gray-600 hover:text-gray-800"
            >
              ביטול
            </button>
            <button
              onClick={handleSaveComment}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              שמור
            </button>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="mt-4">
        <h3 className="font-bold mb-2">הערות ({activeFeedbacks.length}):</h3>
        <div className="space-y-2">
          {activeFeedbacks.map((feedback, index) => (
            <div
              key={feedback.id}
              className={`p-3 rounded-lg ${
                highlightedFeedback === feedback.id
                  ? 'bg-yellow-100'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-medium">#{index + 1}</span>
                {!readOnly && (
                  <button
                    onClick={() => removeFeedback(feedback.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="mt-1">
                <p className="text-sm text-gray-600">
                  טקסט מסומן: "{feedback.text}"
                </p>
                <p className="mt-1">{feedback.comment}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(feedback.timestamp).toLocaleString('he-IL')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AssignmentFeedback;