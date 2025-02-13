// components/SimpleEditor.js
'use client';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

const SimpleEditor = ({ content, onChange, readOnly = false }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange?.(html);
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg">
      {!readOnly && (
        <div className="border-b bg-gray-50 p-2 flex gap-2">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`px-2 py-1 rounded ${
              editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-200'
            }`}
          >
            מודגש
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`px-2 py-1 rounded ${
              editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-200'
            }`}
          >
            נטוי
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`px-2 py-1 rounded ${
              editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-200'
            }`}
          >
            רשימה
          </button>
        </div>
      )}
      <EditorContent editor={editor} className="p-4" />
    </div>
  );
};

export default SimpleEditor;