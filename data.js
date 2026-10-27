import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCieRyfvV3aNcy0eeohLr2CCaUs8P7mmis",
  authDomain: "aqar-system-6065a.firebaseapp.com",
  projectId: "aqar-system-6065a",
  storageBucket: "aqar-system-6065a.firebasestorage.app",
  messagingSenderId: "888944331648",
  appId: "1:888944331648:web:73e7b7c5b42f714dd70f65",
  measurementId: "G-JQ0WGE3T60"
};

// تهيئة عادية جداً من غير أي تعقيدات
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function getCollectionData(colName) {
  const querySnapshot = await getDocs(collection(db, colName));
  const arr = [];
  querySnapshot.forEach((doc) => {
    arr.push({ ...doc.data(), id: doc.id });
  });
  return arr;
}

const DataAPI = {
  async login(username, password) {
    const users = await getCollectionData('users');
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      localStorage.setItem('aqar_current_user', JSON.stringify(user));
      return user;
    }
    return null;
  },
  
  getCurrentUser() {
    const userStr = localStorage.getItem('aqar_current_user');
    return userStr ? JSON.parse(userStr) : null;
  },

  logout() {
    localStorage.removeItem('aqar_current_user');
  },
  
  async getUsers() { return await getCollectionData('users'); },
  async getSalesUsers() {
    const users = await this.getUsers();
    return users.filter(u => u.role === 'sales');
  },
  async getUserName(username) {
    const users = await this.getUsers();
    return users.find(u => u.username === username)?.name || 'غير محدد';
  },
  async addUser(userData) {
    await setDoc(doc(db, "users", userData.username), userData);
  },
  async updateUser(username, data) {
    await updateDoc(doc(db, "users", username), data);
  },
  async deleteUser(username) {
    await deleteDoc(doc(db, "users", username));
  },

  async getOwners() { return await getCollectionData('owners'); },
  async addOwner(data) {
    const newDoc = doc(collection(db, "owners"));
    await setDoc(newDoc, { ...data, createdAt: new Date().toISOString().slice(0,10) });
    return { ...data, id: newDoc.id };
  },
  async updateOwner(id, data) { await updateDoc(doc(db, "owners", String(id)), data); },
  async deleteOwner(id) { await deleteDoc(doc(db, "owners", String(id))); },
  async getOwnerName(id) {
    if (!id) return '—';
    const docRef = doc(db, "owners", String(id));
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data().name : '—';
  },
  async getOwnerUnitsCount(id) {
    const units = await this.getUnits();
    return units.filter(u => String(u.ownerId) === String(id)).length;
  },
  
  async getClients(currentUser = null) {
    let clients = await getCollectionData('clients');
    if (currentUser && currentUser.role === 'sales') {
      clients = clients.filter(c => c.assignedTo === currentUser.username);
    }
    return clients;
  },
  async addClient(data) {
    const newDoc = doc(collection(db, "clients"));
    await setDoc(newDoc, { ...data, createdAt: new Date().toISOString().slice(0,10), feedbacks: [] });
    return { ...data, id: newDoc.id };
  },
  async updateClient(id, data) { await updateDoc(doc(db, "clients", String(id)), data); },
  async deleteClient(id) { await deleteDoc(doc(db, "clients", String(id))); },
  
  async addClientFeedback(clientId, text, byUser) {
    const docRef = doc(db, "clients", String(clientId));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const feedbacks = data.feedbacks || [];
      feedbacks.push({ text, by: byUser, date: new Date().toLocaleDateString('ar-EG') });
      await updateDoc(docRef, { feedbacks });
    }
  },
  
  async getUnits() { return await getCollectionData('units'); },
  async addUnit(data) {
    const newDoc = doc(collection(db, "units"));
    await setDoc(newDoc, { ...data, createdAt: new Date().toISOString().slice(0,10) });
    return { ...data, id: newDoc.id };
  },
  async updateUnit(id, data) { await updateDoc(doc(db, "units", String(id)), data); },
  async deleteUnit(id) { await deleteDoc(doc(db, "units", String(id))); },

  async getTodos() { return await getCollectionData('todos'); },
  async addTodo(text) {
    const newDoc = doc(collection(db, "todos"));
    await setDoc(newDoc, { text });
    return { text, id: newDoc.id };
  },
  async deleteTodo(id) { await deleteDoc(doc(db, "todos", String(id))); }
};

async function seedInitialAdmin() {
  const users = await getCollectionData('users');
  if (users.length === 0) {
    await setDoc(doc(db, "users", "admin"), {
      username: "admin", password: "123456", name: "المدير", role: "admin"
    });
  }
}
seedInitialAdmin();

window.DataAPI = DataAPI;