// src/components/reseller/application/AccountInfoStep.tsx
"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface AccountInfoStepProps {
  data: any;
  onChange: (data: any) => void;
  onNext: () => void;
  country: any;
}

export default function AccountInfoStep({
  data,
  onChange,
  onNext,
  country,
}: AccountInfoStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    fullName: data.fullName || "",
    email: data.email || "",
    phone: data.phone || "",
    password: data.password || "",
    confirmPassword: data.confirmPassword || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error for this field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onChange(formData);
      onNext();
    }
  };

  const inputStyle = (hasError: boolean) => ({
    width: "100%",
    padding: "0.75rem 1rem",
    background: "var(--bg2)",
    border: `1px solid ${hasError ? "#EF4444" : "var(--border)"}`,
    borderRadius: 8,
    color: "var(--text)",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
  });

  return (
    <div>
      <h2
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        Account Information
      </h2>
      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.9rem",
          marginBottom: "1.5rem",
        }}
      >
        Create your reseller account. Country is pre-filled based on your
        location.
      </p>

      {/* Country (hidden from user) */}
      <input type="hidden" name="country" value={country.code} />

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gap: "1.25rem" }}>
          {/* Full Name */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              style={inputStyle(!!errors.fullName)}
            />
            {errors.fullName && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.fullName}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              style={inputStyle(!!errors.email)}
            />
            {errors.email && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Phone Number
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 0.75rem",
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: "0.85rem",
                  color: "var(--muted)",
                }}
              >
                {country.phoneCode}
              </span>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                style={{
                  ...inputStyle(!!errors.phone),
                  flex: 1,
                }}
              />
            </div>
            {errors.phone && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Min 8 characters"
              style={inputStyle(!!errors.password)}
            />
            {errors.password && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.85rem",
                fontWeight: 500,
                marginBottom: "0.35rem",
                color: "var(--text)",
              }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              style={inputStyle(!!errors.confirmPassword)}
            />
            {errors.confirmPassword && (
              <p
                style={{
                  color: "#EF4444",
                  fontSize: "0.8rem",
                  marginTop: "0.25rem",
                }}
              >
                {errors.confirmPassword}
              </p>
            )}
          </div>
        </div>

        <button
          type="submit"
          style={{
            marginTop: "2rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0.8rem 2rem",
            background: "var(--accent)",
            color: "#FDF8F3",
            border: "none",
            borderRadius: 10,
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "opacity 0.2s, transform 0.2s",
            width: "100%",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          Continue <ChevronRight size={18} />
        </button>
      </form>
    </div>
  );
}
