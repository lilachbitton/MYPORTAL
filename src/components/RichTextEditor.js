// components/RichTextEditor.js
"use client";
import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// מייבאים את ReactQuill באופן דינמי כדי למנוע בעיות ב-SSR
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const RichTextEditor = ({ value, onChange }) => {
  return (
    <ReactQuill theme="snow" value={value} onChange={onChange} />
  );
};

export default RichTextEditor;
