// src/app/[countryCode]/dashboard/settings/SecuritySettings.tsx
"use client";

import { useState } from "react";
import {
  Key,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  Smartphone,
} from "lucide-react";
import { changePassword } from "@/actions/reseller/settings/changePassword";
import { changeTransactionPin } from "@/actions/reseller/settings/changeTransactionPin";
import { cn } from "@/lib/utils/helpers";

interface SecuritySettingsProps {
  countryCode: string;
}

export function SecuritySettings({ countryCode }: SecuritySettingsProps) {
  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // PIN state
  const [pinData, setPinData] = useState({
    currentPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Show/hide
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showCurrentPin, setShowCurrentPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
    setPasswordError(null);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      setIsChangingPassword(false);
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      setIsChangingPassword(false);
      return;
    }

    try {
      const result = await changePassword(
        passwordData.currentPassword,
        passwordData.newPassword,
      );

      if (result.success) {
        setPasswordSuccess(true);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTimeout(() => setPasswordSuccess(false), 3000);
      } else {
        setPasswordError(result.error || "Failed to change password");
      }
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPinData({ ...pinData, [e.target.name]: value });
    setPinError(null);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPin(true);
    setPinError(null);
    setPinSuccess(false);

    if (pinData.newPin !== pinData.confirmPin) {
      setPinError("New PINs do not match");
      setIsChangingPin(false);
      return;
    }

    if (pinData.newPin.length !== 4) {
      setPinError("PIN must be exactly 4 digits");
      setIsChangingPin(false);
      return;
    }

    try {
      const result = await changeTransactionPin(
        pinData.currentPin,
        pinData.newPin,
      );

      if (result.success) {
        setPinSuccess(true);
        setPinData({
          currentPin: "",
          newPin: "",
          confirmPin: "",
        });
        setTimeout(() => setPinSuccess(false), 3000);
      } else {
        setPinError(result.error || "Failed to change PIN");
      }
    } catch (err) {
      setPinError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsChangingPin(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Change Password */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Change Password
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Update your password to keep your account secure
        </p>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type={showCurrentPassword ? "text" : "password"}
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <Key
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <Shield
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {passwordError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {passwordError}
              </p>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">
                Password changed successfully!
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPassword}
            className={cn(
              "px-6 py-2.5 bg-primary text-white rounded-lg font-medium transition-all",
              "hover:bg-primary/80",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2",
            )}
          >
            {isChangingPassword ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </button>
        </form>
      </div>

      {/* Change Transaction PIN */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Transaction PIN
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Update your transaction PIN for secure transactions
        </p>

        <form onSubmit={handlePinSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Current PIN
            </label>
            <div className="relative">
              <Smartphone
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type={showCurrentPin ? "text" : "password"}
                name="currentPin"
                value={pinData.currentPin}
                onChange={handlePinChange}
                maxLength={4}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPin(!showCurrentPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showCurrentPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New PIN (4 digits)
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type={showNewPin ? "text" : "password"}
                name="newPin"
                value={pinData.newPin}
                onChange={handlePinChange}
                maxLength={4}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPin(!showNewPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showNewPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Confirm New PIN
            </label>
            <div className="relative">
              <Shield
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type={showConfirmPin ? "text" : "password"}
                name="confirmPin"
                value={pinData.confirmPin}
                onChange={handlePinChange}
                maxLength={4}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:text-white font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showConfirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {pinError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {pinError}
              </p>
            </div>
          )}

          {pinSuccess && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">
                PIN changed successfully!
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={isChangingPin}
            className={cn(
              "px-6 py-2.5 bg-primary text-white rounded-lg font-medium transition-all",
              "hover:bg-primary/80",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center gap-2",
            )}
          >
            {isChangingPin ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Changing PIN...
              </>
            ) : (
              "Change PIN"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
