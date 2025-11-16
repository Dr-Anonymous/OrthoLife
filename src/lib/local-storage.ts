import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'ortholife-app',
  storeName: 'consultations',
  description: 'Local storage for offline consultation data.',
});

export const offlineStore = localforage.createInstance({
  name: 'ortholife-app',
  storeName: 'offlineConsultations',
});

export default localforage;
