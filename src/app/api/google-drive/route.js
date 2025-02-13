// src/app/api/google-drive/route.js
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const API_KEY = 'AIzaSyBWlDWrYxlOaivn5nvGDHqzKUjzbeAJI4Y';

export async function POST(request) {
  try {
    const { fileId, title, email } = await request.json();
    
    const drive = google.drive({ version: 'v3', auth: API_KEY });
    
    // שכפול המסמך
    const copyResponse = await drive.files.copy({
      fileId,
      requestBody: { name: title }
    });
    
    const newFileId = copyResponse.data.id;
    
    // שיתוף המסמך
    await drive.permissions.create({
      fileId: newFileId,
      requestBody: {
        role: 'writer',
        type: 'user',
        emailAddress: email
      }
    });
    
    return NextResponse.json({ 
      fileId: newFileId,
      url: `https://docs.google.com/document/d/${newFileId}/edit`
    });
    
  } catch (error) {
    console.error('Google Drive API error:', error);
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    );
  }
}