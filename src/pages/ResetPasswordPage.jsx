import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  KeyRound, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck,
  Building2,
  Store,
  LogOut,
  CreditCard,
  Check,
  MapPin,
  Phone,
  Mail,
  FileText,
  Clock
} from 'lucide-react';
import { getStoredDealer, updateDealerPasswordChanged, clearStoredDealer } from '../utils/auth';
import { authApi, dealerApi } from '../services/apiClient';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [dealer, setDealer] = useState(() => getStoredDealer());
  const [dealerProfile, setDealerProfile] = useState(null);

  // Progressive Wizard Step: 1 = Password, 2 = Bank Details, 3 = Review Profile
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Password State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Step 2: Bank Details State
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [isSubmittingBank, setIsSubmittingBank] = useState(false);
  const [bankError, setBankError] = useState('');

  // Global messages
  const [globalMessage, setGlobalMessage] = useState('');

  const dealerEmail = dealer?.email || location.state?.email || '';

  useEffect(() => {
    document.title = 'Dealer Onboarding Setup | GROVE Dealer Portal';
    window.scrollTo(0, 0);

    const activeDealer = getStoredDealer();
    if (!activeDealer) {
      navigate('/login', {
        replace: true,
        state: { message: 'Please sign in with your credentials to access setup.' }
      });
      return;
    }

    // Attempt to load live dealer profile from API
    dealerApi.getProfile().then((res) => {
      const data = res?.dealer || res?.data || res;
      if (data) {
        setDealerProfile(data);
        if (data.ownerName) setAccountName(data.ownerName);
        if (data.bankDetails?.bankName) setBankName(data.bankDetails.bankName);
        if (data.bankDetails?.accountNumber) setAccountNumber(data.bankDetails.accountNumber);
        if (data.bankDetails?.ifsc) setIfsc(data.bankDetails.ifsc);
        if (data.bankDetails?.accountName) setAccountName(data.bankDetails.accountName);
        if (data.bankDetails?.upiId) setUpiId(data.bankDetails.upiId);

        // If password was already updated and bank details exist, advance step
        if (!activeDealer.mustChangePassword) {
          if (data.bankVerificationStatus === 'SUBMITTED' || data.bankVerificationStatus === 'VERIFIED') {
            setCurrentStep(3);
          } else {
            setCurrentStep(2);
          }
        }
      }
    }).catch(() => {});
  }, [navigate]);

  // Real-time password criteria validation
  const rules = useMemo(() => {
    return {
      hasLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasDigit: /\d/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword),
      isMatching: newPassword.length > 0 && newPassword === confirmPassword
    };
  }, [newPassword, confirmPassword]);

  const allRulesPassed = 
    rules.hasLength && 
    rules.hasUpper && 
    rules.hasLower && 
    rules.hasDigit && 
    rules.hasSpecial && 
    rules.isMatching;

  const strengthScore = useMemo(() => {
    let score = 0;
    if (rules.hasLength) score += 20;
    if (rules.hasUpper) score += 20;
    if (rules.hasLower) score += 20;
    if (rules.hasDigit) score += 20;
    if (rules.hasSpecial) score += 20;
    return score;
  }, [rules]);

  const strengthColor = useMemo(() => {
    if (strengthScore <= 40) return 'bg-red-500';
    if (strengthScore <= 80) return 'bg-amber-500';
    return 'bg-emerald-600';
  }, [strengthScore]);

  const strengthText = useMemo(() => {
    if (!newPassword) return 'Enter your new password';
    if (strengthScore <= 40) return 'Weak';
    if (strengthScore <= 80) return 'Moderate';
    return 'Strong & Secure';
  }, [newPassword, strengthScore]);

  // Step 1: Submit New Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!allRulesPassed) {
      setPasswordError('Please ensure all 5 password security rules are satisfied.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      await authApi.firstTimePassword(newPassword, confirmPassword);
      updateDealerPasswordChanged();

      // Fetch fresh profile after password change
      try {
        const pRes = await dealerApi.getProfile();
        const pData = pRes?.dealer || pRes?.data || pRes;
        if (pData) {
          setDealerProfile(pData);
          if (pData.ownerName && !accountName) setAccountName(pData.ownerName);
        }
      } catch {}

      setGlobalMessage('Permanent password set successfully! Now configure your bank payout details.');
      setCurrentStep(2);
    } catch (err) {
      setPasswordError(
        err.response?.data?.message || 
        err.message || 
        'Failed to set permanent password. Please check requirements and retry.'
      );
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Step 2: Submit Bank Settlement Details
  const handleBankSubmit = async (e) => {
    e.preventDefault();
    setBankError('');

    if (!bankName.trim() || bankName.trim().length < 2) {
      setBankError('Please enter a valid Settlement Bank Name.');
      return;
    }

    if (!accountName.trim() || accountName.trim().length < 2) {
      setBankError('Please enter the Account Holder Name matching your bank records.');
      return;
    }

    const cleanAcc = accountNumber.trim();
    if (!/^\d{9,18}$/.test(cleanAcc)) {
      setBankError('Account number must be between 9 and 18 numeric digits.');
      return;
    }

    const cleanIfsc = ifsc.trim().toUpperCase();
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanIfsc)) {
      setBankError('Please enter a valid 11-character Indian IFSC code (e.g., SBIN0001234).');
      return;
    }

    if (upiId && !/^[\w.-]+@[\w.-]+$/.test(upiId.trim())) {
      setBankError('Please enter a valid UPI ID (e.g., dealer@oksbi) or leave blank.');
      return;
    }

    setIsSubmittingBank(true);

    try {
      await dealerApi.submitOnboardingBankDetails({
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: cleanAcc,
        ifsc: cleanIfsc,
        upiId: (upiId || '').trim()
      });

      // Refresh profile snapshot
      try {
        const pRes = await dealerApi.getProfile();
        const pData = pRes?.dealer || pRes?.data || pRes;
        if (pData) setDealerProfile(pData);
      } catch {}

      setGlobalMessage('Bank settlement details recorded! Please review and verify your complete dealership profile.');
      setCurrentStep(3);
    } catch (err) {
      setBankError(
        err.response?.data?.message || 
        err.message || 
        'Failed to save bank details. Please verify your details.'
      );
    } finally {
      setIsSubmittingBank(false);
    }
  };

  // Step 3: Confirm Profile and Enter Dealer Portal
  const handleFinishOnboarding = () => {
    navigate('/dealer/dashboard', { replace: true });
  };

  const handleLogout = () => {
    clearStoredDealer();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F6F4] via-[#EEF2EF] to-[#E3E9E4] flex flex-col justify-between text-[#1B241E]">
      {/* Top Header */}
      <header className="border-b border-[#E2E8F0] bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-xs">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-lg bg-[#1B4332] text-white flex items-center justify-center font-black tracking-wider text-lg shadow-sm">
            G
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1B4332]">GROVE</span>
          <span className="text-xs font-mono uppercase bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full font-semibold border border-[#C8E6C9] ml-2">
            Dealer Onboarding
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#4A5568] hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Exit Setup</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-4">
        <div className="w-full max-w-2xl bg-white rounded-3xl border border-[#D1DCD3] shadow-xl overflow-hidden">
          
          {/* Progress Tracker */}
          <div className="bg-[#012D1D] px-6 py-4 text-white">
            <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
              {/* Step 1 Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep > 1 
                    ? 'bg-[#AEEECB] text-[#012D1D]' 
                    : currentStep === 1 
                      ? 'bg-white text-[#012D1D] ring-2 ring-[#AEEECB]' 
                      : 'bg-[#154634] text-neutral-400'
                }`}>
                  {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${
                  currentStep >= 1 ? 'text-white' : 'text-neutral-400'
                }`}>
                  Password
                </span>
              </div>

              <div className={`flex-1 h-0.5 ${currentStep > 1 ? 'bg-[#AEEECB]' : 'bg-[#154634]'}`} />

              {/* Step 2 Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep > 2 
                    ? 'bg-[#AEEECB] text-[#012D1D]' 
                    : currentStep === 2 
                      ? 'bg-white text-[#012D1D] ring-2 ring-[#AEEECB]' 
                      : 'bg-[#154634] text-neutral-400'
                }`}>
                  {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${
                  currentStep >= 2 ? 'text-white' : 'text-neutral-400'
                }`}>
                  Bank Payouts
                </span>
              </div>

              <div className={`flex-1 h-0.5 ${currentStep > 2 ? 'bg-[#AEEECB]' : 'bg-[#154634]'}`} />

              {/* Step 3 Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                  currentStep === 3 
                    ? 'bg-white text-[#012D1D] ring-2 ring-[#AEEECB]' 
                    : 'bg-[#154634] text-neutral-400'
                }`}>
                  3
                </div>
                <span className={`text-xs font-bold hidden sm:inline ${
                  currentStep === 3 ? 'text-white' : 'text-neutral-400'
                }`}>
                  Verify & Enter
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">

            {/* Global Flash Message */}
            {globalMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{globalMessage}</span>
              </div>
            )}

            {/* ================= STEP 1: SET PERMANENT PASSWORD ================= */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDF6ED] text-[#1B4332] text-xs font-bold">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Step 1 of 3: Credential Security</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#012D1D] tracking-tight">
                    Set Your Permanent Password
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4A5568]">
                    Welcome to the GROVE Dealer Portal. Your temporary password was verified. Please set your permanent confidential password.
                  </p>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Create strong permanent password"
                        className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-type new password"
                        className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Strength Bar */}
                  {newPassword && (
                    <div className="space-y-1 p-2.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8F0]">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-[#64748B]">Password Strength:</span>
                        <span className={strengthScore >= 80 ? 'text-emerald-700 font-bold' : strengthScore >= 60 ? 'text-amber-700' : 'text-red-600'}>
                          {strengthText}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-300 ${strengthColor}`} 
                          style={{ width: `${strengthScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 5-Rule Checklist */}
                  <div className="p-3.5 rounded-xl bg-[#F8FAF8] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className={`flex items-center gap-1.5 ${rules.hasLength ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                      {rules.hasLength ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${rules.hasUpper ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                      {rules.hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      <span>One uppercase letter (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${rules.hasLower ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                      {rules.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      <span>One lowercase letter (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${rules.hasDigit ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                      {rules.hasDigit ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      <span>One numeric digit (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${rules.hasSpecial ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                      {rules.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      <span>One special character (!@#$...)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${rules.isMatching ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                      {rules.isMatching ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                      <span>Passwords match</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingPassword || !allRulesPassed}
                    className="w-full h-11 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#012D1D] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    <span>{isSubmittingPassword ? 'Saving Password...' : 'Save Password & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ================= STEP 2: FILL BANK SETTLEMENT DETAILS ================= */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDF6ED] text-[#1B4332] text-xs font-bold">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Step 2 of 3: Bank Settlement Details</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#012D1D] tracking-tight">
                    Add Settlement Bank Account
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4A5568]">
                    Please provide your business bank account. Customer order payments will be settled directly to this account on a rolling T+2 schedule.
                  </p>
                </div>

                {bankError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{bankError}</span>
                  </div>
                )}

                <form onSubmit={handleBankSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Settlement Bank Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g. State Bank of India / HDFC Bank"
                        className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Account Holder Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="Official name on bank passbook"
                        className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                        required
                      />
                    </div>

                    {/* Account Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="9 to 18 digit account number"
                        className="w-full h-11 px-3.5 rounded-xl font-mono bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                        required
                      />
                    </div>

                    {/* IFSC Code */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        maxLength={11}
                        value={ifsc}
                        onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                        placeholder="e.g. SBIN0001234"
                        className="w-full h-11 px-3.5 rounded-xl font-mono uppercase bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                        required
                      />
                    </div>

                    {/* Corporate UPI ID */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs sm:text-sm font-bold text-[#1B241E]">
                        Corporate UPI ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="e.g. dealerstore@okhdfcbank"
                        className="w-full h-11 px-3.5 rounded-xl bg-[#F8FAF8] border border-[#CBD5E1] text-xs sm:text-sm font-medium text-[#1B241E] focus:outline-none focus:bg-white focus:border-[#1B4332] transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>
                      After saving, these details will be forwarded to GROVE Platform Administration for KYC clearance. Bank details cannot be freely modified after submission.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingBank}
                    className="w-full h-11 rounded-xl bg-[#1B4332] text-white text-sm font-bold hover:bg-[#012D1D] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <span>{isSubmittingBank ? 'Saving Bank Details...' : 'Save Bank Details & Review Profile'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* ================= STEP 3: REVIEW FULL DEALERSHIP DATA SNAPSHOT ================= */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#EDF6ED] text-[#1B4332] text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Step 3 of 3: Verification & Confirmation</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#012D1D] tracking-tight">
                    Verify Your Dealership Information
                  </h2>
                  <p className="text-xs sm:text-sm text-[#4A5568]">
                    Please review all your business and settlement data. If all details are accurate, confirm below to enter the GROVE Dealer Portal.
                  </p>
                </div>

                {/* Profile Summary Card */}
                <div className="rounded-2xl border border-[#CBD5E1] bg-[#F8FAF8] p-5 space-y-4">
                  {/* Business & Owner Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pb-4 border-b border-[#E2E8F0] text-xs sm:text-sm">
                    <div>
                      <span className="text-[#64748B] text-xs block">Trading Business Name</span>
                      <span className="font-bold text-[#0F172A]">{dealerProfile?.businessName || dealer?.name || 'Apex Agri-Tech'}</span>
                    </div>

                    <div>
                      <span className="text-[#64748B] text-xs block">Authorized Contact Person</span>
                      <span className="font-bold text-[#0F172A]">{dealerProfile?.ownerName || dealer?.name || 'Authorized Lead'}</span>
                    </div>

                    <div>
                      <span className="text-[#64748B] text-xs block">Primary Commercial Category</span>
                      <span className="font-semibold text-[#1B4332]">{dealerProfile?.primaryCategoryName || 'Agriculture & Machinery'}</span>
                    </div>

                    <div>
                      <span className="text-[#64748B] text-xs block">Statutory GSTIN</span>
                      <span className="font-mono font-bold text-[#0F172A]">{dealerProfile?.gstin || '27AABCA1234F1Z5'}</span>
                    </div>

                    <div>
                      <span className="text-[#64748B] text-xs block">Official Email Address</span>
                      <span className="font-mono text-[#0F172A]">{dealerProfile?.officialEmail || dealerEmail}</span>
                    </div>

                    <div>
                      <span className="text-[#64748B] text-xs block">Dispatch Hotline Phone</span>
                      <span className="font-semibold text-[#0F172A]">{dealerProfile?.phone || '+91 98220 12345'}</span>
                    </div>
                  </div>

                  {/* Dispatch Warehouse Location */}
                  <div className="pb-4 border-b border-[#E2E8F0] space-y-1 text-xs sm:text-sm">
                    <span className="text-[#64748B] text-xs block">Warehouse & Dispatch Depot</span>
                    <span className="font-medium text-[#0F172A] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#1B4332] shrink-0" />
                      <span>{dealerProfile?.warehouseAddress || 'Plot 42, Sanaswadi Industrial Area, Pune-Nagar Road, Pune - 412208'}</span>
                    </span>
                  </div>

                  {/* Settlement Bank Details Snapshot */}
                  <div className="space-y-2 text-xs sm:text-sm">
                    <span className="text-[#64748B] text-xs font-bold block uppercase tracking-wider">
                      Settlement Bank Account (Pending KYC Clearance)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-white border border-[#CBD5E1]">
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Settlement Bank</span>
                        <span className="font-bold text-[#0F172A]">{bankName || dealerProfile?.bankDetails?.bankName || 'State Bank of India'}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Account Holder</span>
                        <span className="font-semibold text-[#0F172A]">{accountName || dealerProfile?.bankDetails?.accountName || 'Authorized Dealer'}</span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[11px] block">Account Number</span>
                        <span className="font-mono font-bold text-[#0F172A]">
                          {accountNumber ? `•••• •••• ${accountNumber.slice(-4)}` : '•••• •••• 1234'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#64748B] text-[11px] block">IFSC Code</span>
                        <span className="font-mono font-bold text-[#0F172A]">{ifsc || dealerProfile?.bankDetails?.ifsc || 'SBIN0001234'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Notice */}
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Your credentials and bank settlement details are recorded in <strong>Pending KYC</strong> status. GROVE Operations will review your bank information. You may now enter the Dealer Portal.
                  </span>
                </div>

                {/* Final Enter Portal Button */}
                <button
                  type="button"
                  onClick={handleFinishOnboarding}
                  className="w-full h-12 rounded-xl bg-[#012D1D] text-white text-sm sm:text-base font-black hover:bg-[#1B4332] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <span>All Details Correct — Enter Dealer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] bg-white/60 py-3 text-center text-xs text-[#718096]">
        &copy; {new Date().getFullYear()} GROVE Multi-brand E-Commerce Ecosystem. All rights reserved.
      </footer>
    </div>
  );
}