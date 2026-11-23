// app/editor/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Client components for viewing/editing songs
import ViewAll from './view_all';
import SongEdit from './song_edit';
import UserSettingBtn from './user_setting_btn';
import LoadingIndicator from '../utils/loading-indicator';


// --- Component ---
const ManagementPage: React.FC = () => {
    // Login form state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // null = not loaded yet
    const [metas, setMetas] = useState<SongMeta[] | null>(null);

    // Authentication & view state (the session itself is an httpOnly cookie checked by the server)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [currentUser, setCurrentUser] = useState('');
    type View = 'all' | 'edit';
    const [view, setView] = useState<View>('all');

    // Which song is being edited (or blank for a new one)
    const blankSong: SongData = { title: '', number: 0, lyrics: [], song: [] };
    const [currentSong, setCurrentSong] = useState<SongData>(blankSong);
    // Bumped every time the editor is opened, so the form always starts fresh
    const [editKey, setEditKey] = useState(0);

    const router = useRouter();

    // Ask the server whether we are already logged in
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/session');
                if (res.ok) {
                    const { username } = await res.json();
                    setCurrentUser(username);
                    setIsAuthenticated(true);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setCheckingSession(false);
            }
        })();
    }, []);

    // (Re)load songs after login and every time we are back to view all
    useEffect(() => {
        if (!isAuthenticated || view == 'edit') return; // not doing when switched to edit mode
        (async () => {
            try {
                const res = await fetch('/api/songs');
                if (!res.ok) throw new Error('Failed loading songs');
                const list: SongMeta[] = await res.json();
                const sorted = list.sort((a, b) => a.number - b.number)
                setMetas(sorted);
            } catch (e) {
                console.error(e);
                setMetas(current => current ?? []);
            }
        })();
    }, [isAuthenticated, view]);

    // Attempt login against Next.js API route.
    // That API route should internally forward to `${process.env.DB_URL}/user/verify`.
    const handleLogin = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setError(null);
        try {
            const res = await fetch('/api/user-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const payload = await res.json();
            if (res.ok) {
                setCurrentUser(payload.username ?? username);
                setIsAuthenticated(true);
                setView('all');
            } else {
                setError(payload.error || 'Authentication failed');
            }
        } catch (e) {
            console.error(e);
            setError('Network error – please try again');
        }
    };

    // Switch into “new song” mode
    const handleNewSong = () => {
        setCurrentSong(blankSong);
        setEditKey(k => k + 1);
        setView('edit');
    };

    // When an existing song is chosen for editing:
    const handleEditSong = (song: SongData) => {
        setCurrentSong(song);
        setEditKey(k => k + 1);
        setView('edit');
    };

    // End the server session and reset auth state
    const handleLogout = async () => {
        try {
            await fetch('/api/session', { method: 'DELETE' });
        } catch (e) {
            console.error(e);
        }
        setIsAuthenticated(false);
        setCurrentUser('');
        setMetas(null);
        setUsername('');
        setPassword('');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {checkingSession ? (
                <div className="min-h-screen flex items-center justify-center">
                    <LoadingIndicator color='black' />
                </div>
            ) : !isAuthenticated ? (
                // --- Login Form ---
                <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200">
                    <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
                        <h2 className="text-3xl font-bold text-gray-800 text-center mb-6">
                            CG Songbook - Online Editor
                        </h2>

                        {/* Use a form so Enter works */}
                        <form onSubmit={handleLogin}>
                            <input
                                className="w-full mb-4 p-3 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                            <div className="relative mb-6">
                                <input
                                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-gray-800 placeholder-gray-400 
                                                focus:outline-none focus:ring-2 focus:ring-blue-400"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                {/* Toggle button */}
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}  // prevents focus stealing
                                >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'} text-xl`}></i>
                                </button>
                            </div>
                            
                            {error && (
                                <div className="text-red-600 text-sm text-center mb-4">{error}</div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                Login
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                // --- Management UI ---
                <div className='from-blue-200 via-white to-blue-300'>
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
                            <UserSettingBtn username={currentUser} onLogout={handleLogout} />
                        </div>
                    </header>

                    <main className="px-6 py-4 md:px-12">
                        {metas ?
                            <>
                                {view === 'all' && (
                                    // Pass down a callback so ViewAll can invoke editing
                                    <ViewAll metas={metas} onEdit={handleEditSong} />
                                )}
                                {view === 'edit' && (
                                    // Provide the currentSong (blank or loaded) to your editor
                                    <SongEdit
                                        key={editKey}
                                        songdata={currentSong}
                                        existingNumbers={metas.map(m => m.number)}
                                        onCancel={() => setView('all')}
                                    />
                                )}
                            </>
                            :
                            <div className="w-full min-h-[60vh] flex flex-col justify-center items-center text-center">
                                <LoadingIndicator color='black' />
                            </div>
                        }
                    </main>
                </div>
            )}
        </div>
    );
};

export default ManagementPage;
