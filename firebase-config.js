// ================================================================
// CONFIGURACION DE FIREBASE
// ================================================================
// Estas credenciales identifican tu proyecto en Firebase.
// Es normal y seguro que queden visibles en el codigo de una pagina web:
// la proteccion real de los datos la dan las Reglas de Firestore,
// no el ocultamiento de esta clave.
// ================================================================

const firebaseConfig = {
  apiKey: "AIzaSyCwi7if3T_wyU4haavk0UScoi9Qv2Ds6xA",
  authDomain: "clips-libreria.firebaseapp.com",
  projectId: "clips-libreria",
  storageBucket: "clips-libreria.firebasestorage.app",
  messagingSenderId: "91361550052",
  appId: "1:91361550052:web:b6c02377e75242f730d6f1",
  measurementId: "G-YF4D5C5NE3"
};

// Inicializar Firebase (usando la version "compat" para que sea simple)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
