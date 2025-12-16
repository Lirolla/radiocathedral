import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ audioRef, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // Initialize useRef with 0 to fix "Expected 1 arguments, but got 0" error
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    // Inicialização do AudioContext
    if (isPlaying && !audioContextRef.current && audioRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64; // Menos barras, mas mais largas
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Conectar fonte
        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(ctx.destination);
      } catch (e) {
        console.error("AudioContext init error (using simulation fallback):", e);
      }
    }

    if (isPlaying && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  }, [isPlaying, audioRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      // Configuração
      const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 32;
      const dataArray = analyserRef.current ? new Uint8Array(bufferLength) : new Uint8Array(bufferLength);
      
      let hasRealData = false;

      // Tenta pegar dados reais
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        // Verifica se existe algum som real tocando (soma dos dados > 0)
        if (dataArray.some(val => val > 0)) {
           hasRealData = true;
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        let barHeight = 0;

        if (isPlaying) {
            if (hasRealData) {
                // DADOS REAIS
                // Multiplicador 0.8 para ajustar altura
                barHeight = (dataArray[i] / 255) * canvas.height * 0.9;
            } else {
                // SIMULAÇÃO (Se estiver tocando mas sem dados reais/CORS/Loading)
                // Cria um efeito de onda senoidal com ruído para parecer equalizador
                const time = Date.now() / 150;
                const noise = Math.sin(i * 0.4 + time) * 0.5 + 0.5; // 0 a 1
                const random = Math.random() * 0.3;
                barHeight = (noise + random) * canvas.height * 0.6;
            }
        } else {
            // IDLE (Pausado) - Linha baixa pulsando levemente
            barHeight = 4 + Math.sin(Date.now() / 500 + i) * 2;
        }

        // Gradiente Dinâmico
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#9333ea'); // Purple 600
        gradient.addColorStop(1, '#db2777'); // Pink 600

        ctx.fillStyle = gradient;
        
        // Desenha a barra com cantos arredondados (simulado)
        if (barHeight > 0) {
            ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        }

        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={50} 
      className="w-full h-full opacity-80"
    />
  );
};

export default Visualizer;