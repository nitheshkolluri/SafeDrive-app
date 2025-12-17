
import React, { useState } from 'react';
import { User } from '../types';
import { SafeDriveLogo, MailIcon, LockIcon, UserIcon, EyeIcon, EyeOffIcon, ArrowRightIcon, ArrowLeftIcon, SendIcon, GoogleIcon } from '../components/icons';
import { auth } from '../utils/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { mockAuth } from '../utils/mockAuth';
import { userRepository } from '../utils/userRepository';

interface WelcomeScreenProps {
    onLogin: (user: User) => void;
}

type AuthMode = 'landing' | 'login' | 'signup' | 'verify' | 'forgot-password' | 'reset-sent';

const InputField: React.FC<{
    type: string;
    placeholder: string;
    icon: React.ElementType;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void;
    error?: boolean;
    disabled?: boolean;
    rightElement?: React.ReactNode;
}> = ({ type, placeholder, icon: Icon, value, onChange, onBlur, error, disabled, rightElement }) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    
    return (
        <div className="relative w-full group">
            <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-brand-cyan'}`}>
                <Icon className="w-5 h-5" />
            </div>
            <input
                type="text"
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                disabled={disabled}
                placeholder={placeholder}
                className={`w-full h-14 pl-12 pr-12 bg-dark-800/50 border ${error ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-brand-cyan'} rounded-xl text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-brand-cyan/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium`}
            />
            {isPassword && (
                <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                    {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
            )}
            {rightElement && !isPassword && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {rightElement}
                </div>
            )}
        </div>
    );
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onLogin }) => {
    const [mode, setMode] = useState<AuthMode>('landing');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resendStatus, setResendStatus] = useState<string | null>(null);
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [name, setName] = useState('');

    const resetForm = () => {
        setError(null);
        setResendStatus(null);
        // Only reset fields if going back to landing, otherwise keep email for convenience
        if (mode === 'landing') {
            setEmail('');
            setPassword('');
            setRepeatPassword('');
            setName('');
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            
            // Sync with Firestore
            const syncedUser = await userRepository.syncUser({
                id: user.uid,
                name: user.displayName || user.email?.split('@')[0] || 'Driver',
                email: user.email || undefined,
                photoUrl: user.photoURL || undefined,
                isGuest: false,
                theme: 'dark'
            });
            
            onLogin(syncedUser);
        } catch (err: any) {
            console.error("Google Login Error:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setError("Sign in cancelled.");
            } else if (err.code === 'auth/popup-blocked') {
                setError("Pop-up blocked. Please allow pop-ups for this site.");
            } else if (err.code === 'auth/unauthorized-domain') {
                setError(`Domain not allowed: ${window.location.hostname}. Add to Firebase Console > Auth > Settings.`);
            } else {
                setError("Google Sign-In failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        try {
            // Trim email to avoid 'auth/invalid-credential' due to trailing spaces
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const fbUser = userCredential.user;
            
            // CHECK EMAIL VERIFICATION
            if (!fbUser.emailVerified) {
                // Sign out immediately so they aren't "logged in" in the background
                await signOut(auth);
                setMode('verify');
                setIsLoading(false);
                return; 
            }

            // Sync with Firestore
            const syncedUser = await userRepository.syncUser({
                id: fbUser.uid,
                name: fbUser.displayName || 'Driver',
                email: fbUser.email || undefined,
                photoUrl: fbUser.photoURL || undefined,
                isGuest: false,
                theme: 'dark'
            });

            onLogin(syncedUser);
        } catch (err: any) {
            // Only log unexpected system errors, not standard user input errors
            if (err.code !== 'auth/invalid-credential' && err.code !== 'auth/wrong-password') {
                console.error("Login Error:", err.code, err.message);
            }

            // Specific UI requirement: If email/password are incorrect display "Password or Email incorrect"
            if (
                err.code === 'auth/invalid-credential' || 
                err.code === 'auth/user-not-found' || 
                err.code === 'auth/wrong-password' ||
                err.code === 'auth/invalid-email'
            ) {
                setError("Password or Email incorrect");
            } else {
                setError("Login failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name || !email || !password || !repeatPassword) {
            setError("All fields are required.");
            return;
        }
        if (password !== repeatPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Check Username Availability (Local Prototype Check)
            const isUsernameAvailable = await mockAuth.checkUsernameAvailability(name);
            if (!isUsernameAvailable) {
                setError("Username is taken. Please choose another.");
                setIsLoading(false);
                return;
            }

            // 2. Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
            const fbUser = userCredential.user;

            // 3. Update display name
            await updateProfile(fbUser, { displayName: name });

            // 4. Reserve Username locally (so no one else can take it on this device)
            await mockAuth.reserveUsername(name);

            // 5. Create Firestore Record (Before Verification)
            await userRepository.syncUser({
                id: fbUser.uid,
                name: name,
                email: fbUser.email || undefined,
                isGuest: false,
                theme: 'dark'
            });

            // 6. Send Verification Email
            await sendEmailVerification(fbUser);

            // 7. Sign out immediately
            await signOut(auth);

            // 8. Go to verification screen
            setMode('verify');

        } catch (err: any) {
            // Suppress console noise for expected validation errors
            if (err.code !== 'auth/email-already-in-use' && err.code !== 'auth/weak-password') {
                console.error("Signup Error:", err.code, err.message);
            }
            
            // Specific UI requirement
            if (err.code === 'auth/email-already-in-use') {
                setError("User already exists. Sign in?");
            } else if (err.code === 'auth/weak-password') {
                setError("Password is too weak.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Please enter a valid email address.");
            } else {
                setError("Registration failed. Please try again.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email) {
            setError("Please enter your email address.");
            return;
        }
        
        setIsLoading(true);
        try {
            await sendPasswordResetEmail(auth, email.trim());
            setMode('reset-sent');
        } catch (err: any) {
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Invalid email address.");
            } else {
                setError("Failed to send reset link. Try again.");
                console.error(err);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setResendStatus(null);
        setError(null);
        
        if (!email || !password) {
            setError("Session expired. Please log in again to resend.");
            setTimeout(() => setMode('login'), 2000);
            return;
        }

        setIsLoading(true);
        try {
            // We must sign in to get the user object to send verification
            const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
            const fbUser = userCredential.user;
            
            await sendEmailVerification(fbUser);
            await signOut(auth);
            
            setResendStatus("Email sent! Check your inbox.");
        } catch (err: any) {
            console.error("Resend Error:", err);
            // If they wait too long, auth might fail, ask them to login again
            if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                 setError("Please log in again to resend verification.");
            } else if (err.code === 'auth/too-many-requests') {
                 setError("Too many attempts. Please wait a moment.");
            } else {
                 setError("Could not resend email.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    const renderVerify = () => (
        <div className="w-full max-w-sm space-y-6 animate-fade-in-up bg-dark-900/90 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-brand-cyan/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border border-brand-cyan/30">
                <MailIcon className="w-10 h-10 text-brand-cyan" />
            </div>
            
            <h2 className="text-2xl font-bold text-white tracking-tight">Check your inbox</h2>
            
            <div className="text-sm text-slate-300 leading-relaxed">
                <p>We have sent you a verification email to</p>
                <p className="font-bold text-white my-2 break-all">{email}</p>
                <p>Verify it and log in to continue.</p>
                <p className="text-xs text-slate-500 mt-3 italic bg-white/5 py-2 px-3 rounded-lg border border-white/5">
                    Note: Please check your <strong>Spam/Junk</strong> folder if you don't see it.
                </p>
            </div>

            {resendStatus && (
                <div className="p-2 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold animate-fade-in-up">
                    {resendStatus}
                </div>
            )}
            
            {error && (
                <div className="p-2 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold animate-fade-in-up">
                    {error}
                </div>
            )}

            <div className="space-y-3">
                <button 
                    onClick={() => {
                        setError(null);
                        setMode('login'); 
                    }}
                    className="w-full py-4 font-bold text-white rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-700 transition-all flex justify-center items-center group"
                >
                    Return to Login
                </button>
                
                <button 
                    onClick={handleResendEmail}
                    disabled={isLoading}
                    className="text-xs text-slate-500 hover:text-brand-cyan underline transition-colors disabled:opacity-50"
                >
                    {isLoading ? "Sending..." : "Resend Verification Email"}
                </button>
            </div>
        </div>
    );

    const renderForgotPassword = () => (
        <form onSubmit={handlePasswordReset} className="w-full max-w-sm space-y-4 animate-fade-in-up bg-dark-900/90 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-2xl relative">
            <button 
                type="button"
                onClick={() => {
                    setError(null);
                    setMode('login');
                }}
                className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors flex items-center text-sm font-medium"
            >
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
            </button>

            <div className="text-center mb-8 pt-8">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <LockIcon className="w-8 h-8 text-brand-cyan" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
                <p className="text-sm text-slate-400 mt-1">
                    Enter your email to receive a reset link.
                </p>
            </div>

            <InputField type="email" placeholder="Email Address" icon={MailIcon} value={email} onChange={e => setEmail(e.target.value)} error={!!error} />

            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center space-x-3 animate-pulse">
                    <p className="text-red-200 text-sm font-medium flex-1 text-left">{error}</p>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 mt-6 font-bold text-white rounded-xl bg-gradient-aurora shadow-lg shadow-brand-purple/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center group"
            >
                {isLoading ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : "Get Reset Link"}
            </button>
        </form>
    );

    const renderResetSent = () => (
        <div className="w-full max-w-sm space-y-6 animate-fade-in-up bg-dark-900/90 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-2xl text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse border border-green-500/30">
                <SendIcon className="w-10 h-10 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-white tracking-tight">Link Sent!</h2>
            
            <div className="text-sm text-slate-300 leading-relaxed">
                <p>We sent you a password change link to</p>
                <p className="font-bold text-white my-2 break-all">{email}</p>
                <p>Check your email to reset your password.</p>
            </div>

            <button 
                onClick={() => {
                    setError(null);
                    setMode('login'); 
                }}
                className="w-full py-4 font-bold text-white rounded-xl bg-slate-800 border border-white/10 hover:bg-slate-700 transition-all flex justify-center items-center group"
            >
                Sign In
            </button>
        </div>
    );

    const renderLanding = () => (
        <div className="flex flex-col items-center space-y-4 w-full max-w-xs animate-fade-in-up">
            <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-3 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition-colors flex items-center justify-center space-x-3 shadow-lg hover:scale-[1.02]"
            >
                <GoogleIcon className="w-5 h-5" />
                <span>Continue with Google</span>
            </button>

            <div className="flex items-center w-full my-2">
                <div className="flex-grow h-px bg-white/10"></div>
                <span className="px-3 text-xs text-slate-500 font-medium uppercase">Or</span>
                <div className="flex-grow h-px bg-white/10"></div>
            </div>

            <button 
                onClick={() => { resetForm(); setMode('signup'); }}
                className="w-full py-4 font-bold text-white rounded-2xl bg-gradient-aurora shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
                Create Secure Account
            </button>
            <button 
                onClick={() => { resetForm(); setMode('login'); }}
                className="w-full py-4 font-bold text-white bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/20 transition-all"
            >
                Log In
            </button>
        </div>
    );

    const renderForm = () => (
        <form 
            onSubmit={mode === 'login' ? handleLogin : handleSignup}
            className="w-full max-w-sm space-y-4 animate-fade-in-up bg-dark-900/90 backdrop-blur-2xl p-8 rounded-[32px] border border-white/10 shadow-2xl relative"
        >
             {/* Back Button */}
             <button 
                type="button"
                onClick={() => {
                    resetForm();
                    setMode('landing');
                }}
                className="absolute top-6 left-6 text-slate-400 hover:text-white transition-colors flex items-center text-sm font-medium"
            >
                <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
            </button>

            <div className="text-center mb-6 pt-8">
                <div className="w-16 h-16 bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                    {mode === 'login' ? <UserIcon className="w-8 h-8 text-brand-cyan" /> : 
                     <SafeDriveLogo className="w-8 h-8 text-brand-purple" />}
                </div>
                <h2 className="text-2xl font-bold text-white capitalize tracking-tight">
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    {mode === 'login' ? 'Securely access your driving history.' : 
                    'Join the safest driving community.'}
                </p>
            </div>

            {(mode === 'login' || mode === 'signup') && (
                <div className="mb-6">
                    <button 
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center space-x-3"
                    >
                        <GoogleIcon className="w-5 h-5" />
                        <span>Continue with Google</span>
                    </button>
                    <div className="flex items-center mt-6 mb-2">
                        <div className="flex-grow h-px bg-white/10"></div>
                        <span className="px-3 text-xs text-slate-500 font-medium uppercase">Or</span>
                        <div className="flex-grow h-px bg-white/10"></div>
                    </div>
                </div>
            )}

            {mode === 'signup' && (
                <InputField 
                    type="text" 
                    placeholder="Username" 
                    icon={UserIcon} 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                />
            )}
            
            {mode === 'signup' && (
                <InputField type="email" placeholder="Email Address" icon={MailIcon} value={email} onChange={e => setEmail(e.target.value)} error={!!error && error.includes('email')} />
            )}

            {mode === 'login' && <InputField type="text" placeholder="Email" icon={MailIcon} value={email} onChange={e => setEmail(e.target.value)} error={!!error} />}
            <InputField type="password" placeholder="Password" icon={LockIcon} value={password} onChange={e => setPassword(e.target.value)} error={!!error} />

            {mode === 'signup' && (
                <InputField type="password" placeholder="Repeat Password" icon={LockIcon} value={repeatPassword} onChange={e => setRepeatPassword(e.target.value)} error={!!error && error.includes('match')} />
            )}

            {mode === 'login' && (
                <div className="flex justify-end">
                    <button 
                        type="button"
                        onClick={() => setMode('forgot-password')}
                        className="text-xs text-brand-cyan hover:text-white transition-colors font-medium"
                    >
                        Forgot password?
                    </button>
                </div>
            )}

            {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center space-x-3 animate-pulse">
                    <div className="w-1 h-10 bg-red-500 rounded-full"></div>
                    <p className="text-red-200 text-sm font-medium flex-1 text-left">{error}</p>
                </div>
            )}

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-4 mt-2 font-bold text-white rounded-xl bg-gradient-aurora shadow-lg shadow-brand-purple/25 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center group relative overflow-hidden"
            >
                {isLoading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <>
                        <span className="relative z-10 flex items-center">
                            {mode === 'login' ? 'Sign In' : 'Continue'}
                            <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </>
                )}
            </button>

            <div className="text-center mt-6 pb-2">
                <button 
                    type="button"
                    onClick={() => {
                        resetForm();
                        setMode(mode === 'login' ? 'signup' : (mode === 'signup' ? 'login' : 'landing'));
                    }}
                    className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
                >
                    {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
            </div>
        </form>
    );

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-dark-950 text-white p-4 overflow-hidden font-sans selection:bg-brand-cyan/30">
            
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-brand-purple/10 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-cyan/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-md">
                <div className={`transition-all duration-700 ease-in-out ${mode === 'landing' ? 'scale-100 mb-12' : 'scale-75 mb-4 opacity-0 h-0 overflow-hidden'}`}>
                    <div className="p-6 bg-gradient-to-br from-white/10 to-transparent rounded-[32px] backdrop-blur-2xl border border-white/10 shadow-[0_0_40px_rgba(139,92,246,0.2)]">
                        <SafeDriveLogo className="w-24 h-24 text-transparent text-white drop-shadow-lg" />
                    </div>
                </div>

                {mode === 'landing' && (
                     <div className="text-center mb-12 animate-fade-in-up">
                        <h1 className="text-5xl font-black tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-slate-400">
                            SafeDrive
                        </h1>
                        <p className="text-lg text-slate-400 font-medium leading-relaxed max-w-[280px] mx-auto">
                            Drive <span className="text-brand-cyan font-bold">Safe</span>. Earn Rewards.
                        </p>
                    </div>
                )}

                {mode === 'verify' && renderVerify()}
                {mode === 'forgot-password' && renderForgotPassword()}
                {mode === 'reset-sent' && renderResetSent()}
                {mode === 'landing' && renderLanding()}
                {(mode === 'login' || mode === 'signup') && renderForm()}
            </div>
        </div>
    );
};

export default WelcomeScreen;
