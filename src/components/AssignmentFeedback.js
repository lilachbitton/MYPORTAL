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
  const [activeFeedbacks, setActiveFeedbacks] = useState(feedbacks.filter(f => f.isGeneral));
  const [specificFeedbacks, setSpecificFeedbacks] = useState(feedbacks.filter(f => !f.isGeneral));
  const [showGeneralCommentInput, setShowGeneralCommentInput] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);

  useEffect(() => {
    setActiveFeedbacks(feedbacks.filter(f => f.isGeneral));
    setSpecificFeedbacks(feedbacks.filter(f => !f.isGeneral));
  }, [feedbacks]);

  const handleTextSelection = (e) => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text) {
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

  const handleSaveComment = (isGeneral = false) => {
    if (!commentText.trim()) return;
    if (!isGeneral && !selectedText.trim()) return;

    if (editingFeedback) {
      const updatedFeedback = {
        ...editingFeedback,
        comment: commentText.trim(),
        timestamp: new Date().toISOString()
      };

      if (editingFeedback.isGeneral) {
        setActiveFeedbacks(prev => prev.map(f => 
          f.id === editingFeedback.id ? updatedFeedback : f
        ));
      } else {
        setSpecificFeedbacks(prev => prev.map(f => 
          f.id === editingFeedback.id ? updatedFeedback : f
        ));
      }
    } else {
      const newFeedback = {
        id: Date.now(),
        text: isGeneral ? '' : selectedText,
        comment: commentText.trim(),
        timestamp: new Date().toISOString(),
        isGeneral,
        position: isGeneral ? null : position
      };

      if (isGeneral) {
        setActiveFeedbacks(prev => [...prev, newFeedback]);
      } else {
        setSpecificFeedbacks(prev => [...prev, newFeedback]);
      }
    }

    // עדכון כל ההערות בפיירבייס
    const allFeedbacks = [
      ...activeFeedbacks,
      ...specificFeedbacks,
      ...(editingFeedback ? [] : [{ 
        id: Date.now(),
        text: isGeneral ? '' : selectedText,
        comment: commentText.trim(),
        timestamp: new Date().toISOString(),
        isGeneral,
        position: isGeneral ? null : position
      }])
    ];

    onSaveFeedback(allFeedbacks);

    // איפוס
    setCommentText('');
    setSelectedText('');
    setShowCommentInput(false);
    setShowGeneralCommentInput(false);
    setEditingFeedback(null);
  };

  const removeFeedback = (id) => {
    if (specificFeedbacks.find(f => f.id === id)) {
      setSpecificFeedbacks(prev => prev.filter(f => f.id !== id));
    } else {
      setActiveFeedbacks(prev => prev.filter(f => f.id !== id));
    }
    
    onSaveFeedback([
      ...activeFeedbacks.filter(f => f.id !== id),
      ...specificFeedbacks.filter(f => f.id !== id)
    ]);
  };

  const handleContentClick = (e) => {
    const target = e.target.closest('button');
    if (target) {
      const action = target.dataset.action;
      const id = parseInt(target.dataset.id);
      if (action === 'remove') {
        removeFeedback(id);
      } else if (action === 'edit') {
        const feedback = specificFeedbacks.find(f => f.id === id) || 
                        activeFeedbacks.find(f => f.id === id);
        if (feedback) {
          setEditingFeedback(feedback);
          setCommentText(feedback.comment);
          if (feedback.isGeneral) {
            setShowGeneralCommentInput(true);
          } else {
            setSelectedText(feedback.text);
            setPosition(feedback.position);
            setShowCommentInput(true);
          }
        }
      }
    }
  };

  const renderContent = () => {
    let content = studentContent;
    const sortedFeedbacks = [...specificFeedbacks].sort((a, b) => b.text.length - a.text.length);

    sortedFeedbacks.forEach(feedback => {
      const markerHtml = `
        <span class="bg-yellow-100 group relative inline-block">
          ${feedback.text}
          <div class="opacity-0 group-hover:opacity-100 absolute left-full top-0 ml-2 p-3 bg-white rounded shadow-lg border z-50 w-64 transition-opacity duration-200">
            <p class="text-sm">${feedback.comment}</p>
            ${!readOnly ? `
              <div class="flex justify-end gap-2 mt-2 pt-2 border-t">
                <button 
                  data-action="edit"
                  data-id="${feedback.id}"
                  class="text-xs px-2 py-1 text-blue-600 hover:text-blue-800"
                >
                  ערוך
                </button>
                <button 
                  data-action="remove"
                  data-id="${feedback.id}"
                  class="text-xs px-2 py-1 text-red-600 hover:text-red-800"
                >
                  מחק
                </button>
              </div>
            ` : ''}
          </div>
        </span>
      `;

      // החלפת הטקסט המקורי בגרסה המסומנת
      const escapedText = feedback.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedText, 'g');
      content = content.replace(regex, markerHtml);
    });

    return content;
  };

  return (
    <div className="feedback-container relative bg-white p-6 rounded-lg shadow-sm">
      {/* תוכן התלמיד עם הערות */}
      <div 
        className="prose max-w-none whitespace-pre-wrap break-words"
        onClick={handleContentClick}
        onMouseUp={handleTextSelection}
        dangerouslySetInnerHTML={{ __html: renderContent() }}
      />

      {/* חלון הוספת הערה */}
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

      {/* חלון הערה כללית */}
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

      {/* רשימת הערות כלליות */}
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
                        onClick={() => {
                          setEditingFeedback(feedback);
                          setCommentText(feedback.comment);
                          setShowGeneralCommentInput(true);
                        }}
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

      {/* כפתורי פעולה */}
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