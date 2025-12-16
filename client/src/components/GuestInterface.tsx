import React, { useState, useEffect, useRef } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { PhoneIcon, PhoneOffIcon, MicIcon, MicOffIcon } from './Icons';

interface GuestInterfaceProps {
  stationId: string;
}

const GuestInterface: React.FC<GuestInterfaceProps> = ({ stationId }) => {
  const [status, setStatus] = useState<'init' | 'connecting' | 'connected' | 'ended' | 'error'>('init');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callRef = useRef<MediaConnection | null>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // Clean up on unmount
    return () => {
        if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => t.stop());
        if (peerRef.current) peerRef.current.destroy();
    };
  }, []);

  const startCall = async () => {
    try {
        setStatus('connecting');
        
        // 1. Get Microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        // 2. Initialize Peer
        const peer = new Peer({ debug: 1 });
        peerRef.current = peer;

        peer.on('open', (myId) => {
            console.log("Guest ID:", myId);
            
            // 3. Call the Station
            const call = peer.call(stationId, stream);
            callRef.current = call;

            call.on('stream', (remoteStream) => {
                // In case station sends audio back
                const audio = new Audio();
                audio.srcObject = remoteStream;
                audio.play();
            });

            call.on('close', () => {
                setStatus('ended');
                stopLocalStream();
            });

            call.on('error', (err) => {
                console.error(err);
                setStatus('error');
            });
            
            // Assume connected if no immediate error (PeerJS is async)
            // Ideally we wait for connection event but for audio calls 'stream' or time delay is often used
            setTimeout(() => {
                if(status !== 'error') setStatus('connected');
            }, 1000);
        });

        peer.on('error', (err) => {
            console.error("Peer Error:", err);
            setStatus('error');
        });

    } catch (err) {
        console.error("Mic Error:", err);
        alert("Precisamos de acesso ao microfone para ligar.");
        setStatus('init');
    }
  };

  const endCall = () => {
      if (callRef.current) callRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
      stopLocalStream();
      setStatus('ended');
  };

  const stopLocalStream = () => {
      if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
      }
  };

  const toggleMute = () => {
      if (localStreamRef.current) {
          const audioTrack = localStreamRef.current.getAudioTracks()[0];
          if (audioTrack) {
              audioTrack.enabled = !audioTrack.enabled;
              setIsMicMuted(!audioTrack.enabled);
          }
      }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-black/50 backdrop-blur-md p-8 rounded-3xl border border-white/10 max-w-md w-full text-center shadow-2xl">
            <div className="w-20 h-20 bg-gray-800 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-gray-700">
                <PhoneIcon className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Linha Direta - Estúdio</h1>
            <p className="text-gray-400 mb-8">Você entrará ao vivo na programação.</p>

            {status === 'init' && (
                <button 
                    onClick={startCall}
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg transition shadow-lg shadow-green-900/50 flex items-center justify-center gap-3"
                >
                    <PhoneIcon className="w-6 h-6" />
                    Ligar Agora
                </button>
            )}

            {status === 'connecting' && (
                <div className="animate-pulse text-yellow-500 font-bold text-lg">
                    Conectando ao estúdio...
                </div>
            )}

            {status === 'connected' && (
                <div className="space-y-6">
                    <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-lg animate-pulse font-bold">
                        CONECTADO • AO VIVO
                    </div>

                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={toggleMute}
                            className={`p-4 rounded-full border ${isMicMuted ? 'bg-red-500/20 text-red-400 border-red-500' : 'bg-gray-800 text-white border-gray-600'}`}
                        >
                            {isMicMuted ? <MicOffIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
                        </button>
                        <button 
                            onClick={endCall}
                            className="p-4 rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg"
                        >
                            <PhoneOffIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}

            {status === 'ended' && (
                <div>
                    <p className="text-red-400 font-bold mb-4">Chamada Encerrada</p>
                    <button onClick={() => window.location.reload()} className="text-gray-400 underline hover:text-white">
                        Tentar novamente
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div>
                    <p className="text-red-500 font-bold mb-4">Erro na conexão</p>
                    <p className="text-sm text-gray-500 mb-4">Verifique se o estúdio está online ou tente recarregar.</p>
                    <button onClick={() => window.location.reload()} className="bg-gray-800 px-4 py-2 rounded text-white">
                        Recarregar
                    </button>
                </div>
            )}
            
            <p className="mt-8 text-xs text-gray-600">CloudWave Voice System • WebRTC Protected</p>
        </div>
    </div>
  );
};

export default GuestInterface;
