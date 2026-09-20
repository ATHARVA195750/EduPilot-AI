import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { resetPassword } from '../../services/authService';

function ForgotPassword() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const onSubmit = async (data) => {
    setErrorMessage('');
    setMessage('');

    try {
      await resetPassword(data.email);
      setMessage('Check your email for reset instructions.');
    } catch (error) {
      setErrorMessage(error.message || 'Unable to send reset instructions.');
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 py-16">
      <div className="w-full rounded-3xl border border-slate-200 bg-white p-10 shadow-xl">
        <h1 className="text-2xl font-semibold text-slate-900">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your email to receive reset instructions.</p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" className="w-full">Send reset link</Button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="text-blue-600 hover:underline">
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
