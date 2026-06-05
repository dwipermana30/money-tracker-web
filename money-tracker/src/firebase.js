import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBGIoD7I1UWMLDb2b6cGxRku8twVvUHmWg',
  authDomain: 'money-planner-cfdda.firebaseapp.com',
  projectId: 'money-planner-cfdda',
  storageBucket: 'money-planner-cfdda.firebasestorage.app',
  messagingSenderId: '673016536023',
  appId: '1:673016536023:web:2d83982afd26db2aed4992',
  measurementId: 'G-PRSPNR9VP5'
};

const app = initializeApp(firebaseConfig);

if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) getAnalytics(app);
    })
    .catch(() => {});
}

export const db = getFirestore(app);