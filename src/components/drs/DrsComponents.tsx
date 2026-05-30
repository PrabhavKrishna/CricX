'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, ChevronLeft, ChevronRight, Check, X,
  RotateCcw, ShieldAlert, Award, Camera, Mic, Loader2,
  RefreshCw, ZoomIn
} from 'lucide-react';

interface UltraEdgeStudioProps {
  onConfirmVerdict: (isOut: boolean, wicketType?: 'CAUGHT' | 'BOWLED' | 'LBW') => void;
  onClose: () => void;
  batterName: string;
  bowlerName: string;
}

const v = {
  overlay: { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } }, exit: { opacity: 0, transition: { duration: 0.2 } } } as any,
  container: { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 180, damping: 20 } }, exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } } } as any,
  panel: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } } as any,
  verdict: { hidden: { opacity: 0, y: 16, scale: 0.95 }, visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 16 } } } as any,
};

export const UltraEdgeStudio: React.FC<UltraEdgeStudioProps> = ({
  onConfirmVerdict,
  onClose,
  batterName,
  bowlerName
}) => {
  const [frame, setFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [verdict, setVerdict] = useState<'PENDING' | 'OUT' | 'NOT_OUT'>('PENDING');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPhase, setAnalysisPhase] = useState<'idle' | 'capturing' | 'processing' | 'done'>('idle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const [audioError, setAudioError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAnimationRef = useRef<number | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const TOTAL_FRAMES = 30;
  const CONTACT_FRAME = 14;

  // --- Camera & Mic (both required) ---
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true })
      .then(stream => {
        videoStreamRef.current = stream;

        if (videoRef.current) videoRef.current.srcObject = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);

        setAudioError(null);
        setCameraError(null);
      })
      .catch(err => {
        setCameraError('Camera and microphone access is required for UltraEdge analysis. Please grant permissions and reload.');
      });

    return () => {
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(t => t.stop());
        videoStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (micAnimationRef.current) {
        cancelAnimationFrame(micAnimationRef.current);
        micAnimationRef.current = null;
      }
      analyserRef.current = null;
    };
  }, []);

  // --- Audio waveform canvas render ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let renderId: number;

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.beginPath();

      if (analyserRef.current) {
        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);
        const step = width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const x = i * step;
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      } else {
        const pointsCount = 180;
        const step = width / pointsCount;
        for (let i = 0; i < pointsCount; i++) {
          const x = i * step;
          const mappedFrame = (x / width) * TOTAL_FRAMES;
          let amplitude = 4;
          const distance = Math.abs(mappedFrame - CONTACT_FRAME);
          if (distance < 1.5) {
            amplitude = 35 * Math.exp(-distance * 3) * (Math.sin(i * 1.8) + Math.cos(i * 0.8));
          } else if (distance < 3) {
            amplitude = 10 * Math.exp(-distance) * Math.sin(i * 0.9);
          } else {
            amplitude = (Math.sin(i * 0.1) * 3) + (Math.cos(i * 0.35) * 1.5) + (Math.random() * 1.5 - 0.75);
          }
          const y = height / 2 + amplitude;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle = '#00e5ff';
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'rgba(0, 229, 255, 0.5)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      const scanX = (frame / TOTAL_FRAMES) * width;
      ctx.strokeStyle = '#ff005b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(scanX, 0);
      ctx.lineTo(scanX, height);
      ctx.stroke();

      ctx.fillStyle = '#ff005b';
      ctx.beginPath();
      ctx.arc(scanX, height / 2, 4, 0, 2 * Math.PI);
      ctx.fill();

      renderId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => { if (renderId) cancelAnimationFrame(renderId); };
  }, [frame]);

  // --- Frame ticker ---
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setFrame(prev => {
          if (prev >= TOTAL_FRAMES - 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // --- Auto analysis ---
  const runAnalysis = useCallback(() => {
    setIsAnalyzing(true);
    setAnalysisPhase('capturing');
    setVerdict('PENDING');

    setTimeout(() => setAnalysisPhase('processing'), 800);

    setTimeout(() => {
      if (analyserRef.current) {
        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);
        const maxVal = Math.max(...Array.from(dataArray));
        setVerdict(maxVal > 160 ? 'OUT' : 'NOT_OUT');
      } else {
        setVerdict(Math.random() > 0.5 ? 'OUT' : 'NOT_OUT');
      }
      setAnalysisPhase('done');
      setIsAnalyzing(false);
    }, 2000);
  }, []);

  const captureFrame = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const c = document.createElement('canvas');
    c.width = video.videoWidth || 320;
    c.height = video.videoHeight || 240;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    setCapturedImage(c.toDataURL('image/jpeg'));
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        key="ultraedge-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        variants={v.overlay}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="w-full max-w-4xl p-6 rounded-2xl glass-card border border-white/10"
          variants={v.container}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <motion.span
                className="flex h-3 w-3 rounded-full bg-[#ff005b]"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              />
              <h3 className="font-display font-bold text-xl tracking-wider uppercase text-white">
                cricX UltraEdge Studio — 3rd Umpire Mode
              </h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onClose}
              className="px-3 py-1 text-sm rounded bg-white/5 text-slate-400 hover:text-white transition-colors duration-200 cursor-pointer"
            >
              Exit Studio
            </motion.button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Video / Simulated visual */}
            <motion.div
              className="relative aspect-video rounded-xl bg-slate-950/80 border border-white/5 overflow-hidden flex flex-col justify-between p-4"
              variants={v.panel}
            >
              <div className="flex justify-between items-start z-10">
                <span className="px-2 py-1 text-[11px] font-mono rounded bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 tracking-widest uppercase">
                  CAM A — Live Feed
                </span>
                <span className="font-mono text-xs text-slate-400 bg-black/40 px-2 py-1 rounded">
                  {analysisPhase === 'processing' ? 'Processing...' : `Frame ${frame}/${TOTAL_FRAMES}`}
                </span>
              </div>

              {cameraError ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6">
                  <div className="text-center space-y-3">
                    <p className="text-[#ff005b] text-sm font-medium">Camera access required</p>
                    <p className="text-slate-400 text-xs">{cameraError}</p>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors text-xs font-medium cursor-pointer"
                    >
                      Exit Studio
                    </button>
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-xl" />
                  <AnimatePresence>
                    {capturedImage && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                      >
                        <img src={capturedImage} alt="Captured" className="max-h-full rounded-lg border-2 border-[#00e5ff]/50" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence>
                    {isAnalyzing && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/70"
                      >
                        <div className="flex flex-col items-center space-y-3">
                          <span className="text-xs text-[#00e5ff] font-mono uppercase tracking-widest animate-pulse">
                            {analysisPhase === 'capturing' ? 'Capturing frame...' : 'Running edge detection...'}
                          </span>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 className="w-8 h-8 text-[#00e5ff]" />
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex justify-between items-center z-10">
                <span className="text-xs font-semibold text-slate-300">
                  Batter: <span className="text-white">{batterName}</span>
                </span>
                <span className="text-xs font-semibold text-slate-300">
                  Bowler: <span className="text-white">{bowlerName}</span>
                </span>
              </div>

              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-slate-900/80 border border-white/10 px-3 py-1 rounded-full text-[10px] font-semibold text-slate-400 z-10">
                {frame < CONTACT_FRAME - 1 && 'Ball approaching bat...'}
                {frame >= CONTACT_FRAME - 1 && frame <= CONTACT_FRAME + 1 && (
                  <span className="text-[#ff005b] font-bold animate-pulse">Contact zone! Check audio spike.</span>
                )}
                {frame > CONTACT_FRAME + 1 && 'Ball passed the bat.'}
              </div>
            </motion.div>

            {/* Soundwave */}
            <motion.div
              className="rounded-xl bg-slate-950/80 border border-white/5 p-4 flex flex-col justify-between"
              variants={v.panel}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-mono tracking-widest text-[#00f59b] uppercase">
                  UltraEdge audio sensor
                </span>
                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                  Range: 20Hz - 20kHz
                </span>
              </div>

              <div className="relative flex-1 bg-black/40 rounded-lg overflow-hidden min-h-[140px] flex items-center justify-center">
                <canvas ref={canvasRef} width={380} height={130} className="w-full h-full block" />
                <div className="absolute inset-y-0 left-1/2 w-px border-r border-dashed border-white/10 pointer-events-none" />
              </div>

              <div className="flex justify-between items-center mt-3 text-[10px] font-mono text-slate-400">
                <span>0.0s (Release)</span>
                <span className="text-[#ff005b]">0.45s (Impact Spike)</span>
                <span>1.0s (Keeper Catch)</span>
              </div>

            {!cameraError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-center justify-center mt-2 space-x-2 overflow-hidden"
              >
                <Mic className="w-3 h-3 text-[#00e5ff]" />
                <span className="text-[10px] font-mono text-[#00e5ff]">
                  Live mic — tap device to create audio ripple
                </span>
              </motion.div>
            )}
            </motion.div>
          </div>

          {/* Error banners */}
          <AnimatePresence>
            {audioError && (
              <motion.div
                key="audio-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[#ff005b]/15 border border-[#ff005b]/30 text-[#ff005b] px-4 py-2 rounded-xl text-xs font-mono mb-4 text-center"
              >
                {audioError}
              </motion.div>
            )}
            {cameraError && (
              <motion.div
                key="camera-error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-[#ff005b]/15 border border-[#ff005b]/30 text-[#ff005b] px-4 py-2 rounded-xl text-xs font-mono mb-4 text-center"
              >
                {cameraError}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <motion.div
            className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-white/5 border border-white/5 mb-4"
            variants={v.panel}
          >
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setIsPlaying(false); setFrame(0); setVerdict('PENDING'); setAnalysisPhase('idle'); }}
                className="p-2 rounded bg-white/5 hover:bg-white/10 text-white transition-colors duration-200 cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setIsPlaying(false); setFrame(f => Math.max(0, f - 1)); }}
                className="p-2 rounded bg-white/5 hover:bg-white/10 text-white transition-colors duration-200 cursor-pointer"
                disabled={frame === 0 || !!cameraError}
              >
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={!isAnalyzing && !cameraError ? { scale: 1.03 } : undefined}
                whileTap={!isAnalyzing && !cameraError ? { scale: 0.97 } : undefined}
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={isAnalyzing || !!cameraError}
                className={`px-4 py-2 rounded flex items-center space-x-2 text-sm font-bold transition-colors duration-200 cursor-pointer ${
                  isAnalyzing || cameraError
                    ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                    : isPlaying
                    ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                    : isPlaying
                      ? 'bg-[#ff005b] text-white animate-pulse'
                      : 'bg-[#00f59b] text-slate-950 hover:opacity-90'
                }`}
              >
                {isPlaying ? (
                  <><Pause className="w-4 h-4 fill-current" /><span>Pause Review</span></>
                ) : (
                  <><Play className="w-4 h-4 fill-current" /><span>Play Timeline</span></>
                )}
              </motion.button>
            </div>

            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={captureFrame}
                disabled={isAnalyzing || !!cameraError}
                className="px-3 py-2 rounded bg-white/5 text-slate-300 hover:bg-white/10 transition-colors duration-200 cursor-pointer flex items-center space-x-1.5 text-xs font-bold"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Capture</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Analyze button */}
          <motion.button
            whileHover={!isAnalyzing ? { scale: 1.01 } : undefined}
            whileTap={!isAnalyzing ? { scale: 0.99 } : undefined}
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className={`w-full py-3 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm tracking-wider uppercase transition-all duration-300 cursor-pointer ${
              isAnalyzing
                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-[#00e5ff]/20 to-[#ff005b]/20 border border-[#00e5ff]/30 text-white hover:from-[#00e5ff]/30 hover:to-[#ff005b]/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]'
            }`}
          >
            {isAnalyzing ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-5 h-5" /></motion.div><span>Analyzing...</span></>
            ) : (
              <><ZoomIn className="w-5 h-5" /><span>Run Automated Analysis</span></>
            )}
          </motion.button>

          {/* Verdict area */}
          <AnimatePresence mode="wait">
            {analysisPhase === 'done' ? (
              <motion.div
                key="verdict-done"
                variants={v.verdict}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <motion.div
                  className={`p-4 rounded-xl border mb-4 text-center transition-colors duration-500 ${
                    verdict === 'OUT'
                      ? 'bg-[#ff005b]/15 border-[#ff005b]/30 text-[#ff005b]'
                      : 'bg-[#00f59b]/15 border-[#00f59b]/30 text-[#00f59b]'
                  }`}
                >
                  <span className="text-lg font-bold tracking-wider uppercase">
                    {verdict === 'OUT' ? 'OUT — Caught detected!' : 'NOT OUT — No edge detected'}
                  </span>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Analysis</span>
                    <span className="text-sm font-bold text-slate-300">
                      Audio spike peak: {analyserRef.current ? Math.max(...Array.from(new Uint8Array(analyserRef.current.frequencyBinCount))) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-center space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVerdict('OUT')}
                      className={`px-5 py-3 rounded-xl flex items-center space-x-2 font-display font-bold text-base border transition-colors duration-200 cursor-pointer ${
                        verdict === 'OUT'
                          ? 'bg-[#ff005b]/25 text-[#ff005b] border-[#ff005b] shadow-[0_0_15px_rgba(255,0,91,0.2)]'
                          : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                      <span>OUT (Caught)</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVerdict('NOT_OUT')}
                      className={`px-5 py-3 rounded-xl flex items-center space-x-2 font-display font-bold text-base border transition-colors duration-200 cursor-pointer ${
                        verdict === 'NOT_OUT'
                          ? 'bg-[#00f59b]/20 text-[#00f59b] border-[#00f59b] shadow-[0_0_15px_rgba(0,245,155,0.2)]'
                          : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
                      }`}
                    >
                      <Award className="w-5 h-5" />
                      <span>NOT OUT</span>
                    </motion.button>
                  </div>

                  <div className="flex justify-end">
                    <motion.button
                      whileHover={verdict !== 'PENDING' ? { scale: 1.03 } : undefined}
                      whileTap={verdict !== 'PENDING' ? { scale: 0.97 } : undefined}
                      onClick={() => {
                        if (verdict === 'PENDING') return;
                        onConfirmVerdict(verdict === 'OUT', 'CAUGHT');
                      }}
                      disabled={verdict === 'PENDING'}
                      className={`w-full md:w-auto px-6 py-3 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm tracking-wider uppercase transition-colors duration-200 cursor-pointer ${
                        verdict !== 'PENDING'
                          ? 'bg-white text-slate-950 hover:bg-slate-200'
                          : 'bg-white/5 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Verdict</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="verdict-idle"
                variants={v.verdict}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center"
              >
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col items-center justify-center">
                  <span className="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Analysis</span>
                  <span className="text-sm font-bold text-slate-300">
                    {frame === CONTACT_FRAME ? 'SPIKE DETECTED (Bat Edge!)' : 'No bat contact registered'}
                  </span>
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVerdict('OUT')}
                    className={`px-5 py-3 rounded-xl flex items-center space-x-2 font-display font-bold text-base border transition-colors duration-200 cursor-pointer ${
                      verdict === 'OUT'
                        ? 'bg-[#ff005b]/25 text-[#ff005b] border-[#ff005b] shadow-[0_0_15px_rgba(255,0,91,0.2)]'
                        : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <ShieldAlert className="w-5 h-5" />
                    <span>OUT (Caught)</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setVerdict('NOT_OUT')}
                    className={`px-5 py-3 rounded-xl flex items-center space-x-2 font-display font-bold text-base border transition-colors duration-200 cursor-pointer ${
                      verdict === 'NOT_OUT'
                        ? 'bg-[#00f59b]/20 text-[#00f59b] border-[#00f59b] shadow-[0_0_15px_rgba(0,245,155,0.2)]'
                        : 'bg-transparent text-slate-300 border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <Award className="w-5 h-5" />
                    <span>NOT OUT</span>
                  </motion.button>
                </div>

                <div className="flex justify-end">
                  <motion.button
                    whileHover={verdict !== 'PENDING' ? { scale: 1.03 } : undefined}
                    whileTap={verdict !== 'PENDING' ? { scale: 0.97 } : undefined}
                    onClick={() => {
                      if (verdict === 'PENDING') return;
                      onConfirmVerdict(verdict === 'OUT', 'CAUGHT');
                    }}
                    disabled={verdict === 'PENDING'}
                    className={`w-full md:w-auto px-6 py-3 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm tracking-wider uppercase transition-colors duration-200 cursor-pointer ${
                      verdict !== 'PENDING'
                        ? 'bg-white text-slate-950 hover:bg-slate-200'
                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm Verdict</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- CREASE AND HEIGHT NO-BALL INSPECTOR ---
interface NoBallInspectorProps {
  onResolve: (isNoBall: boolean, reason?: string) => void;
  onClose: () => void;
  ballsPerOver: number;
}

export const NoBallInspector: React.FC<NoBallInspectorProps> = ({
  onResolve,
  onClose,
  ballsPerOver
}) => {
  const [activeTab, setActiveTab] = useState<'CREASE' | 'HEIGHT'>('CREASE');
  const [shoePosition, setShoePosition] = useState(65);
  const [ballHeight, setBallHeight] = useState(105);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoResult, setAutoResult] = useState<{ isNoBall: boolean; reason: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | null>(null);

  const waistLimit = 110;
  const shoulderLimit = 145;

  // Camera (required)
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        videoStreamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      })
      .catch(() => {
        setCameraError('Camera access is required for No-Ball inspection. Please grant permissions and reload.');
      });
    return () => {
      if (videoStreamRef.current) videoStreamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const runAutoInspection = useCallback(() => {
    setIsAnalyzing(true);
    setAutoResult(null);
    setTimeout(() => {
      let isNoBall: boolean;
      let reason: string;
      if (activeTab === 'CREASE') {
        isNoBall = shoePosition > 60;
        reason = isNoBall ? `Foot overstep: heel ${shoePosition}% past crease` : 'Legal foot landing';
      } else {
        isNoBall = ballHeight > waistLimit;
        reason = isNoBall ? `Ball height ${ballHeight}cm exceeds waist limit ${waistLimit}cm` : `Ball height ${ballHeight}cm within legal range`;
      }
      setAutoResult({ isNoBall, reason });
      setIsAnalyzing(false);
    }, 1500);
  }, [activeTab, shoePosition, ballHeight, waistLimit]);

  return (
    <AnimatePresence>
      <motion.div
        key="noball-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
        variants={v.overlay}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <motion.div
          className="w-full max-w-2xl p-6 rounded-2xl glass-card border border-white/10"
          variants={v.container}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Header Tabs */}
          <div className="flex items-center justify-between pb-3 mb-6 border-b border-white/10">
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setActiveTab('CREASE'); setAutoResult(null); }}
                className={`px-4 py-2 rounded-lg font-display text-sm font-bold border transition-colors duration-200 cursor-pointer ${
                  activeTab === 'CREASE'
                    ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Crease Line Check
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setActiveTab('HEIGHT'); setAutoResult(null); }}
                className={`px-4 py-2 rounded-lg font-display text-sm font-bold border transition-colors duration-200 cursor-pointer ${
                  activeTab === 'HEIGHT'
                    ? 'bg-[#00e5ff]/15 text-[#00e5ff] border-[#00e5ff]/30'
                    : 'bg-transparent text-slate-400 border-transparent hover:text-white'
                }`}
              >
                Overheight Check
              </motion.button>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 transition-colors duration-200 cursor-pointer"
              >
                Cancel
              </motion.button>
            </div>
          </div>

          {/* Tab CONTENT 1: Crease */}
          <AnimatePresence mode="wait">
            {activeTab === 'CREASE' && (
              <motion.div
                key="crease"
                variants={v.panel}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-6"
              >
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
                    Bowler Popping Crease Scanner
                  </span>

                  <div className="relative h-48 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                    {cameraError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                        <p className="text-[#ff005b] text-xs text-center">{cameraError}</p>
                      </div>
                    ) : (
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    )}

                    <div className="absolute inset-y-0 left-[60%] w-0.5 bg-[#00f59b] border-r border-dashed border-[#00f59b]/40 flex flex-col justify-between items-center py-2 z-10">
                      <span className="px-1 text-[8px] font-mono rounded bg-[#00f59b] text-slate-950 font-bold -translate-x-1/2">CREASE LINE</span>
                      <span className="px-1 text-[8px] font-mono rounded bg-[#00f59b] text-slate-950 font-bold -translate-x-1/2">POP LINE</span>
                    </div>

                    {(() => {
                      const shoeLeft = `${shoePosition - 15}%`;
                      const isOver = shoePosition > 60;
                      return (
                        <motion.div
                          className="absolute bottom-6 flex flex-col items-center"
                          animate={{ left: shoeLeft }}
                          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                        >
                          <div className="h-10 w-24 rounded-full bg-white border-2 border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-900 relative">
                            Shoe Heel
                            <div className="absolute bottom-[-4px] left-8 w-2 h-1 bg-slate-400" />
                            <div className="absolute bottom-[-4px] left-16 w-2 h-1 bg-slate-400" />
                          </div>
                          <motion.span
                            animate={{ scale: [1, 1.05, 1] }}
                            transition={{ duration: 0.3 }}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded mt-2 font-bold transition-colors duration-200 ${
                              isOver ? 'bg-[#ff005b]/20 text-[#ff005b]' : 'bg-[#00f59b]/20 text-[#00f59b]'
                            }`}
                          >
                            {isOver ? 'OVER CREASE (NO BALL)' : 'LEGAL LANDING'}
                          </motion.span>
                        </motion.div>
                      );
                    })()}

                    <div className="absolute bottom-0 inset-x-0 h-6 bg-[#002f1d]/50 border-t border-white/5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>Calibrate foot position (scrub to review)</span>
                    <span className="font-mono text-[#00e5ff] font-bold">
                      {shoePosition > 60 ? 'Overstep detected' : 'Legal heel behind line'}
                    </span>
                  </div>
                  <input
                    type="range" min="20" max="95" value={shoePosition}
                    onChange={(e) => setShoePosition(parseInt(e.target.value))}
                    className="w-full accent-[#ff005b] cursor-pointer h-1.5 rounded bg-slate-800 transition-all duration-200"
                  />
                </div>

                <motion.button
                  whileHover={!isAnalyzing ? { scale: 1.01 } : undefined}
                  whileTap={!isAnalyzing ? { scale: 0.99 } : undefined}
                  onClick={runAutoInspection}
                  disabled={isAnalyzing}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm transition-all duration-300 cursor-pointer ${
                    isAnalyzing
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00e5ff]/20 to-[#00f59b]/20 border border-[#00e5ff]/30 text-white hover:from-[#00e5ff]/30 hover:to-[#00f59b]/30'
                  }`}
                >
                  {isAnalyzing ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-4 h-4" /></motion.div><span>Inspecting...</span></>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /><span>Run Auto Inspection</span></>
                  )}
                </motion.button>

                <AnimatePresence>
                  {autoResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={`p-3 rounded-xl border text-center text-xs font-bold ${
                        autoResult.isNoBall
                          ? 'bg-[#ff005b]/15 border-[#ff005b]/30 text-[#ff005b]'
                          : 'bg-[#00f59b]/15 border-[#00f59b]/30 text-[#00f59b]'
                      }`}
                    >
                      {autoResult.isNoBall ? `NO BALL — ${autoResult.reason}` : `Legal — ${autoResult.reason}`}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onResolve(true, autoResult?.reason || 'Foot Overstep')}
                    className="px-5 py-2.5 rounded-xl font-display font-bold text-sm bg-[#ff005b] text-white hover:opacity-90 transition-opacity duration-200 cursor-pointer flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Declare NO BALL</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onResolve(false)}
                    className="px-5 py-2.5 rounded-xl font-display font-bold text-sm bg-[#00f59b] text-slate-950 hover:opacity-90 transition-opacity duration-200 cursor-pointer flex items-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Legal Delivery</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {activeTab === 'HEIGHT' && (
              <motion.div
                key="height"
                variants={v.panel}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="space-y-6"
              >
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col justify-between">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-3">
                    Waist & Shoulder height Radar
                  </span>

                  <div className="relative h-56 bg-slate-900 border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
                    {cameraError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                        <p className="text-[#ff005b] text-xs text-center">{cameraError}</p>
                      </div>
                    ) : (
                      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                    )}

                    <div className="absolute inset-x-0 bottom-[40%] border-t border-dashed border-[#ff005b]/60 flex justify-between items-center px-4 z-10">
                      <span className="text-[9px] font-mono font-bold text-[#ff005b] bg-black/60 px-1.5 py-0.5 rounded -translate-y-1/2">
                        WAIST LIMIT ({waistLimit}cm)
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[#ff005b]">No-Ball Cutoff</span>
                    </div>

                    <div className="absolute inset-x-0 bottom-[60%] border-t border-dashed border-[#f59e0b]/60 flex justify-between items-center px-4 z-10">
                      <span className="text-[9px] font-mono font-bold text-[#f59e0b] bg-black/60 px-1.5 py-0.5 rounded -translate-y-1/2">
                        SHOULDER BOUNCER ({shoulderLimit}cm)
                      </span>
                      <span className="text-[9px] font-mono font-bold text-[#f59e0b]">Bouncer Limit</span>
                    </div>

                    <svg className="absolute bottom-0 left-[20%] w-24 h-48 pointer-events-none opacity-45" viewBox="0 0 100 200">
                      <circle cx="50" cy="40" r="10" fill="#ffffff" />
                      <line x1="50" y1="50" x2="50" y2="60" stroke="#ffffff" strokeWidth="4" />
                      <line x1="50" y1="60" x2="45" y2="120" stroke="#ffffff" strokeWidth="4" />
                      <line x1="50" y1="70" x2="25" y2="100" stroke="#ffffff" strokeWidth="3" />
                      <line x1="45" y1="120" x2="35" y2="180" stroke="#ffffff" strokeWidth="4" />
                      <line x1="45" y1="120" x2="55" y2="180" stroke="#ffffff" strokeWidth="4" />
                    </svg>

                    {(() => {
                      const isWaistNoBall = ballHeight > waistLimit;
                      const isBouncer = ballHeight > shoulderLimit;
                      const bottomOffset = `${((ballHeight - 40) / 140) * 100}%`;
                      return (
                        <motion.div
                          className="absolute right-[35%] flex items-center space-x-3"
                          animate={{ bottom: bottomOffset }}
                          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
                        >
                          <div className="w-4 h-4 rounded-full bg-[#ff005b] filter drop-shadow-[0_0_8px_#ff005b]" />
                          <div className={`px-2 py-0.5 text-[9px] font-mono font-bold rounded transition-colors duration-200 ${
                            isWaistNoBall ? 'bg-[#ff005b] text-white' : isBouncer ? 'bg-[#f59e0b] text-slate-950' : 'bg-[#00f59b] text-slate-950'
                          }`}>
                            {ballHeight}cm — {isWaistNoBall ? 'WAIST NO-BALL' : isBouncer ? 'BOUNCER (LEGAL)' : 'LEGAL'}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-300">
                    <span>Adjust delivery height (Relative to batter stance)</span>
                    <span className="font-mono text-[#00e5ff] font-bold">
                      {ballHeight > waistLimit ? 'Over Waist Full-Toss (No Ball)' : ballHeight > shoulderLimit ? 'Bouncer (Legal over limit check)' : 'Standard legal delivery'}
                    </span>
                  </div>
                  <input
                    type="range" min="50" max="170" value={ballHeight}
                    onChange={(e) => setBallHeight(parseInt(e.target.value))}
                    className="w-full accent-[#00e5ff] cursor-pointer h-1.5 rounded bg-slate-800 transition-all duration-200"
                  />
                </div>

                <motion.button
                  whileHover={!isAnalyzing ? { scale: 1.01 } : undefined}
                  whileTap={!isAnalyzing ? { scale: 0.99 } : undefined}
                  onClick={runAutoInspection}
                  disabled={isAnalyzing}
                  className={`w-full py-2.5 rounded-xl flex items-center justify-center space-x-2 font-bold text-sm transition-all duration-300 cursor-pointer ${
                    isAnalyzing
                      ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-[#00e5ff]/20 to-[#f59e0b]/20 border border-[#00e5ff]/30 text-white hover:from-[#00e5ff]/30 hover:to-[#f59e0b]/30'
                  }`}
                >
                  {isAnalyzing ? (
                    <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><Loader2 className="w-4 h-4" /></motion.div><span>Inspecting...</span></>
                  ) : (
                    <><RefreshCw className="w-4 h-4" /><span>Run Auto Inspection</span></>
                  )}
                </motion.button>

                <AnimatePresence>
                  {autoResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className={`p-3 rounded-xl border text-center text-xs font-bold ${
                        autoResult.isNoBall
                          ? 'bg-[#ff005b]/15 border-[#ff005b]/30 text-[#ff005b]'
                          : 'bg-[#00f59b]/15 border-[#00f59b]/30 text-[#00f59b]'
                      }`}
                    >
                      {autoResult.isNoBall ? `NO BALL — ${autoResult.reason}` : `Legal — ${autoResult.reason}`}
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onResolve(true, autoResult?.reason || `Waist Height: ${ballHeight}cm`)}
                    className="px-5 py-2.5 rounded-xl font-display font-bold text-sm bg-[#ff005b] text-white hover:opacity-90 transition-opacity duration-200 cursor-pointer flex items-center space-x-2"
                  >
                    <X className="w-4 h-4" />
                    <span>Declare NO BALL</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onResolve(false)}
                    className="px-5 py-2.5 rounded-xl font-display font-bold text-sm bg-[#00f59b] text-slate-950 hover:opacity-90 transition-opacity duration-200 cursor-pointer flex items-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Legal Delivery</span>
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
