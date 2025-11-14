// // app/actions/profile.ts (New file for profile mutations)

// "use server";

// import { createServerClient } from "@/lib/supabase/server";
// import { revalidatePath } from "next/cache";

// export async function updateProfileNotificationsAction(enabled: boolean) {
//   try {
//     const supabase = await createServerClient();
//     const {
//       data: { user },
//       error: authError,
//     } = await supabase.auth.getUser();

//     if (authError || !user) {
//       return { error: "Unauthorized" };
//     }

//     const { error: updateError } = await supabase
//       .from("profiles")
//       .update({ notifications_enabled: enabled })
//       .eq("id", user.id);

//     if (updateError) {
//       console.error("Update notifications error:", updateError);
//       return { error: "Failed to update notifications" };
//     }

//     revalidatePath("/settings");
//     revalidatePath("/home"); // Update any notification-related UI

//     return { success: true };
//   } catch (error) {
//     console.error("Update profile error:", error);
//     return { error: "Something went wrong" };
//   }
// }


// app/actions/profile.ts (New file for profile mutations)

"use server";

import { createServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfileNotificationsAction(enabled: boolean) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: "Unauthorized" };
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ notifications_enabled: enabled })
      .eq("id", user.id);

    if (updateError) {
      console.error("Update notifications error:", updateError);
      return { error: "Failed to update notifications" };
    }

    revalidatePath("/settings");
    revalidatePath("/home"); // Update any notification-related UI

    return { success: true };
  } catch (error) {
    console.error("Update profile error:", error);
    return { error: "Something went wrong" };
  }
}