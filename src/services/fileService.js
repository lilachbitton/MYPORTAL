import { storage } from '@/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export const uploadFile = async (file, cycleId, lessonId, fileType) => {
  if (!file) throw new Error('No file provided');
  
  const fileName = `${new Date().getTime()}-${file.name}`;
  const filePath = `courses/${cycleId}/lessons/${lessonId}/${fileType}/${fileName}`;
  const storageRef = ref(storage, filePath);
  
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};