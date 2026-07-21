// src/actions/reseller/application/submitApplication.ts
"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { triggerAppBuild } from "@/actions/reseller/build/triggerAppBuild";

function generateDashboardToken(): string {
  const timestamp = Date.now();
  const random = require("crypto").randomBytes(32).toString("hex");
  return `${timestamp}_${random}`;
}

function generateAuthEmail(
  originalEmail: string,
  countryCode: string,
  storeSlug: string,
): string {
  const [username, domain] = originalEmail.split("@");
  const randomStr = Math.random().toString(36).substring(2, 7);
  const cleanStoreSlug = storeSlug.replace(/[^a-zA-Z0-9-]/g, "");
  const authEmail = `${username}+reseller-${countryCode}-${cleanStoreSlug}-${randomStr}@${domain}`;
  return authEmail;
}

export async function submitApplication(formData: FormData) {
  try {
    const supabase = await createServerClient();
    const admin = createAdminClient();

    // Extract all fields from FormData
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;
    const storeName = formData.get("storeName") as string;
    const storeSlug = formData.get("storeSlug") as string;
    const brandColor = (formData.get("brandColor") as string) || "#C98A54";
    const androidApp = formData.get("androidApp") === "true";
    const countryCode = formData.get("countryCode") as string;
    const agreed = formData.get("agreed") === "true";

    const logoFile = formData.get("logo") as File | null;
    const notificationIconFile = formData.get(
      "notificationIcon",
    ) as File | null; // ✅ Get notification icon

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !storeName ||
      !storeSlug ||
      !countryCode
    ) {
      return {
        success: false,
        error: "All required fields must be filled",
      };
    }

    const authEmail = generateAuthEmail(email, countryCode, storeSlug);

    // Check if original email already exists
    const { data: existing, error: checkError } = await supabase
      .from("global_reseller_applications")
      .select("id, original_email")
      .eq("original_email", email)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    if (existing) {
      return {
        success: false,
        error:
          "An application with this email already exists. Please use a different email or login to your existing account.",
      };
    }

    // Check if store slug is available
    const { data: existingStore, error: storeCheckError } = await supabase
      .from("global_reseller_applications")
      .select("id")
      .eq("store_slug", storeSlug)
      .maybeSingle();

    if (storeCheckError && storeCheckError.code !== "PGRST116") {
      throw storeCheckError;
    }

    if (existingStore) {
      return {
        success: false,
        error: "This store name is already taken. Please choose another.",
      };
    }

    // Create Auth User
    let authUserId: string | null = null;

    try {
      const { data: authData, error: authError } =
        await admin.auth.admin.createUser({
          email: authEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            original_email: email,
            first_name: firstName,
            last_name: lastName,
            store_name: storeName,
            store_slug: storeSlug,
            role: "reseller",
            country_code: countryCode,
          },
        });

      if (authError) {
        console.error("Auth user creation failed:", authError);
        return {
          success: false,
          error:
            authError.message || "Failed to create account. Please try again.",
        };
      }

      if (authData?.user) {
        authUserId = authData.user.id;
      }
    } catch (authError) {
      console.error("Auth error:", authError);
      return {
        success: false,
        error: "Failed to create account. Please try again.",
      };
    }

    const dashboardToken = generateDashboardToken();

    // Insert application
    const { data: application, error: insertError } = await supabase
      .from("global_reseller_applications")
      .insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        original_email: email,
        auth_email: authEmail,
        phone: phone,
        country_code: countryCode,
        store_name: storeName,
        store_slug: storeSlug,
        logo_url: null,
        brand_color: brandColor,
        android_app: androidApp,
        application_status: "pending",
        agreed: agreed,
        auth_user_id: authUserId,
        temp_password: password,
        dashboard_token: dashboardToken,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      if (authUserId) {
        try {
          await admin.auth.admin.deleteUser(authUserId);
        } catch (e) {
          console.error("Failed to rollback auth user:", e);
        }
      }
      console.error("Insert error:", insertError);
      return {
        success: false,
        error: "Failed to submit application. Please try again.",
      };
    }

    // ============================================================
    // ✅ UPLOAD LOGO (if provided)
    // ============================================================
    let logoUrl: string | null = null;

    if (logoFile) {
      try {
        const arrayBuffer = await logoFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `reseller-${application.id}-icon-${Date.now()}.png`;
        const filePath = `${application.id}/${fileName}`;

        const { error: uploadError } = await admin.storage
          .from("reseller-assets")
          .upload(filePath, buffer, {
            contentType: logoFile.type || "image/png",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = admin.storage
            .from("reseller-assets")
            .getPublicUrl(filePath);

          logoUrl = urlData.publicUrl;

          await supabase
            .from("global_reseller_applications")
            .update({ logo_url: logoUrl })
            .eq("id", application.id);

          console.log(`✅ Logo uploaded for application: ${application.id}`);
        } else {
          console.error("Logo upload failed:", uploadError);
        }
      } catch (err) {
        console.error("Logo upload error:", err);
      }
    }

    // ============================================================
    // ✅ UPLOAD NOTIFICATION ICON (if provided)
    // ============================================================

    // 🔧 FIX: this was uploaded and written to the DB, but its URL was
    // never captured into a variable — so triggerAppBuild() below never
    // received it, and TypeScript correctly flagged the missing required
    // property. Declare it here so it can actually be passed through.
    let notificationIconUrl: string | null = null;

    if (notificationIconFile) {
      try {
        const arrayBuffer = await notificationIconFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const fileName = `reseller-${application.id}-notification-icon-${Date.now()}.png`;
        const filePath = `${application.id}/${fileName}`;

        const { error: uploadError } = await admin.storage
          .from("reseller-assets")
          .upload(filePath, buffer, {
            contentType: notificationIconFile.type || "image/png",
            upsert: true,
          });

        if (!uploadError) {
          const { data: urlData } = admin.storage
            .from("reseller-assets")
            .getPublicUrl(filePath);

          notificationIconUrl = urlData.publicUrl;

          // ✅ Store in the applications table (same as logo_url)
          await supabase
            .from("global_reseller_applications")
            .update({ notification_icon_url: notificationIconUrl })
            .eq("id", application.id);

          console.log(
            `✅ Notification icon uploaded for application: ${application.id}`,
          );
        } else {
          console.error("Notification icon upload failed:", uploadError);
        }
      } catch (err) {
        console.error("Notification icon upload error:", err);
      }
    }

    // ============================================================
    // ✅ QUEUE AND TRIGGER APP BUILD (if Android App enabled)
    // ============================================================
    if (androidApp) {
      try {
        // ✅ Step 1: Queue the build
        const { data: build, error: buildError } = await supabase
          .from("global_app_builds")
          .insert({
            application_id: application.id,
            build_status: "queued",
            queued_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (buildError) {
          console.error("Failed to queue build:", buildError);
        } else {
          console.log(`✅ Build queued for application: ${application.id}`);

          // ✅ Step 2: Trigger the actual build (GitHub Actions)
          try {
            const triggerResult = await triggerAppBuild({
              applicationId: application.id,
              buildId: build.id,
              storeName: storeName,
              storeSlug: storeSlug,
              brandColor: brandColor,
              logoUrl: logoUrl,
              notificationIconUrl: notificationIconUrl, // 🔧 FIX: now supplied
              countryCode: countryCode,
            });

            if (triggerResult.success) {
              console.log(
                `✅ Build triggered for application: ${application.id}`,
              );

              // Update build status to "building"
              await supabase
                .from("global_app_builds")
                .update({
                  build_status: "building",
                  building_at: new Date().toISOString(),
                })
                .eq("id", build.id);
            } else if (triggerResult.queued) {
              // Build queued but not triggered (no GitHub token)
              console.log(
                `⚠️ Build queued but not triggered: ${triggerResult.error}`,
              );
            } else {
              console.error("Failed to trigger build:", triggerResult.error);

              // Update build status to "failed"
              await supabase
                .from("global_app_builds")
                .update({
                  build_status: "failed",
                  error_message: triggerResult.error || "Build trigger failed",
                })
                .eq("id", build.id);
            }
          } catch (triggerError) {
            console.error("Build trigger error:", triggerError);

            await supabase
              .from("global_app_builds")
              .update({
                build_status: "failed",
                error_message:
                  triggerError instanceof Error
                    ? triggerError.message
                    : "Unknown error",
              })
              .eq("id", build.id);
          }
        }
      } catch (err) {
        console.error("Build queue/trigger error:", err);
        // Continue - build is optional
      }
    }

    // Trigger Edge Function for email
    try {
      const { error: edgeError } = await supabase.functions.invoke(
        "send-global-reseller-welcome",
        {
          body: {
            applicationId: application.id,
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            storeName: storeName,
            storeSlug: storeSlug,
            countryCode: countryCode,
            androidApp: androidApp,
            logoUrl: logoUrl,
          },
        },
      );

      if (edgeError) {
        console.error("Edge Function error:", edgeError);
      }
    } catch (emailError) {
      console.error("Failed to trigger email:", emailError);
    }

    // Log email
    await supabase.from("global_email_logs").insert({
      application_id: application.id,
      email_type: "welcome",
      subject: "Welcome to Edges Network!",
      sent_at: new Date().toISOString(),
    });

    return {
      success: true,
      applicationId: application.id,
      status: "pending",
      email: email,
      storeSlug: storeSlug,
      androidApp: androidApp,
      logoUrl: logoUrl,
      message: "Application submitted successfully!",
    };
  } catch (error) {
    console.error("Error submitting application:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to submit application",
    };
  }
}

// // src/actions/reseller/application/submitApplication.ts
// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { createAdminClient } from "@/lib/supabase/admin";
// import { triggerAppBuild } from "@/actions/reseller/build/triggerAppBuild";

// function generateDashboardToken(): string {
//   const timestamp = Date.now();
//   const random = require("crypto").randomBytes(32).toString("hex");
//   return `${timestamp}_${random}`;
// }

// function generateAuthEmail(
//   originalEmail: string,
//   countryCode: string,
//   storeSlug: string,
// ): string {
//   const [username, domain] = originalEmail.split("@");
//   const randomStr = Math.random().toString(36).substring(2, 7);
//   const cleanStoreSlug = storeSlug.replace(/[^a-zA-Z0-9-]/g, "");
//   const authEmail = `${username}+reseller-${countryCode}-${cleanStoreSlug}-${randomStr}@${domain}`;
//   return authEmail;
// }

// export async function submitApplication(formData: FormData) {
//   try {
//     const supabase = await createServerClient();
//     const admin = createAdminClient();

//     // Extract all fields from FormData
//     const firstName = formData.get("firstName") as string;
//     const lastName = formData.get("lastName") as string;
//     const email = formData.get("email") as string;
//     const phone = formData.get("phone") as string;
//     const password = formData.get("password") as string;
//     const storeName = formData.get("storeName") as string;
//     const storeSlug = formData.get("storeSlug") as string;
//     const brandColor = (formData.get("brandColor") as string) || "#C98A54";
//     const androidApp = formData.get("androidApp") === "true";
//     const countryCode = formData.get("countryCode") as string;
//     const agreed = formData.get("agreed") === "true";

//     const logoFile = formData.get("logo") as File | null;
//     const notificationIconFile = formData.get(
//       "notificationIcon",
//     ) as File | null; // ✅ Get notification icon

//     // Validate required fields
//     if (
//       !firstName ||
//       !lastName ||
//       !email ||
//       !phone ||
//       !password ||
//       !storeName ||
//       !storeSlug ||
//       !countryCode
//     ) {
//       return {
//         success: false,
//         error: "All required fields must be filled",
//       };
//     }

//     const authEmail = generateAuthEmail(email, countryCode, storeSlug);

//     // Check if original email already exists
//     const { data: existing, error: checkError } = await supabase
//       .from("global_reseller_applications")
//       .select("id, original_email")
//       .eq("original_email", email)
//       .maybeSingle();

//     if (checkError && checkError.code !== "PGRST116") {
//       throw checkError;
//     }

//     if (existing) {
//       return {
//         success: false,
//         error:
//           "An application with this email already exists. Please use a different email or login to your existing account.",
//       };
//     }

//     // Check if store slug is available
//     const { data: existingStore, error: storeCheckError } = await supabase
//       .from("global_reseller_applications")
//       .select("id")
//       .eq("store_slug", storeSlug)
//       .maybeSingle();

//     if (storeCheckError && storeCheckError.code !== "PGRST116") {
//       throw storeCheckError;
//     }

//     if (existingStore) {
//       return {
//         success: false,
//         error: "This store name is already taken. Please choose another.",
//       };
//     }

//     // Create Auth User
//     let authUserId: string | null = null;

//     try {
//       const { data: authData, error: authError } =
//         await admin.auth.admin.createUser({
//           email: authEmail,
//           password: password,
//           email_confirm: true,
//           user_metadata: {
//             original_email: email,
//             first_name: firstName,
//             last_name: lastName,
//             store_name: storeName,
//             store_slug: storeSlug,
//             role: "reseller",
//             country_code: countryCode,
//           },
//         });

//       if (authError) {
//         console.error("Auth user creation failed:", authError);
//         return {
//           success: false,
//           error:
//             authError.message || "Failed to create account. Please try again.",
//         };
//       }

//       if (authData?.user) {
//         authUserId = authData.user.id;
//       }
//     } catch (authError) {
//       console.error("Auth error:", authError);
//       return {
//         success: false,
//         error: "Failed to create account. Please try again.",
//       };
//     }

//     const dashboardToken = generateDashboardToken();

//     // Insert application
//     const { data: application, error: insertError } = await supabase
//       .from("global_reseller_applications")
//       .insert({
//         first_name: firstName,
//         last_name: lastName,
//         email: email,
//         original_email: email,
//         auth_email: authEmail,
//         phone: phone,
//         country_code: countryCode,
//         store_name: storeName,
//         store_slug: storeSlug,
//         logo_url: null,
//         brand_color: brandColor,
//         android_app: androidApp,
//         application_status: "pending",
//         agreed: agreed,
//         auth_user_id: authUserId,
//         temp_password: password,
//         dashboard_token: dashboardToken,
//         submitted_at: new Date().toISOString(),
//         created_at: new Date().toISOString(),
//         updated_at: new Date().toISOString(),
//       })
//       .select("id")
//       .single();

//     if (insertError) {
//       if (authUserId) {
//         try {
//           await admin.auth.admin.deleteUser(authUserId);
//         } catch (e) {
//           console.error("Failed to rollback auth user:", e);
//         }
//       }
//       console.error("Insert error:", insertError);
//       return {
//         success: false,
//         error: "Failed to submit application. Please try again.",
//       };
//     }

//     // ============================================================
//     // ✅ UPLOAD LOGO (if provided)
//     // ============================================================
//     let logoUrl: string | null = null;

//     if (logoFile) {
//       try {
//         const arrayBuffer = await logoFile.arrayBuffer();
//         const buffer = Buffer.from(arrayBuffer);

//         const fileName = `reseller-${application.id}-icon-${Date.now()}.png`;
//         const filePath = `${application.id}/${fileName}`;

//         const { error: uploadError } = await admin.storage
//           .from("reseller-assets")
//           .upload(filePath, buffer, {
//             contentType: logoFile.type || "image/png",
//             upsert: true,
//           });

//         if (!uploadError) {
//           const { data: urlData } = admin.storage
//             .from("reseller-assets")
//             .getPublicUrl(filePath);

//           logoUrl = urlData.publicUrl;

//           await supabase
//             .from("global_reseller_applications")
//             .update({ logo_url: logoUrl })
//             .eq("id", application.id);

//           console.log(`✅ Logo uploaded for application: ${application.id}`);
//         } else {
//           console.error("Logo upload failed:", uploadError);
//         }
//       } catch (err) {
//         console.error("Logo upload error:", err);
//       }
//     }

//     // ============================================================
//     // ✅ UPLOAD NOTIFICATION ICON (if provided)
//     // ============================================================

//     if (notificationIconFile) {
//       try {
//         const arrayBuffer = await notificationIconFile.arrayBuffer();
//         const buffer = Buffer.from(arrayBuffer);

//         const fileName = `reseller-${application.id}-notification-icon-${Date.now()}.png`;
//         const filePath = `${application.id}/${fileName}`;

//         const { error: uploadError } = await admin.storage
//           .from("reseller-assets")
//           .upload(filePath, buffer, {
//             contentType: notificationIconFile.type || "image/png",
//             upsert: true,
//           });

//         if (!uploadError) {
//           const { data: urlData } = admin.storage
//             .from("reseller-assets")
//             .getPublicUrl(filePath);

//           const notificationIconUrl = urlData.publicUrl;

//           // ✅ Store in the applications table (same as logo_url)
//           await supabase
//             .from("global_reseller_applications")
//             .update({ notification_icon_url: notificationIconUrl })
//             .eq("id", application.id);

//           console.log(
//             `✅ Notification icon uploaded for application: ${application.id}`,
//           );
//         } else {
//           console.error("Notification icon upload failed:", uploadError);
//         }
//       } catch (err) {
//         console.error("Notification icon upload error:", err);
//       }
//     }

//     // ============================================================
//     // ✅ QUEUE AND TRIGGER APP BUILD (if Android App enabled)
//     // ============================================================
//     if (androidApp) {
//       try {
//         // ✅ Step 1: Queue the build
//         const { data: build, error: buildError } = await supabase
//           .from("global_app_builds")
//           .insert({
//             application_id: application.id,
//             build_status: "queued",
//             queued_at: new Date().toISOString(),
//           })
//           .select("id")
//           .single();

//         if (buildError) {
//           console.error("Failed to queue build:", buildError);
//         } else {
//           console.log(`✅ Build queued for application: ${application.id}`);

//           // ✅ Step 2: Trigger the actual build (GitHub Actions)
//           try {
//             const triggerResult = await triggerAppBuild({
//               applicationId: application.id,
//               buildId: build.id,
//               storeName: storeName,
//               storeSlug: storeSlug,
//               brandColor: brandColor,
//               logoUrl: logoUrl,
//               countryCode: countryCode,
//             });

//             if (triggerResult.success) {
//               console.log(
//                 `✅ Build triggered for application: ${application.id}`,
//               );

//               // Update build status to "building"
//               await supabase
//                 .from("global_app_builds")
//                 .update({
//                   build_status: "building",
//                   building_at: new Date().toISOString(),
//                 })
//                 .eq("id", build.id);
//             } else if (triggerResult.queued) {
//               // Build queued but not triggered (no GitHub token)
//               console.log(
//                 `⚠️ Build queued but not triggered: ${triggerResult.error}`,
//               );
//             } else {
//               console.error("Failed to trigger build:", triggerResult.error);

//               // Update build status to "failed"
//               await supabase
//                 .from("global_app_builds")
//                 .update({
//                   build_status: "failed",
//                   error_message: triggerResult.error || "Build trigger failed",
//                 })
//                 .eq("id", build.id);
//             }
//           } catch (triggerError) {
//             console.error("Build trigger error:", triggerError);

//             await supabase
//               .from("global_app_builds")
//               .update({
//                 build_status: "failed",
//                 error_message:
//                   triggerError instanceof Error
//                     ? triggerError.message
//                     : "Unknown error",
//               })
//               .eq("id", build.id);
//           }
//         }
//       } catch (err) {
//         console.error("Build queue/trigger error:", err);
//         // Continue - build is optional
//       }
//     }

//     // Trigger Edge Function for email
//     try {
//       const { error: edgeError } = await supabase.functions.invoke(
//         "send-global-reseller-welcome",
//         {
//           body: {
//             applicationId: application.id,
//             firstName: firstName,
//             lastName: lastName,
//             email: email,
//             password: password,
//             storeName: storeName,
//             storeSlug: storeSlug,
//             countryCode: countryCode,
//             androidApp: androidApp,
//             logoUrl: logoUrl,
//           },
//         },
//       );

//       if (edgeError) {
//         console.error("Edge Function error:", edgeError);
//       }
//     } catch (emailError) {
//       console.error("Failed to trigger email:", emailError);
//     }

//     // Log email
//     await supabase.from("global_email_logs").insert({
//       application_id: application.id,
//       email_type: "welcome",
//       subject: "Welcome to Edges Network!",
//       sent_at: new Date().toISOString(),
//     });

//     return {
//       success: true,
//       applicationId: application.id,
//       status: "pending",
//       email: email,
//       storeSlug: storeSlug,
//       androidApp: androidApp,
//       logoUrl: logoUrl,
//       message: "Application submitted successfully!",
//     };
//   } catch (error) {
//     console.error("Error submitting application:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to submit application",
//     };
//   }
// }
