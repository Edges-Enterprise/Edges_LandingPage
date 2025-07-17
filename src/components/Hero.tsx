'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const Hero: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Images in public/assets/images/
  const adImages: string[] = [
    '/assets/images/ad1.jpg',
    '/assets/images/ad2.jpg',
    '/assets/images/ad3.jpg',
    '/assets/images/ad4.jpg',
    '/assets/images/ad5.jpg',
    '/assets/images/ad6.jpg',
    '/assets/images/ad7.jpg',
    '/assets/images/ad8.jpg',
    '/assets/images/ad9.jpg',
    '/assets/images/ad10.jpg',
  ];

  // Audio tracks in public/assets/audio/
  const audioTracks: string[] = [
    '/assets/audio/track1.mp3',
    '/assets/audio/track2.mp3',
    '/assets/audio/track3.mp3',
    '/assets/audio/track4.mp3',
    '/assets/audio/track5.mp3',
    '/assets/audio/track6.mp3',
    '/assets/audio/track7.mp3',
    '/assets/audio/track8.mp3',
    '/assets/audio/track9.mp3',
  ];

  // Map image index to audio track (reuse track1 for the 10th image)
  const getAudioIndex = (imageIndex: number): number => {
    return imageIndex === 9 ? 0 : imageIndex; // 10th image uses track1
  };

  // Change image and audio every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % adImages.length);
      // Simulate audio fade-out by muting briefly
      if (audioRef.current) {
        audioRef.current.muted = true;
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.muted = isMuted; // Restore mute state
          }
        }, 500); // 0.5s fade-out effect
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [adImages.length, isMuted]);

  // Handle mute/unmute toggle
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      {/* Slideshow Images */}
      {adImages.map((image, index) => (
        <motion.img
          key={index}
          src={image}
          alt={`Ad ${index + 1}`}
          className="absolute w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: index === currentImageIndex ? 1 : 0 }}
          transition={{ duration: 1 }}
        />
      ))}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Audio Background Music */}
      <audio
        ref={audioRef}
        autoPlay
        loop
        src={audioTracks[getAudioIndex(currentImageIndex)]}
      />

      {/* Content */}
      <div className="relative z-10 text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-4xl md:text-6xl font-bold mb-4 text-white"
        >
          Empower Your Data with Edges Network
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-lg md:text-2xl mb-8 max-w-2xl mx-auto text-white"
        >
          Buy and sell data seamlessly with our secure, high-speed platform.
        </motion.p>
        <motion.a
          href="/signup"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-blue-700 transition"
        >
          Start Now
        </motion.a>
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute bottom-10 right-10 bg-white text-black px-4 py-2 rounded-full opacity-75 hover:opacity-100 transition"
        >
          {isMuted ? 'Unmute' : 'Mute'}
        </button>
      </div>
    </section>
  );
};

export default Hero;
