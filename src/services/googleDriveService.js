// services/googleDriveService.js
export const duplicateGoogleDoc = async (fileId, title, email) => {
  try {
    const response = await fetch('/api/google-drive', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId, title, email }),
    });

    if (!response.ok) throw new Error('Failed to process document');
    const data = await response.json();
    return data.url;
    
  } catch (error) {
    console.error('Error in duplicateGoogleDoc:', error);
    throw error;
  }
};