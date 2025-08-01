// app/editor/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Client components for viewing/editing songs
import ViewAll from './view_all';
import SongEdit from './song_edit';
import UserSettingBtn from './user_setting_btn';


// --- Component ---
const ManagementPage: React.FC = () => {
    // Login form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [metas, setMetas] = useState<SongMeta[]>([]);

    // Authentication & view state
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    type View = 'all' | 'edit';
    const [view, setView] = useState<View>('all');

    // Which song is being edited (or blank for a new one)
    const blankSong: SongData = { title: '', number: 0, lyrics: [], song: [] };
    const [currentSong, setCurrentSong] = useState<SongData>(blankSong);

    const router = useRouter();

    useEffect(() => {
        const user = Cookies.get('cgsb-editor');
        if (user) {
            setIsAuthenticated(true);
            console.log("Welcome Back");
        }
    }, []);

    useEffect(() => {
        if (!isAuthenticated) return;
        (async () => {
            try {
                const res = await fetch('/api/songs');
                if (!res.ok) throw new Error('Failed loading songs');
                const list: SongMeta[] = await res.json();
                const sorted = list.sort((a, b) => a.number - b.number)
                setMetas(sorted);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [isAuthenticated]);

    // Reload songs everytime back to view all
    useEffect(() => {
        if (!view || view=='edit') return; // not doing whenswitched to edit mode
        (async () => {
            try {
                const res = await fetch('/api/songs');
                if (!res.ok) throw new Error('Failed loading songs');
                const list: SongMeta[] = await res.json();
                const sorted = list.sort((a, b) => a.number - b.number)
                setMetas(sorted);
            } catch (e) {
                console.error(e);
            }
        })();
    }, [view]);

    // Attempt login against Next.js API route.
    // That API route should internally forward to `${process.env.DB_URL}/user/verify`.
    const handleLogin = async () => {
        setError(null);
        try {
            const res = await fetch('/api/user-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const payload = await res.json();
            if (res.ok) {
                setIsAuthenticated(true);
                Cookies.set('cgsb-editor', username, { expires: 7 });
                setView('all');
            } else {
                setError(payload.error || 'Authentication failed');
            }
        } catch (e) {
            console.log(e);
            setError('Network error – please try again');
        }
    };

    // Switch into “new song” mode
    const handleNewSong = () => {
        setCurrentSong(blankSong);
        setView('edit');
    };

    // When an existing song is chosen for editing:
    const handleEditSong = (song: SongData) => {
        setCurrentSong(song);
        setView('edit');
    };

    // Delete all cookie and reset auth state
    const handleLogout = () => {
        Cookies.remove('cgsb-editor');
        setIsAuthenticated(false);
        setUsername('');
        setPassword('');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {!isAuthenticated ? (
                // --- Login Form ---
                <div className="max-w-sm mx-auto mt-20 p-6 bg-white rounded shadow">
                    <h2 className="text-2xl text-black font-semibold mb-4">Please Log In</h2>
                    {error && <div className="text-red-600 mb-2">{error}</div>}
                    <input
                        className="w-full mb-3 p-2 border rounded text-black placeholder-gray-500"
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <input
                        className="w-full mb-4 p-2 border rounded text-black placeholder-gray-500"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button
                        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={handleLogin}
                    >
                        Submit
                    </button>
                </div>
            ) : (
                // --- Management UI ---
                <div>
                    <header className="flex items-center justify-between p-2 bg-white shadow">
                        <span className="text-xl min-w-[50vw] text-black font-bold">Song Editor</span>
                        <div className="space-x-2">
                            <button
                                className="px-4 mr-4 py-2 bg-green-600/80 text-white rounded hover:bg-green-700"
                                onClick={handleNewSong}
                            >
                                New Song <i className="text-xl bi bi-journal-plus"></i>
                            </button>
                            <button className="px-2 py-2 bg-transparent border-0 rounded-2xl hover:bg-gray-100"
                                title="Go back to List View (if you're in form, aware that changes will be discarded)"
                                onClick={() => setView('all')}
                            >
                                <i className="text-2xl pt-1 bi bi-card-list text-gray-900"></i>
                            </button>
                            <button className="px-2 py-2 bg-transparent border-0 rounded-2xl hover:bg-gray-100"
                                title="Go to Songbook Website"
                                onClick={() => router.push('/')}
                            >
                                <i className="text-2xl pt-1 bi bi-house text-gray-900"></i>
                            </button>
                            <UserSettingBtn onLogout={handleLogout} />
                        </div>
                    </header>

                    <main className="px-6 py-4 md:px-12">
                        {view === 'all' && (
                            // Pass down a callback so ViewAll can invoke editing
                            <ViewAll metas={metas}  onEdit={handleEditSong} />
                        )}
                        {view === 'edit' && (
                            // Provide the currentSong (blank or loaded) to your editor
                            <SongEdit 
                                songdata={currentSong} 
                                existingNumbers={metas.map(m => m.number)} 
                                onCancel={() => setView('all')} 
                            />
                        )}
                    </main>
                </div>
            )}
        </div>
    );
};

export default ManagementPage;
