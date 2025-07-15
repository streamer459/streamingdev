import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

type ChannelInfo = {
  username: string;
  bio: string;
  totalFollowers: number;
  live: boolean;
};

export default function ChannelPage() {
  const { username } = useParams<{ username: string }>();
  const [channel, setChannel] = useState<ChannelInfo | null>(null);

  // Simulate fetching channel info
  useEffect(() => {
    // TODO: replace with real API call: GET /api/users/:username
    const dummy: ChannelInfo = {
      username: username || 'unknown',
      bio: "This is " + (username || 'unknown') + "'s bio.",
      totalFollowers: 987,
      live: Math.random() > 0.5,
    };
    setChannel(dummy);
  }, [username]);

  if (!channel) {
    return <div className="min-h-screen flex items-center justify-center">Loading Channel…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-6">
        <Link to="/home" className="text-primary hover:underline">
          ← Back to Browse
        </Link>
        <div className="flex items-center mt-4">
          <div className="h-16 w-16 bg-gray-300 rounded-full mr-4 flex items-center justify-center text-xl">
            {channel.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{channel.username}</h1>
            <p className="text-sm text-gray-600">Followers: {channel.totalFollowers}</p>
          </div>
        </div>
      </header>

      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-lg font-semibold">About</h2>
        <p className="text-gray-700 mt-2">{channel.bio}</p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Currently Live</h2>
        {channel.live ? (
          <Link
            to={`/stream/${channel.username}`}
            className="inline-block bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
          >
            Watch Live Now
          </Link>
        ) : (
          <p className="text-gray-500">This channel is not live currently.</p>
        )}
      </div>
    </div>
  );
}
