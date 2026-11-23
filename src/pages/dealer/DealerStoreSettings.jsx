<<<<<<< HEAD
import React, { useState, useEffect, useMemo } from 'react';
=======
import React, { useState, useEffect } from 'react';
>>>>>>> origin/boomika
import { Link } from 'react-router-dom';
import { 
  Building2, 
  MapPin, 
  CreditCard, 
  Clock, 
<<<<<<< HEAD
=======
  Save, 
>>>>>>> origin/boomika
  CheckCircle2, 
  ShieldCheck, 
  ChevronRight,
  Phone,
  Mail,
<<<<<<< HEAD
  FileText,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Check,
  X
=======
  FileText
>>>>>>> origin/boomika
} from 'lucide-react';
import DealerLayout from '../../components/dealer/DealerLayout';
import { getDealerStoreSettings, saveDealerStoreSettings, syncDealerDataFromApi } from '../../services/dealerService';
import { getActiveDealerId } from '../../utils/auth';
<<<<<<< HEAD
import { authApi, dealerApi } from '../../services/apiClient';
=======
>>>>>>> origin/boomika

export default function DealerStoreSettings() {
  const [settings, setSettings] = useState(() => getDealerStoreSettings(getActiveDealerId()));
  const [toastMessage, setToastMessage] = useState('');
<<<<<<< HEAD
  const [toastType, setToastType] = useState('success'); // 'success' | 'error'

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);

  // Password Management State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
=======
  const [isSaving, setIsSaving] = useState(false);
>>>>>>> origin/boomika

  useEffect(() => {
    document.title = 'Store Settings | GROVE Dealer Portal';
    window.scrollTo(0, 0);
    const activeId = getActiveDealerId();
    setSettings(getDealerStoreSettings(activeId));
    syncDealerDataFromApi(activeId).then(() => {
      setSettings(getDealerStoreSettings(activeId));
    }).catch(() => {});
  }, []);

<<<<<<< HEAD
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage('');
    }, 3500);
  };

=======
>>>>>>> origin/boomika
  const handleChange = (field, value) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
  };

<<<<<<< HEAD
  // Section 1: Save Profile & Branding
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    setIsSavingProfile(true);
    const currentId = getActiveDealerId();
    try {
      await saveDealerStoreSettings(settings, currentId);
      showToast('Business profile & operating hours updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update business profile', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Section 2: Save Warehouse & Hub Location
  const handleSaveWarehouse = async (e) => {
    e?.preventDefault();
    setIsSavingWarehouse(true);
    const currentId = getActiveDealerId();
    try {
      await saveDealerStoreSettings(settings, currentId);
      showToast('Warehouse location & dispatch settings updated successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to update warehouse location', 'error');
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  // Password Validation Rules
  const passwordRules = useMemo(() => {
    return {
      hasLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasDigit: /\d/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(newPassword),
      isMatching: newPassword.length > 0 && newPassword === confirmPassword
    };
  }, [newPassword, confirmPassword]);

  const allPasswordRulesPassed = 
    passwordRules.hasLength && 
    passwordRules.hasUpper && 
    passwordRules.hasLower && 
    passwordRules.hasDigit && 
    passwordRules.hasSpecial && 
    passwordRules.isMatching &&
    currentPassword.length > 0;

  const strengthScore = useMemo(() => {
    let score = 0;
    if (passwordRules.hasLength) score += 20;
    if (passwordRules.hasUpper) score += 20;
    if (passwordRules.hasLower) score += 20;
    if (passwordRules.hasDigit) score += 20;
    if (passwordRules.hasSpecial) score += 20;
    return score;
  }, [passwordRules]);

  const strengthColor = useMemo(() => {
    if (strengthScore <= 40) return 'bg-red-500';
    if (strengthScore <= 80) return 'bg-amber-500';
    return 'bg-emerald-600';
  }, [strengthScore]);

  const strengthText = useMemo(() => {
    if (!newPassword) return 'Enter a new password';
    if (strengthScore <= 40) return 'Weak password';
    if (strengthScore <= 80) return 'Moderate strength';
    return 'Strong & secure';
  }, [newPassword, strengthScore]);

  // Handle Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!allPasswordRulesPassed) {
      setPasswordError('Please satisfy all password complexity requirements before updating.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be identical to your current password.');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword, confirmPassword);
      setPasswordSuccess(res?.message || 'Password changed successfully! Keep your new credentials secure.');
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please verify your current password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Only show verified dealer after Admin accepts and verifies KYC
  const isVerifiedDealer = settings.bankVerificationStatus === 'VERIFIED' && settings.status !== 'PENDING_KYC';

=======
  const handleSave = (e) => {
    e?.preventDefault();
    setIsSaving(true);
    const currentId = getActiveDealerId();
    saveDealerStoreSettings(settings, currentId);
    setTimeout(() => {
      setIsSaving(false);
      setToastMessage('Store settings saved successfully!');
      setTimeout(() => setToastMessage(''), 3000);
    }, 400);
  };

>>>>>>> origin/boomika
  return (
    <DealerLayout>
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Toast Alert */}
        {toastMessage && (
<<<<<<< HEAD
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fade-in border ${
            toastType === 'error' 
              ? 'bg-red-900 text-white border-red-500/40' 
              : 'bg-[#012D1D] text-white border-[#AEEECB]/30'
          }`}>
            {toastType === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-300" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-[#AEEECB]" />
            )}
=======
          <div className="fixed bottom-6 right-6 z-50 bg-[#012D1D] text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-xs sm:text-sm font-semibold animate-fade-in border border-[#AEEECB]/30">
            <CheckCircle2 className="w-4 h-4 text-[#AEEECB]" />
>>>>>>> origin/boomika
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#717973]">
              <Link to="/dealer/dashboard" className="hover:text-[#012D1D] transition-colors">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#151D18] font-bold">Store Settings</span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#012D1D] tracking-tight">
                Store Settings
              </h1>
<<<<<<< HEAD
              {isVerifiedDealer ? (
                <span className="px-3 py-1 rounded-full bg-[#AEEECB] text-[#0E5138] text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified B2B Dealer
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 border border-amber-300 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  KYC Verification Pending
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[#414844]">
              Manage your store brand, dispatch warehouse location, operating hours, and portal login security.
            </p>
          </div>
        </div>

        {/* Pending KYC Informational Banner (Shown if not yet verified by Admin) */}
        {!isVerifiedDealer && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-950 shadow-2xs animate-fade-in">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-900">
                Dealership KYC & Settlement Verification Under Review
              </span>
              <p className="text-amber-800 leading-relaxed text-xs">
                Your application and submitted bank settlement details are currently being reviewed by GROVE Platform Administration. 
                Full automated T+2 order payouts and the public <strong>Verified Dealer</strong> credential will be activated as soon as Admin completes clearance.
              </p>
            </div>
          </div>
        )}

        {/* Settings Sections Container */}
        <div className="flex flex-col gap-6">

=======
              <span className="px-2.5 py-0.5 rounded-full bg-[#AEEECB] text-[#0E5138] text-xs font-bold">
                Verified B2B Account
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#414844]">
              Manage your dealer brand, dispatch warehouse location, payout bank details, and business hours.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="h-10 px-6 rounded-xl bg-[#1B4332] text-white text-xs sm:text-sm font-bold hover:bg-[#012D1D] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSave} className="flex flex-col gap-6">
>>>>>>> origin/boomika
          {/* Section 1: Business Profile & Branding */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
<<<<<<< HEAD
                <Building2 className="w-5 h-5 text-[#2C694E]" />
=======
                <span className="w-2.5 h-2.5 rounded-full bg-[#2C694E]"></span>
>>>>>>> origin/boomika
                <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                  Business Profile & Branding
                </h2>
              </div>
<<<<<<< HEAD
              <span className="text-xs font-semibold text-[#717973] uppercase tracking-wider">Commercial Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Store Name - EDITABLE */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Trading Business Name
                  </label>
                  <span className="text-[11px] font-medium text-[#2C694E] bg-[#E8F5E9] px-2 py-0.5 rounded-md">Editable</span>
                </div>
=======
              <span className="text-xs font-semibold text-[#717973] uppercase tracking-wider">Public Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Trading Business Name
                </label>
>>>>>>> origin/boomika
                <input
                  type="text"
                  value={settings.storeName || ''}
                  onChange={(e) => handleChange('storeName', e.target.value)}
<<<<<<< HEAD
                  placeholder="e.g. Apex Agri-Tech & Machinery"
=======
>>>>>>> origin/boomika
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                  required
                />
              </div>

<<<<<<< HEAD
              {/* Primary Category - LOCKED */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18] flex items-center gap-1.5">
                    <span>Primary Category Segment</span>
                    <Lock className="w-3.5 h-3.5 text-[#717973]" />
                  </label>
                  <span className="text-[11px] font-medium text-[#717973] bg-[#EAEAEA] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </div>
                <input
                  type="text"
                  value={settings.businessCategory || 'Agriculture & Farm Equipment'}
                  disabled
                  readOnly
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F0F2F0] border border-[#C1C8C2]/50 text-[#555E58] text-xs sm:text-sm font-medium cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-[#717973]">
                  Commercial category is locked to your onboarding license and cannot be altered.
                </p>
              </div>

              {/* Store Tagline & Description - EDITABLE */}
              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Store Tagline & Description
                  </label>
                  <span className="text-[11px] font-medium text-[#2C694E] bg-[#E8F5E9] px-2 py-0.5 rounded-md">Editable</span>
                </div>
=======
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Primary Category Segment
                </label>
                <select
                  value={settings.businessCategory || 'Agriculture & Farm Equipment'}
                  onChange={(e) => handleChange('businessCategory', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all cursor-pointer"
                >
                  <option value="Agriculture & Farm Equipment">Agriculture & Farm Equipment</option>
                  <option value="Electronics & Smart Ag Tech">Electronics & Smart Ag Tech</option>
                  <option value="Automotive & Spare Parts">Automotive & Spare Parts</option>
                  <option value="Multi-Category Enterprise">Multi-Category Enterprise</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Store Tagline & Description
                </label>
>>>>>>> origin/boomika
                <textarea
                  rows={3}
                  value={settings.tagline || ''}
                  onChange={(e) => handleChange('tagline', e.target.value)}
<<<<<<< HEAD
                  placeholder="Brief summary of your product specialties, service guarantees, and regional supply capabilities."
=======
>>>>>>> origin/boomika
                  className="w-full p-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] resize-y transition-colors leading-relaxed"
                />
              </div>

<<<<<<< HEAD
              {/* Official Contact Email - LOCKED */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#717973]" />
                    <span>Official Contact Email</span>
                    <Lock className="w-3.5 h-3.5 text-[#717973]" />
                  </label>
                  <span className="text-[11px] font-medium text-[#717973] bg-[#EAEAEA] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </div>
                <input
                  type="email"
                  value={settings.businessEmail || ''}
                  disabled
                  readOnly
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F0F2F0] border border-[#C1C8C2]/50 text-[#555E58] text-xs sm:text-sm font-medium cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-[#717973]">
                  Primary login and tax invoice delivery email. Contact GROVE Admin to request an email update.
                </p>
              </div>

              {/* Dispatch Hotline / Phone - LOCKED */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#717973]" />
                    <span>Dispatch Hotline / Phone</span>
                    <Lock className="w-3.5 h-3.5 text-[#717973]" />
                  </label>
                  <span className="text-[11px] font-medium text-[#717973] bg-[#EAEAEA] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </div>
                <input
                  type="text"
                  value={settings.businessPhone || ''}
                  disabled
                  readOnly
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F0F2F0] border border-[#C1C8C2]/50 text-[#555E58] text-xs sm:text-sm font-medium cursor-not-allowed select-none"
                />
                <p className="text-[11px] text-[#717973]">
                  Verified logistics contact phone used for courier pickup escalation.
                </p>
              </div>

              {/* GSTIN - LOCKED */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#717973]" />
                    <span>GSTIN (Tax Identification)</span>
                    <Lock className="w-3.5 h-3.5 text-[#717973]" />
                  </label>
                  <span className="text-[11px] font-medium text-[#717973] bg-[#EAEAEA] px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                </div>
                <input
                  type="text"
                  value={settings.gstin || ''}
                  disabled
                  readOnly
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F0F2F0] border border-[#C1C8C2]/50 text-[#555E58] font-mono text-xs sm:text-sm font-medium cursor-not-allowed select-none uppercase"
                />
                <p className="text-[11px] text-[#717973]">
                  Statutory GSTIN registered and verified with the Ministry of Corporate Affairs.
                </p>
              </div>

              {/* Store Operating Hours - EDITABLE */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#2C694E]" />
                    <span>Store Operating Hours</span>
                  </label>
                  <span className="text-[11px] font-medium text-[#2C694E] bg-[#E8F5E9] px-2 py-0.5 rounded-md">Editable</span>
                </div>
=======
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Official Contact Email
                </label>
                <input
                  type="email"
                  value={settings.businessEmail || ''}
                  onChange={(e) => handleChange('businessEmail', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Dispatch Hotline / Phone
                </label>
                <input
                  type="text"
                  value={settings.businessPhone || ''}
                  onChange={(e) => handleChange('businessPhone', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  GSTIN (Tax Identification)
                </label>
                <input
                  type="text"
                  value={settings.gstin || ''}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] font-mono text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all uppercase"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Store Operating Hours
                </label>
>>>>>>> origin/boomika
                <input
                  type="text"
                  value={settings.operatingHours || ''}
                  onChange={(e) => handleChange('operatingHours', e.target.value)}
                  placeholder="e.g. Mon - Sat: 08:30 AM - 07:30 PM"
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>
            </div>
<<<<<<< HEAD

            {/* Section 1 Update Button */}
            <div className="flex justify-end pt-2 border-t border-[#C1C8C2]/20">
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="h-10 px-5 rounded-xl bg-[#1B4332] text-white text-xs sm:text-sm font-bold hover:bg-[#012D1D] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span>{isSavingProfile ? 'Saving...' : 'Update Business Profile'}</span>
              </button>
            </div>
          </section>

          {/* Section 2: Warehouse Location & Dispatch Hub - EDITABLE */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2C694E]" />
=======
          </section>

          {/* Section 2: Warehouse Location & Store Status */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2C694E]"></span>
>>>>>>> origin/boomika
                <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                  Warehouse Location & Dispatch Hub
                </h2>
              </div>
              {/* Store Status Toggle */}
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-[#414844]">Accepting Orders:</span>
                <button
                  type="button"
                  onClick={() => handleChange('storeOpen', !settings.storeOpen)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    settings.storeOpen ? 'bg-[#012D1D]' : 'bg-neutral-300'
                  }`}
<<<<<<< HEAD
                  title="Toggle accepting orders"
=======
>>>>>>> origin/boomika
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      settings.storeOpen ? 'left-6.5' : 'left-0.5'
                    }`}
                  ></span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-3 flex flex-col gap-1.5">
<<<<<<< HEAD
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Dispatch Depot Full Address
                  </label>
                  <span className="text-[11px] font-medium text-[#2C694E] bg-[#E8F5E9] px-2 py-0.5 rounded-md">Editable</span>
                </div>
=======
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Dispatch Depot Full Address
                </label>
>>>>>>> origin/boomika
                <input
                  type="text"
                  value={settings.warehouseAddress || ''}
                  onChange={(e) => handleChange('warehouseAddress', e.target.value)}
<<<<<<< HEAD
                  placeholder="Plot number, industrial estate, landmark road"
=======
>>>>>>> origin/boomika
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  City / Hub
                </label>
                <input
                  type="text"
                  value={settings.city || ''}
                  onChange={(e) => handleChange('city', e.target.value)}
<<<<<<< HEAD
                  placeholder="e.g. Pune"
=======
>>>>>>> origin/boomika
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  State
                </label>
                <input
                  type="text"
                  value={settings.state || ''}
                  onChange={(e) => handleChange('state', e.target.value)}
<<<<<<< HEAD
                  placeholder="e.g. Maharashtra"
=======
>>>>>>> origin/boomika
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Postal Pincode
                </label>
                <input
                  type="text"
<<<<<<< HEAD
                  maxLength={6}
                  value={settings.pincode || ''}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="6-digit pincode"
=======
                  value={settings.pincode || ''}
                  onChange={(e) => handleChange('pincode', e.target.value)}
>>>>>>> origin/boomika
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] font-mono text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>
            </div>
<<<<<<< HEAD

            {/* Section 2 Update Button */}
            <div className="flex justify-end pt-2 border-t border-[#C1C8C2]/20">
              <button
                type="button"
                onClick={handleSaveWarehouse}
                disabled={isSavingWarehouse}
                className="h-10 px-5 rounded-xl bg-[#1B4332] text-white text-xs sm:text-sm font-bold hover:bg-[#012D1D] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <span>{isSavingWarehouse ? 'Saving...' : 'Update Warehouse Location'}</span>
              </button>
            </div>
          </section>

          {/* Section 3: Payouts & Bank Settlement (READ-ONLY DISPLAY - No Form Inputs) */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#2C694E]" />
=======
          </section>

          {/* Section 3: Bank Account & Payout Details */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2C694E]"></span>
>>>>>>> origin/boomika
                <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                  Payouts & Bank Settlement
                </h2>
              </div>
<<<<<<< HEAD
              {settings.bankVerificationStatus === 'VERIFIED' ? (
                <span className="text-xs font-bold text-[#0E5138] bg-[#AEEECB] px-3 py-1 rounded-full flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Settlement Account
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1.5 border border-amber-300">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  Pending Admin KYC Clearance
                </span>
              )}
            </div>

            {/* Read-only Settlement Account Details Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[#F8FAF8] border border-[#CBD5E1]">
              <div className="space-y-0.5">
                <span className="text-[#64748B] text-xs font-semibold block">Settlement Bank Name</span>
                <span className="font-bold text-[#0F172A] text-sm">{settings.bankName || 'State Bank of India'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#64748B] text-xs font-semibold block">Account Holder Name</span>
                <span className="font-semibold text-[#0F172A] text-sm">{settings.accountName || settings.storeName || 'Authorized Dealer'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#64748B] text-xs font-semibold block">Account Number</span>
                <span className="font-mono font-bold text-[#0F172A] text-sm">
                  {settings.accountNumber 
                    ? `•••• •••• ${settings.accountNumber.slice(-4)}`
                    : '•••• •••• 1234'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#64748B] text-xs font-semibold block">IFSC Code</span>
                <span className="font-mono font-bold text-[#0F172A] text-sm">{settings.ifsc || 'SBIN0001234'}</span>
              </div>

              {settings.upiId && (
                <div className="sm:col-span-2 space-y-0.5">
                  <span className="text-[#64748B] text-xs font-semibold block">Corporate UPI ID</span>
                  <span className="font-medium text-[#0F172A] text-sm">{settings.upiId}</span>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="p-3.5 rounded-xl bg-[#EDF6ED]/80 border border-[#AEEECB]/70 flex items-start gap-3 text-xs sm:text-sm text-[#0E5138]">
              <ShieldCheck className="w-4 h-4 text-[#2C694E] shrink-0 mt-0.5" />
              <div className="leading-relaxed text-xs text-[#285740]">
                Bank settlement accounts are configured during dealer onboarding and locked against unauthorized payout redirection. 
                Payments are automatically deposited on a rolling T+2 schedule following proof-of-delivery (POD) cargo scanning. 
                To request bank account changes, contact GROVE Support.
=======
              <span className="text-xs font-bold text-[#0E5138] bg-[#AEEECB] px-2.5 py-0.5 rounded-full">
                T+2 Direct Transfer
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Settlement Bank
                </label>
                <input
                  type="text"
                  value={settings.bankName || ''}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Account Number
                </label>
                <input
                  type="text"
                  value={settings.accountNumber || ''}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] font-mono text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={settings.ifsc || ''}
                  onChange={(e) => handleChange('ifsc', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] font-mono text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all uppercase"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                  Corporate UPI ID
                </label>
                <input
                  type="text"
                  value={settings.upiId || ''}
                  onChange={(e) => handleChange('upiId', e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#EDF6ED]/70 border border-[#C1C8C2]/30 flex items-start gap-3 text-xs sm:text-sm text-[#414844] mt-2">
              <ShieldCheck className="w-5 h-5 text-[#2C694E] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-[#151D18] block">Automated B2B Escrow Clearance</span>
                <span className="leading-relaxed">
                  Payments for fulfilled orders are automatically settled to your verified account on a rolling T+2 schedule following proof-of-delivery (POD) cargo scanning.
                </span>
>>>>>>> origin/boomika
              </div>
            </div>
          </section>

<<<<<<< HEAD
          {/* Section 4: Password & Security Management */}
          <section className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xs border border-[#C1C8C2]/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#C1C8C2]/30">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-[#2C694E]" />
                <h2 className="text-base sm:text-lg font-bold text-[#151D18]">
                  Password & Security Management
                </h2>
              </div>
              <span className="text-xs font-semibold text-[#717973] uppercase tracking-wider">Account Credentials</span>
            </div>

            <p className="text-xs sm:text-sm text-[#414844]">
              Change your portal login password. Passwords must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.
            </p>

            {passwordError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Current Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new secure password"
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
                      required
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-[#151D18]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/40 text-[#151D18] text-xs sm:text-sm font-medium focus:outline-none focus:bg-white focus:border-[#2C694E] transition-all"
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
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#F3FCF3] border border-[#C1C8C2]/30">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#414844]">Security Strength:</span>
                    <span className={strengthScore >= 80 ? 'text-emerald-700' : strengthScore >= 60 ? 'text-amber-700' : 'text-red-600'}>
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

              {/* Password Criteria Checklist */}
              <div className="p-4 rounded-xl bg-[#F7FBF7] border border-[#C1C8C2]/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                <div className={`flex items-center gap-1.5 ${passwordRules.hasLength ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                  {passwordRules.hasLength ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasUpper ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                  {passwordRules.hasUpper ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                  <span>One uppercase letter (A-Z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasLower ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                  {passwordRules.hasLower ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                  <span>One lowercase letter (a-z)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasDigit ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                  {passwordRules.hasDigit ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                  <span>One numeric digit (0-9)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.hasSpecial ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                  {passwordRules.hasSpecial ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                  <span>One special character (!@#$...)</span>
                </div>
                <div className={`flex items-center gap-1.5 ${passwordRules.isMatching ? 'text-emerald-700 font-semibold' : 'text-neutral-500'}`}>
                  {passwordRules.isMatching ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />}
                  <span>Passwords match</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingPassword || !allPasswordRulesPassed}
                  className="h-10 px-6 rounded-xl bg-[#012D1D] text-white text-xs sm:text-sm font-bold hover:bg-[#1B4332] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <KeyRound className={`w-4 h-4 ${isUpdatingPassword ? 'animate-spin' : ''}`} />
                  <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </DealerLayout>
  );
}
=======
          {/* Form Submit Footer */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              type="submit"
              disabled={isSaving}
              className="h-11 px-8 rounded-xl bg-[#1B4332] text-white text-xs sm:text-sm font-bold hover:bg-[#012D1D] active:scale-95 transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </DealerLayout>
  );
}
>>>>>>> origin/boomika
