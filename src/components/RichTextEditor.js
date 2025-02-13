// components/RichTextEditor.js
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// ייבוא דינמי של react-quill כדי למנוע בעיות SSR
const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse" />
});

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ direction: 'rtl' }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'list', 'bullet',
  'link', 'image',
  'direction'
];

const RichTextEditor = ({
  value,
  onChange,
  readOnly = false,
  placeholder = 'התחל לכתוב כאן...'
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // לאחר שהקומפוננטה נטענה בצד הלקוח
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="bg-white" dir="rtl">
      <ReactQuill
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        readOnly={readOnly}
        placeholder={placeholder}
        className="h-64"
      />
    </div>
  );
};

export default RichTextEditor;
