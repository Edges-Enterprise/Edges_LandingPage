// src/components/reseller/application/ApplicationWizard.tsx
"use client";

import { useState, useEffect } from "react";
import { useCountry } from "@/providers/CountryProvider";
import StepIndicator from "./StepIndicator";
import StepContainer from "./StepContainer";
import AccountInfoStep from "./AccountInfoStep";
import StoreConfigStep from "./StoreConfigStep";
import ReviewStep from "./ReviewStep";
import { submitApplication } from "@/actions/reseller/application";

interface ApplicationWizardProps {
  countryCode: string;
  config: any;
  applicationId: string | null;
  onComplete: (data: any) => void;
  onDraftSaved: (id: string) => void;
  translations: any;
}

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

  // useEffect(() => {
  //   if (applicationId) {
  //     const loadDraft = async () => {
  //       try {
  //         const { getApplicationDraft } =
  //           await import("@/actions/reseller/application");
  //         const draft = await getApplicationDraft(applicationId);
  //         if (draft) {
  //           setFormData(draft);
  //         }
  //       } catch (error) {
  //         console.error("Failed to load draft:", error);
  //       }
  //     };
  //     loadDraft();
  //   }
  // }, [applicationId]);

  // const updateFormData = (stepData: any) => {
  //   const newData = { ...formData, ...stepData };
  //   setFormData(newData);

  //   if (currentStep > 0) {
  //     const saveDraft = async () => {
  //       try {
  //         const { saveDraft } = await import("@/actions/reseller/application");

  //         // ✅ Strip File objects — drafts are metadata only, not binary payloads
  //         const { logoFile, notificationIconFile, ...draftSafeData } = newData;

  //         const result = await saveDraft({
  //           applicationId,
  //           data: draftSafeData,
  //           countryCode,
  //           step: currentStep,
  //         });
  //         if (result.success && result.applicationId) {
  //           onDraftSaved(result.applicationId);
  //         }
  //       } catch (error) {
  //         console.error("Failed to save draft:", error);
  //       }
  //     };
  //     saveDraft();
  //   }
  // };

  // AFTER

  const updateFormData = (stepData: any) => {
    setFormData((prev: any) => ({ ...prev, ...stepData }));
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
      const formDataObj = new FormData();

      // Add all fields
      formDataObj.append("firstName", formData.firstName || "");
      formDataObj.append("lastName", formData.lastName || "");
      formDataObj.append("email", formData.email || "");
      formDataObj.append("phone", formData.phone || "");
      formDataObj.append("password", formData.password || "");
      formDataObj.append("storeName", formData.storeName || "");
      formDataObj.append("storeSlug", formData.storeSlug || "");
      formDataObj.append("brandColor", formData.brandColor || "#C98A54");
      formDataObj.append("androidApp", String(formData.androidApp || false));
      formDataObj.append("countryCode", countryCode);
      formDataObj.append("agreed", "true");

      // ✅ Append the File object directly - NO CONVERSION NEEDED
      if (formData.logoFile && formData.logoFile instanceof File) {
        formDataObj.append("logo", formData.logoFile);
        console.log(
          `✅ Logo file attached: ${formData.logoFile.name}, ${formData.logoFile.size} bytes`,
        );
      }

      // ✅ Append notification icon if Android App is enabled
      if (
        formData.androidApp &&
        formData.notificationIconFile instanceof File
      ) {
        formDataObj.append("notificationIcon", formData.notificationIconFile);
        console.log(
          `✅ Notification icon attached: ${formData.notificationIconFile.name}, ${formData.notificationIconFile.size} bytes`,
        );
      }

      // 🔍 DEBUG — total wire size of everything about to hit the Server Action.
      // FormData doesn't give you a byte count directly, so we sum each part:
      // strings are counted as UTF-8 bytes, Files/Blobs use their own .size.
      let totalBytes = 0;
      const partSizes: Record<string, number> = {};
      for (const [key, value] of formDataObj.entries()) {
        const bytes =
          value instanceof Blob ? value.size : new Blob([value as string]).size;
        totalBytes += bytes;
        partSizes[key] = bytes;
      }
      console.log(
        "[ApplicationWizard] FormData part sizes (bytes):",
        partSizes,
      );
      console.log(
        "[ApplicationWizard] FormData TOTAL:",
        (totalBytes / 1024).toFixed(1),
        "KB",
        totalBytes > 1024 * 1024
          ? "⚠️ EXCEEDS 1MB Server Action default limit"
          : "",
      );

      const result = await submitApplication(formDataObj);

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

// // src/components/reseller/application/ApplicationWizard.tsx
// "use client";

// import { useState, useEffect } from "react";
// import { useCountry } from "@/providers/CountryProvider";
// import StepIndicator from "./StepIndicator";
// import StepContainer from "./StepContainer";
// import AccountInfoStep from "./AccountInfoStep";
// import StoreConfigStep from "./StoreConfigStep";
// import ReviewStep from "./ReviewStep";
// import { submitApplication } from "@/actions/reseller/application";

// interface ApplicationWizardProps {
//   countryCode: string;
//   config: any;
//   applicationId: string | null;
//   onComplete: (data: any) => void;
//   onDraftSaved: (id: string) => void;
//   translations: any;
// }

// const getSteps = (t: any) => [
//   { id: "account", label: t?.steps?.account || "Account Information" },
//   { id: "store", label: t?.steps?.store || "Store Configuration" },
//   { id: "review", label: t?.steps?.review || "Review & Submit" },
// ];

// export default function ApplicationWizard({
//   countryCode,
//   config,
//   applicationId,
//   onComplete,
//   onDraftSaved,
//   translations,
// }: ApplicationWizardProps) {
//   const [currentStep, setCurrentStep] = useState(0);
//   const [formData, setFormData] = useState<any>({});
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const country = useCountry();
//   const t = translations;
//   const STEPS = getSteps(t);

//   // useEffect(() => {
//   //   if (applicationId) {
//   //     const loadDraft = async () => {
//   //       try {
//   //         const { getApplicationDraft } =
//   //           await import("@/actions/reseller/application");
//   //         const draft = await getApplicationDraft(applicationId);
//   //         if (draft) {
//   //           setFormData(draft);
//   //         }
//   //       } catch (error) {
//   //         console.error("Failed to load draft:", error);
//   //       }
//   //     };
//   //     loadDraft();
//   //   }
//   // }, [applicationId]);

//   // const updateFormData = (stepData: any) => {
//   //   const newData = { ...formData, ...stepData };
//   //   setFormData(newData);

//   //   if (currentStep > 0) {
//   //     const saveDraft = async () => {
//   //       try {
//   //         const { saveDraft } = await import("@/actions/reseller/application");

//   //         // ✅ Strip File objects — drafts are metadata only, not binary payloads
//   //         const { logoFile, notificationIconFile, ...draftSafeData } = newData;

//   //         const result = await saveDraft({
//   //           applicationId,
//   //           data: draftSafeData,
//   //           countryCode,
//   //           step: currentStep,
//   //         });
//   //         if (result.success && result.applicationId) {
//   //           onDraftSaved(result.applicationId);
//   //         }
//   //       } catch (error) {
//   //         console.error("Failed to save draft:", error);
//   //       }
//   //     };
//   //     saveDraft();
//   //   }
//   // };

//   // AFTER

//   const updateFormData = (stepData: any) => {
//     setFormData((prev: any) => ({ ...prev, ...stepData }));
//   };

//   const goToNext = () => {
//     if (currentStep < STEPS.length - 1) {
//       setCurrentStep(currentStep + 1);
//       window.scrollTo({ top: 0, behavior: "smooth" });
//     }
//   };

//   const goToPrevious = () => {
//     if (currentStep > 0) {
//       setCurrentStep(currentStep - 1);
//       window.scrollTo({ top: 0, behavior: "smooth" });
//     }
//   };

//   const handleSubmit = async () => {
//     setIsSubmitting(true);
//     setError(null);

//     try {
//       const formDataObj = new FormData();

//       // Add all fields
//       formDataObj.append("firstName", formData.firstName || "");
//       formDataObj.append("lastName", formData.lastName || "");
//       formDataObj.append("email", formData.email || "");
//       formDataObj.append("phone", formData.phone || "");
//       formDataObj.append("password", formData.password || "");
//       formDataObj.append("storeName", formData.storeName || "");
//       formDataObj.append("storeSlug", formData.storeSlug || "");
//       formDataObj.append("brandColor", formData.brandColor || "#C98A54");
//       formDataObj.append("androidApp", String(formData.androidApp || false));
//       formDataObj.append("countryCode", countryCode);
//       formDataObj.append("agreed", "true");

//       // ✅ Append the File object directly - NO CONVERSION NEEDED
//       if (formData.logoFile && formData.logoFile instanceof File) {
//         formDataObj.append("logo", formData.logoFile);
//         console.log(
//           `✅ Logo file attached: ${formData.logoFile.name}, ${formData.logoFile.size} bytes`,
//         );
//       }

//       // ✅ Append notification icon if Android App is enabled
//       if (
//         formData.androidApp &&
//         formData.notificationIconFile instanceof File
//       ) {
//         formDataObj.append("notificationIcon", formData.notificationIconFile);
//         console.log(
//           `✅ Notification icon attached: ${formData.notificationIconFile.name}, ${formData.notificationIconFile.size} bytes`,
//         );
//       }

//       const result = await submitApplication(formDataObj);

//       if (result.success) {
//         onComplete(result);
//       } else {
//         setError(result.error || "Failed to submit application");
//       }
//     } catch (err) {
//       setError("An unexpected error occurred");
//       console.error(err);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const renderStep = () => {
//     switch (currentStep) {
//       case 0:
//         return (
//           <AccountInfoStep
//             data={formData}
//             onChange={updateFormData}
//             onNext={goToNext}
//             country={country}
//             translations={t}
//           />
//         );
//       case 1:
//         return (
//           <StoreConfigStep
//             data={formData}
//             onChange={updateFormData}
//             onNext={goToNext}
//             onPrevious={goToPrevious}
//             config={config}
//             countryCode={countryCode}
//             translations={t}
//           />
//         );
//       case 2:
//         return (
//           <ReviewStep
//             data={formData}
//             onSubmit={handleSubmit}
//             onPrevious={goToPrevious}
//             isSubmitting={isSubmitting}
//             error={error}
//             config={config}
//             translations={t}
//           />
//         );
//       default:
//         return null;
//     }
//   };

//   return (
//     <div>
//       <StepIndicator
//         steps={STEPS}
//         currentStep={currentStep}
//         completed={formData.completedSteps || []}
//       />
//       <StepContainer>{renderStep()}</StepContainer>
//     </div>
//   );
// }
