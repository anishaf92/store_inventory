import React, { useState, useContext } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, Mail } from 'lucide-react';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const onSubmit = async (data) => {
        try {
            await login(data.email, data.password);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid credentials');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white tracking-widest text-safety-orange">ARTHAQ</h1>
                    <p className="text-gray-400 text-sm mt-2">SECURE LOGIN</p>
                </div>

                {error && (
                    <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                            <input
                                type="email"
                                {...register('email', { required: true })}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded pl-10 py-2 focus:outline-none focus:border-safety-orange transition-colors"
                                placeholder="name@arthaq.com"
                            />
                        </div>
                        {errors.email && <span className="text-red-500 text-xs">Email is required</span>}
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm font-bold mb-2">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-500 w-5 h-5" />
                            <input
                                type="password"
                                {...register('password', { required: true })}
                                className="w-full bg-gray-700 text-white border border-gray-600 rounded pl-10 py-2 focus:outline-none focus:border-safety-orange transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                        {errors.password && <span className="text-red-500 text-xs">Password is required</span>}
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-safety-orange hover:bg-orange-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition-transform transform hover:scale-[1.02]"
                    >
                        Authenticate
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
