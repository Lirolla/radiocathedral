
import { db } from "./firebaseConfig";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  updateDoc,
  arrayUnion,
  getDoc,
  addDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { Playlist, DJ, ScheduleItem, RadioStationConfig, AutoDJSettings, Song, Vote, InboxMessage } from "../types";

// Coleções
const COLLECTIONS = {
  PLAYLISTS: "playlists",
  DJS: "djs",
  SCHEDULE: "schedule",
  SETTINGS: "settings",
  VOTES: "votes",
  MESSAGES: "messages"
};

// --- FUNÇÃO DE DIAGNÓSTICO ---
export const testFirebaseConnection = async () => {
    try {
        const testId = "test_connection_" + Date.now();
        console.log("Tentando escrever no Firestore...", testId);
        
        await setDoc(doc(db, "connection_tests", testId), {
            status: "success",
            timestamp: new Date().toISOString(),
            message: "Se você lê isso, o banco está conectado e escrevendo!"
        });
        
        console.log("Sucesso na escrita!");
        await deleteDoc(doc(db, "connection_tests", testId)); // Limpa o teste
        return { success: true, message: "Conexão com Banco de Dados: OK! (Leitura e Escrita funcionando)" };
    } catch (error: any) {
        console.error("Falha no teste de conexão:", error);
        let msg = error.message;
        if (error.code === 'permission-denied') msg = "Permissão Negada! Suas regras de segurança bloqueiam a escrita.";
        if (error.code === 'unavailable') msg = "O cliente está offline ou não consegue alcançar o servidor do Firebase.";
        if (error.code === 'not-found' || msg.includes("project")) msg = "Banco de Dados não encontrado. Verifique se criou o Firestore no Console.";
        
        return { success: false, message: `ERRO: ${msg}`, code: error.code };
    }
};

// --- LISTENERS (REAL-TIME) ---

export const subscribeToPlaylists = (callback: (data: Playlist[]) => void) => {
  const q = query(collection(db, COLLECTIONS.PLAYLISTS));
  return onSnapshot(q, (snapshot) => {
    const playlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Playlist));
    callback(playlists);
  }, (error) => {
      console.error("Erro ao ler playlists:", error);
  });
};

export const subscribeToDJs = (callback: (data: DJ[]) => void) => {
  const q = query(collection(db, COLLECTIONS.DJS));
  return onSnapshot(q, (snapshot) => {
    const djs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DJ));
    callback(djs);
  });
};

export const subscribeToSchedule = (callback: (data: ScheduleItem[]) => void) => {
  const q = query(collection(db, COLLECTIONS.SCHEDULE));
  return onSnapshot(q, (snapshot) => {
    const schedule = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScheduleItem));
    callback(schedule);
  });
};

export const subscribeToVotes = (callback: (data: Vote[]) => void) => {
    const q = query(collection(db, COLLECTIONS.VOTES), orderBy("timestamp", "desc"), limit(500));
    return onSnapshot(q, (snapshot) => {
        const votes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
        callback(votes);
    }, (error) => {
        console.warn("Erro query complexa votos, tentando simples...", error);
        const qSimple = query(collection(db, COLLECTIONS.VOTES));
        onSnapshot(qSimple, (snap) => {
            const v = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vote));
            callback(v);
        });
    });
};

export const subscribeToMessages = (callback: (data: InboxMessage[]) => void) => {
    const q = query(collection(db, COLLECTIONS.MESSAGES), orderBy("timestamp", "desc"), limit(100));
    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboxMessage));
        callback(msgs);
    }, (error) => {
        console.warn("Erro query messages, tentando simples...", error);
        const qSimple = query(collection(db, COLLECTIONS.MESSAGES));
        onSnapshot(qSimple, (snap) => {
            const m = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InboxMessage));
            callback(m);
        });
    });
};

export const subscribeToSettings = (
    onConfig: (c: RadioStationConfig) => void, 
    onAutoDJ: (a: AutoDJSettings) => void
) => {
    return onSnapshot(doc(db, COLLECTIONS.SETTINGS, "main"), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.config) onConfig(data.config);
            if (data.autoDJ) onAutoDJ(data.autoDJ);
        }
    });
};

// --- ACTIONS (SAVE/DELETE) ---

// Mensagens (Pedidos e Histórias)
export const saveMessage = async (msg: Omit<InboxMessage, 'id'>) => {
    try {
        await addDoc(collection(db, COLLECTIONS.MESSAGES), msg);
    } catch (error: any) {
        console.error("Erro ao salvar mensagem:", error);
        throw error;
    }
};

export const toggleMessageRead = async (id: string, currentStatus: boolean) => {
    try {
        await updateDoc(doc(db, COLLECTIONS.MESSAGES, id), { read: !currentStatus });
    } catch (error) {
        console.error("Erro ao atualizar status mensagem:", error);
    }
};

export const deleteMessage = async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.MESSAGES, id));
};

// Votos
export const saveVote = async (vote: Omit<Vote, 'id'>) => {
    try {
        await addDoc(collection(db, COLLECTIONS.VOTES), vote);
    } catch (error: any) {
        console.error("Erro ao salvar voto:", error);
        alert("Erro ao registrar voto: " + error.message);
    }
};

// Playlists
export const savePlaylist = async (playlist: Playlist) => {
  try {
    const songs = Array.isArray(playlist.songs) ? playlist.songs : [];
    
    // Sanitização para remover objetos File que não podem ir pro DB
    const sanitizedSongs = songs.map(s => {
        const { file, ...rest } = s; 
        return rest;
    });
    
    await setDoc(doc(db, COLLECTIONS.PLAYLISTS, playlist.id), {
        ...playlist,
        songs: sanitizedSongs
    });
    console.log(`Playlist/Pasta '${playlist.name}' salva.`);
  } catch (error: any) {
    console.error("Erro ao salvar playlist:", error);
    alert(`Erro ao salvar: ${error.message}`);
    throw error;
  }
};

export const addSongsToPlaylistDoc = async (playlistId: string, newSongs: Song[]) => {
    try {
        const sanitizedSongs = newSongs.map(s => {
            const { file, ...rest } = s;
            return rest;
        });

        const playlistRef = doc(db, COLLECTIONS.PLAYLISTS, playlistId);
        await updateDoc(playlistRef, {
            songs: arrayUnion(...sanitizedSongs)
        });
        console.log(`${newSongs.length} músicas adicionadas à playlist ${playlistId}.`);
    } catch (error: any) {
        console.error("Erro ao salvar músicas em lote:", error);
        alert("Erro ao salvar no banco de dados: " + error.message);
        throw error;
    }
};

export const updateSongInPlaylist = async (playlistId: string, songId: string, newTitle: string, newArtist: string) => {
    try {
        const playlistRef = doc(db, COLLECTIONS.PLAYLISTS, playlistId);
        const snapshot = await getDoc(playlistRef);
        
        if (snapshot.exists()) {
            const data = snapshot.data() as Playlist;
            const updatedSongs = data.songs.map(s => {
                if (s.id === songId) {
                    return { ...s, title: newTitle, artist: newArtist };
                }
                return s;
            });
            
            await updateDoc(playlistRef, { songs: updatedSongs });
            console.log(`Música renomeada para: ${newTitle} - ${newArtist}`);
        }
    } catch (error: any) {
        console.error("Erro ao atualizar música:", error);
        alert("Erro ao atualizar: " + error.message);
    }
};

export const deletePlaylistDoc = async (id: string) => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.PLAYLISTS, id));
  } catch (error: any) {
    console.error("Erro ao deletar:", error);
    alert("Erro ao deletar: " + error.message);
  }
};

// DJs
export const saveDJ = async (dj: DJ) => {
  try {
    await setDoc(doc(db, COLLECTIONS.DJS, dj.id), dj);
  } catch (error: any) {
    console.error("Erro ao salvar DJ:", error);
    alert("Erro ao salvar DJ: " + error.message);
  }
};

export const deleteDJDoc = async (id: string) => {
  await deleteDoc(doc(db, COLLECTIONS.DJS, id));
};

// Schedule
export const saveScheduleItem = async (item: ScheduleItem) => {
  try {
    await setDoc(doc(db, COLLECTIONS.SCHEDULE, item.id), item);
  } catch (error: any) {
    console.error("Erro ao salvar agendamento:", error);
    alert("Erro ao salvar agendamento: " + error.message);
  }
};

export const deleteScheduleItemDoc = async (id: string) => {
  await deleteDoc(doc(db, COLLECTIONS.SCHEDULE, id));
};

// Settings (Config Global + AutoDJ)
export const saveStationConfig = async (config: RadioStationConfig) => {
    try {
        await setDoc(doc(db, COLLECTIONS.SETTINGS, "main"), { config }, { merge: true });
    } catch (error: any) {
        console.error("Erro ao salvar config:", error);
    }
};

export const saveAutoDJSettings = async (autoDJ: AutoDJSettings) => {
    try {
        await setDoc(doc(db, COLLECTIONS.SETTINGS, "main"), { autoDJ }, { merge: true });
    } catch (error: any) {
        console.error("Erro ao salvar autoDJ:", error);
    }
};
