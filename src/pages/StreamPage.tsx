import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import videojs from 'video.js'; // only default import

type StreamInfo = {
  id: string;
  title: string;
  streamer: string;
  viewerCount: number;
  description: string;
};

export default function StreamPage() {
  const { id } = useParams<{ id: string }>();
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<videojs.Player | null>(null);

  // Fetch dummy stream info
  useEffect(() => {
    const dummy: StreamInfo = {
      id: id || 'unknown',
      title: id === '1' ? 'First Live Stream' : 'Stream ' + id,
      streamer: id === '1' ? 'testuser' : 'streamer_' + id,
      viewerCount: 1234,
      description: 'This is a placeholder description for stream ' + id,
    };
    setStream(dummy);
  }, [id]);

  // Initialize Video.js when stream is ready
  useEffect(() => {
    if (stream && videoRef.current) {
      // Only initialize once
      if (!playerRef.current) {
        playerRef.current = videojs(videoRef.current, {
          controls: true,
          fluid: true,
          responsive: true,
          sources: [
            {
              src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              type: 'application/x-mpegURL',
            },
          ],
        });
      }
    }
    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [stream]);

  if (!stream) {
    return <div className="min-h-screen flex items-center justify-center">Loading Stream…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex items-center justify-between mb-6">
        <Link to="/home" className="text-primary hover:underline">
          ← Back to Browse
        </Link>
        <h1 className="text-2xl font-bold">{stream.title}</h1>
      </header>

      {/* Video.js player container */}
      <div className="mb-4">
        <div data-vjs-player>
          <video ref={videoRef} className="video-js vjs-big-play-centered" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <p className="text-sm text-gray-600 mb-2">by {stream.streamer}</p>
        <p className="text-sm text-gray-600 mb-2">Viewers: {stream.viewerCount}</p>
        <p className="text-gray-700">{stream.description}</p>
      </div>

      {/* Chat placeholder */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Chat</h2>
        <p className="text-sm text-gray-500">Chat interface will go here.</p>
      </div>
    </div>
  );
}
