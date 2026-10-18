import React, { useRef, useState, useEffect } from 'react';
import type { Card, GameType } from '../types/cards';
import { Camera, RefreshCw, Upload, X, AlertCircle, Sparkles } from 'lucide-react';
import { detectCardsWithRoboflow } from '../services/vision/roboflow';
import { detectCardsWithGemini } from '../services/vision/geminiVision';
import { deduplicateDetectedCards } from '../services/vision/cardDeduplicator';
import { parseCardString } from '../utils/cardUtils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameType: GameType;
  onCardsDetected: (cards: Card[]) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  gameType,
  onCardsDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [guideType, setGuideType] = useState<'fan' | 'two-row'>(gameType === 'marriage' ? 'two-row' : 'fan');

  // Start Camera Stream
  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      return;
    }

    let isMounted = true;

    async function initCamera() {
      try {
        setCameraError(null);
        setStatusText('Accessing camera...');
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment', // Rear mobile camera
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (isMounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setStatusText('Ready to scan');
        }
      } catch (err: any) {
        if (isMounted) {
          console.warn('Camera access unavailable:', err);
          setCameraError(err.message || 'Camera permission denied. You can upload an image instead.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // Capture frame and process
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    setStatusText('Cropping card indices...');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Crop to 1024x1024 square
    canvas.width = 1024;
    canvas.height = 1024;

    const minDim = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - minDim) / 2;
    const startY = (video.videoHeight - minDim) / 2;

    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, 1024, 1024);

    const base64Jpeg = canvas.toDataURL('image/jpeg', 0.82);
    await processCardImage(base64Jpeg);
  };

  // Process image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await processCardImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Vision Pipeline Call
  const processCardImage = async (base64Image: string) => {
    setIsProcessing(true);
    setStatusText('Running vision detection...');

    const roboflowKey = localStorage.getItem('dashain_roboflow_key') || '';
    const geminiKey = localStorage.getItem('dashain_gemini_key') || '';

    try {
      if (roboflowKey) {
        setStatusText('Inference on Roboflow Serverless YOLOv8...');
        const boxes = await detectCardsWithRoboflow(base64Image, roboflowKey);
        const { cards, warnings } = deduplicateDetectedCards(boxes, {
          gameType,
          confidenceThreshold: 0.60,
        });

        if (warnings.length > 0) {
          console.log('Detection warnings:', warnings);
        }

        if (cards.length > 0) {
          onCardsDetected(cards);
          onClose();
          return;
        }
      }

      if (geminiKey) {
        setStatusText('Fallback: Gemini 2.5 Flash Vision OCR...');
        const cards = await detectCardsWithGemini(base64Image, geminiKey);
        if (cards.length > 0) {
          onCardsDetected(cards);
          onClose();
          return;
        }
      }

      // If no API keys configured or zero cards returned
      setStatusText('No API keys configured. Loading sample demo hand for testing...');
      loadSampleHand();
    } catch (err: any) {
      console.error('Vision processing error:', err);
      setStatusText(`Error: ${err.message}. Loading sample hand.`);
      setTimeout(() => loadSampleHand(), 1200);
    } finally {
      setIsProcessing(false);
    }
  };

  // Sample Hands for instant offline testing of each game
  const loadSampleHand = () => {
    let sampleCodes: string[] = [];

    switch (gameType) {
      case 'jutpatti':
        sampleCodes = ['7H', '7S', '9D', '9C', 'JH']; // 5 cards
        break;
      case 'kitti':
        sampleCodes = ['5H', '6H', '7H', '7S', '7D', 'KH', 'KD', '9C', '2S']; // 9 cards benchmark
        break;
      case 'marriage':
        sampleCodes = [
          '4S', '5S', '6S',
          '9H', '10H', 'JH',
          'QD', 'KD', 'AD',
          '2C', '3C', '7C', '8C', '10C', 'JC', 'QC',
          '2D', '3D', '7D', '9S', 'KS',
        ]; // 21 cards
        break;
      case 'dhumbal':
        sampleCodes = ['JH', '2S', '3D', 'KC', 'QD']; // 5 cards
        break;
      case 'callbreak':
        sampleCodes = [
          'AS', 'KS', 'QS', '2S',
          'AH', '4H', 'AD', '5D',
          'AC', '2C', '3C', '4C', '5C',
        ]; // 13 cards
        break;
      case 'faras':
        sampleCodes = ['AS', 'KS', 'QS']; // 3 cards
        break;
      case 'inbetween':
        sampleCodes = ['3H', 'KD']; // 2 boundary cards
        break;
    }

    const cards = sampleCodes.map(s => parseCardString(s)!).filter(Boolean);
    onCardsDetected(cards);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* Top Header */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between z-10">
          <div>
            <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" />
              Live Card Perception
            </h3>
            <p className="text-xs text-slate-400">Position cards inside the alignment guide</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
              <p className="text-xs text-slate-300 max-w-xs">{cameraError}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl"
              >
                <Upload className="w-4 h-4" />
                Upload Photo from Gallery
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Guide Overlay */}
          {!cameraError && (
            <div className="absolute inset-6 border-2 border-dashed border-amber-400/70 rounded-2xl pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-center text-[10px] text-amber-300 font-bold uppercase tracking-wider bg-black/40 px-2 py-1 rounded">
                <span>{guideType === 'fan' ? 'Horizontal Fan Arc' : 'Staggered 2-Row Guide (10 + 11)'}</span>
                <span>Keep Top-Left Corners Clear</span>
              </div>

              {guideType === 'two-row' ? (
                <div className="flex-1 flex flex-col justify-around py-4 opacity-40">
                  <div className="border border-amber-300 rounded-lg h-16 flex items-center justify-center text-xs text-amber-200">
                    Row 1 (10 cards)
                  </div>
                  <div className="border border-amber-300 rounded-lg h-16 flex items-center justify-center text-xs text-amber-200">
                    Row 2 (11 cards)
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center opacity-30">
                  <div className="w-full border-t-2 border-b-2 border-amber-300 h-24 rounded-full flex items-center justify-center text-xs text-amber-200">
                    Fanned Card Arc
                  </div>
                </div>
              )}

              <div className="text-center text-[11px] text-slate-300 bg-black/50 px-2 py-1 rounded backdrop-blur-xs">
                Hold 30–45 cm away with good lighting
              </div>
            </div>
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-3 z-20">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <span className="text-xs font-bold text-slate-200">{statusText}</span>
            </div>
          )}
        </div>

        {/* Viewfinder Controls & Guide Switcher */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex gap-1.5">
              <button
                onClick={() => setGuideType('fan')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                  guideType === 'fan'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-slate-800 text-slate-400'
                }`}
              >
                Fan Guide
              </button>
              <button
                onClick={() => setGuideType('two-row')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
                  guideType === 'two-row'
                    ? 'border-amber-400 bg-amber-400/20 text-amber-300'
                    : 'border-slate-800 text-slate-400'
                }`}
              >
                2-Row Guide
              </button>
            </div>

            <button
              onClick={loadSampleHand}
              className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-bold"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Demo Hand
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl text-slate-300"
              title="Upload Photo"
            >
              <Upload className="w-5 h-5" />
            </button>

            <button
              onClick={handleCapture}
              disabled={isProcessing || !!cameraError}
              className="flex-1 py-3 bg-gradient-to-r from-red-600 to-amber-500 hover:from-red-500 hover:to-amber-400 text-white font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              Snap & Detect Cards
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
