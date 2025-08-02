import React, { useState } from 'react';
import Cookie from 'js-cookie';

/**
 * A dropdown menu component for user account actions:
 * - Toggle display with an icon
 * - Show username
 * - Update password via modal form
 * - Logout button
 * Includes opening/closing animations via TailwindCSS transition classes.
 */
interface UserDropdownProps {
    onLogout: () => void;
}

const UserSettingBtn: React.FC<UserDropdownProps> = ({ onLogout }) => {
    // Dropdown open/close state
    const [open, setOpen] = useState(false);
    // Modal for password update
    const [showModal, setShowModal] = useState(false);
    // Form fields
    const [oldPwd, setOldPwd] = useState('');
    const [newPwd, setNewPwd] = useState('');
    const [confirmPwd, setConfirmPwd] = useState('');
    // Track Submission states
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    // Username from cookie
    const username = Cookie.get('cgsb-editor') || '';

    /**
     * Toggle the dropdown visibility
     */
    const toggleDropdown = () => setOpen(prev => !prev);

    /**
     * Open the password update modal
     */
    const handleUpdateClick = () => {
        setShowModal(true);
        setOpen(false);
    };

    /**
     * Handle submission of the password update form
     */
    const handlePwdSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr('');
        setLoading(true);
        try {
            // Verify old password
            const verifyRes = await fetch('/api/user-verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: oldPwd }),
            });
            if (verifyRes.status === 401) {
                setErr('Old password is incorrect');
                return;
            }
            if (!verifyRes.ok) { // other error
                const text = await verifyRes.text();
                throw new Error(`Verification failed: ${verifyRes.status} ${text}`);
            }
            // Check new passwords match
            if (newPwd !== confirmPwd) {
                setErr('New passwords do not match');
                return;
            }
            // Call update password API
            const updateRes = await fetch('/api/user-update-pwd', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password: newPwd }),
            });
            if (updateRes.ok) {
                alert('Password updated successfully');
                setShowModal(false);
                setOldPwd('');
                setNewPwd('');
                setConfirmPwd('');
            } else {
                const updateData = await updateRes.json();
                setErr(updateData.message || 'Password update failed');
            }
        }
        catch (e) {
            console.log(e);
        }
        finally { setLoading(false) }
    };

    return (
        <div className="relative inline-block text- black text-left">
            {/* Toggle button */}
            <button
                onClick={toggleDropdown}
                className="px-2 py-2 bg-transparent border-0 rounded-2xl hover:bg-gray-100 transition-transform duration-200"
            >
                <i className={`bi text-2xl ${open ? 'bi-chevron-bar-up' : 'bi-person-gear'}`}></i>
            </button>

            {/* Dropdown menu */}
            {open && (
                <div
                    className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg origin-top-right
            transition transform ease-out duration-200 opacity-100 scale-100"
                >
                    <div className="p-0">
                        {/* Username display */}
                        <div className="px-2 py-2 flex items-center rounded-t-2xl bg-sky-100">
                            <i className="bi bi-person pr-2"></i>
                            <span>{username}</span>
                        </div>

                        {/* Update password button */}
                        <button
                            onClick={handleUpdateClick}
                            className="w-full text-left px-2 py-2 bg-transparent border-0 hover:bg-gray-100 flex items-center"
                        >
                            <i className="bi bi-lock pr-2"></i>
                            Update Password
                        </button>

                        {/* Cancel/Logout button */}
                        <button
                            onClick={onLogout}
                            className="w-full text-left px-2 py-2 bg-transparent border-0 rounded-b-2xl hover:bg-gray-100 flex items-center"
                            title="Logout current account (you'll need to enter your password again)"
                        >
                            <i className="text-sm bi bi-box-arrow-left pr-2 text-red-500"></i>
                            Logout
                        </button>
                    </div>
                </div>
            )}

            {/* Update password modal */}
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
                    <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm">
                        <h3 className='font-bold text-black mb-3'>Update Password</h3>
                        {/* Close modal */}
                        <button
                            className="absolute top-3 right-3 text-2xl"
                            onClick={() => setShowModal(false)}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                        <form onSubmit={handlePwdSubmit}>
                            {/* Old Password */}
                            <div className="mb-4">
                                <label className="block text-black text-sm font-medium mb-1">
                                    Old Password
                                </label>
                                <input
                                    type="password"
                                    value={oldPwd}
                                    placeholder='Verify your password'
                                    onChange={e => setOldPwd(e.target.value)}
                                    className="w-full border rounded-lg px-2 py-1 placeholder:text-xs"
                                    required
                                />
                            </div>
                            {/* New Password */}
                            <div className="mb-4">
                                <label className="block text-black text-sm font-medium mb-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPwd}
                                    minLength={6}
                                    placeholder='Minimal of 6 digits with Alphabetical/numbers'
                                    onChange={e => setNewPwd(e.target.value)}
                                    className="w-full border rounded-lg px-2 py-1 placeholder:text-xs"
                                    required
                                />
                            </div>
                            {/* Confirm New Password */}
                            <div className="mb-4">
                                <label className="block text-black text-sm font-medium mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPwd}
                                    minLength={6}
                                    placeholder='Exact same as above ^'
                                    onChange={e => setConfirmPwd(e.target.value)}
                                    className="w-full border rounded-lg px-2 py-1 placeholder:text-xs"
                                    required
                                />
                            </div>
                            {(err !== null || err !== '') && <p className='text-sm py-1 text-red-700'>{err}</p>}
                            {/* Submit */}
                            <button
                                type="button" onClick={() => setShowModal(false)}
                                className="w-1/2 px-4 py-2 bg-gray-500 text-white rounded-l-lg hover:bg-gray-700 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type={loading? "button" : "submit" }
                                className="w-1/2 px-4 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 transition"
                            >
                                {loading? "Submitting..." : "Submit" }
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserSettingBtn;
