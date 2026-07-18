// src/components/reseller/application/ApplicationWizard.tsx
"use client";

import { useState, useEffect } from "react";
import { useCountry } from "@/providers/CountryProvider";
import StepIndicator from "./StepIndicator";
import StepContainer from "./StepContainer";
import AccountInfoStep from "./AccountInfoStep";
import StoreConfigStep from "./StoreConfigStep";
import ReviewStep from "./ReviewStep";

interface ApplicationWizardProps {
  countryCode: string;
  config: any;
  applicationId: string | null;
  onComplete: (data: any) => void;
  onDraftSaved: (id: string) => void;
  translations: any;
}

// ✅ Use translations for step labels
const getSteps = (t: any) => [
  { id: "account", label: t?.steps?.account || "Account Information" },
  { id: "store", label: t?.steps?.store || "Store Configuration" },
  { id: "review", label: t?.steps?.review || "Review & Submit" },
];

export default function ApplicationWizard({
  countryCode,
  config,
  applicationId,
  onComplete,
  onDraftSaved,
  translations,
}: ApplicationWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const country = useCountry();
  const t = translations;
  const STEPS = getSteps(t);

  // Load draft on mount
  useEffect(() => {
    if (applicationId) {
      const loadDraft = async () => {
        try {
          const { getApplicationDraft } =
            await import("@/actions/reseller/application");
          const draft = await getApplicationDraft(applicationId);
          if (draft) {
            setFormData(draft);
          }
        } catch (error) {
          console.error("Failed to load draft:", error);
        }
      };
      loadDraft();
    }
  }, [applicationId]);

  const updateFormData = (stepData: any) => {
    const newData = { ...formData, ...stepData };
    setFormData(newData);

    // Auto-save draft
    if (currentStep > 0) {
      const saveDraft = async () => {
        try {
          const { saveDraft } = await import("@/actions/reseller/application");
          const result = await saveDraft({
            applicationId,
            data: newData,
            countryCode,
            step: currentStep,
          });
          if (result.success && result.applicationId) {
            onDraftSaved(result.applicationId);
          }
        } catch (error) {
          console.error("Failed to save draft:", error);
        }
      };
      saveDraft();
    }
  };

  const goToNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { submitApplication } =
        await import("@/actions/reseller/application");
      const result = await submitApplication({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        storeName: formData.storeName,
        storeSlug: formData.storeSlug,
        logo: formData.logo || "",
        brandColor: formData.brandColor,
        androidApp: formData.androidApp || false,
        countryCode,
        agreed: true,
      });

      if (result.success) {
        onComplete(result);
      } else {
        setError(result.error || "Failed to submit application");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <AccountInfoStep
            data={formData}
            onChange={updateFormData}
            onNext={goToNext}
            country={country}
            translations={t}
          />
        );
      case 1:
        return (
          <StoreConfigStep
            data={formData}
            onChange={updateFormData}
            onNext={goToNext}
            onPrevious={goToPrevious}
            config={config}
            countryCode={countryCode}
            translations={t}
          />
        );
      case 2:
        return (
          <ReviewStep
            data={formData}
            onSubmit={handleSubmit}
            onPrevious={goToPrevious}
            isSubmitting={isSubmitting}
            error={error}
            config={config}
            translations={t}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <StepIndicator
        steps={STEPS}
        currentStep={currentStep}
        completed={formData.completedSteps || []}
      />
      <StepContainer>{renderStep()}</StepContainer>
    </div>
  );
}
