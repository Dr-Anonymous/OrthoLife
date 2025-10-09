import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAn399dZzlbHg6dJ97rvATf7XgFKXXr5X8",
  authDomain: "ortholife-otp-auth.firebaseapp.com",
  projectId: "ortholife-otp-auth",
  storageBucket: "ortholife-otp-auth.web.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
