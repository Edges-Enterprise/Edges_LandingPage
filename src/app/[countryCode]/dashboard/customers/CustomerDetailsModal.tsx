// src/app/[countryCode]/dashboard/customers/CustomerDetailsModal.tsx
"use client";

import { useEffect, useState } from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  Calendar,
  Edit,
} from "lucide-react";
import {
  getCustomerDetails,
  CustomerDetails,
} from "@/actions/reseller/customers/getCustomerDetails";
import { updateCustomer } from "@/actions/reseller/customers/updateCustomer";
import { cn } from "@/lib/utils/helpers";

interface CustomerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  countryCode: string;
  onUpdate?: () => void;
}

export function CustomerDetailsModal({
  isOpen,
  onClose,
  customerId,
  countryCode,
  onUpdate,
}: CustomerDetailsModalProps) {
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CustomerDetails>>({});

  useEffect(() => {
    if (isOpen && customerId) {
      fetchCustomerDetails();
    }
  }, [isOpen, customerId]);

  const fetchCustomerDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getCustomerDetails(customerId);

      if (result.success && result.data) {
        setCustomer(result.data);
        setEditData(result.data);
      } else {
        setError(result.error || "Failed to load customer details");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await updateCustomer({
        customerId: customerId,
        first_name: editData.first_name,
        last_name: editData.last_name,
        email: editData.email,
        phone: editData.phone,
        address: editData.address,
        city: editData.city,
        state: editData.state,
        country: editData.country,
      });

      if (result.success) {
        setIsEditing(false);
        await fetchCustomerDetails();
        if (onUpdate) onUpdate();
      } else {
        setError(result.error || "Failed to update customer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Customer Details
          </h3>
          <div className="flex items-center gap-2">
            {!isEditing && customer && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Edit size={18} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-2 flex-1">
                <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 bg-gray-200 dark:bg-gray-700 rounded"
                />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchCustomerDetails}
              className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : customer ? (
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {getInitials(`${customer.first_name} ${customer.last_name}`)}
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editData.first_name || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            first_name: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                        placeholder="First name"
                      />
                      <input
                        type="text"
                        value={editData.last_name || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            last_name: e.target.value,
                          })
                        }
                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                        placeholder="Last name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={editData.email || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, email: e.target.value })
                        }
                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editData.phone || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, phone: e.target.value })
                        }
                        className="flex-1 px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                        placeholder="Phone"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {customer.first_name} {customer.last_name}
                    </h4>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        customer.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
                      )}
                    >
                      {customer.status}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Email
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {customer.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Phone size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Phone
                  </p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {customer.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Address (editable) */}
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={18} className="text-gray-400" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Address
                </p>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editData.address || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, address: e.target.value })
                    }
                    className="w-full px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                    placeholder="Street address"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editData.city || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, city: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      placeholder="City"
                    />
                    <input
                      type="text"
                      value={editData.state || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, state: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      placeholder="State"
                    />
                    <input
                      type="text"
                      value={editData.country || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, country: e.target.value })
                      }
                      className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
                      placeholder="Country"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {customer.address || "No address provided"}
                  {customer.city && `, ${customer.city}`}
                  {customer.state && `, ${customer.state}`}
                  {customer.country && `, ${customer.country}`}
                </p>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Orders
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {customer.total_orders}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Total Spent
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${customer.total_spent.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Order
                </p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  ${customer.average_order_value.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Joined
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(customer.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Edit/Save Buttons */}
            {isEditing && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditData(customer);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium transition-colors",
                    "hover:bg-primary/80",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                  )}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
